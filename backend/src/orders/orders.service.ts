import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IOrdersRepository,
  ORDERS_REPOSITORY,
} from './interfaces/orders-repository.interface';
import { isValidTransition, OrderStatus } from './enums/order-status.enum';
import { MenuService } from '../menu/menu.service';
import { TimelineService } from '../timeline/timeline.service';
import { TimelineEventType } from '../timeline/enums/timeline-event-type.enum';
import { TimelineEventSource } from '../timeline/enums/timeline-event-source.enum';
import { calculateServiceFee } from '../common/constants';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { CreateOrderItemDto } from './dto/create-order-item.dto';
import type {
  OrderAcceptedResponse,
  OrderCreatedEvent,
  OrderDetailResponse,
  OrderPlain,
} from './interfaces/order.interfaces';
import type { ProductResponse } from '../menu/interfaces/menu.interfaces';

interface ResolvedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: { name: string; priceAdjustment: number }[];
  itemTotal: number;
}

/**
 * Orders service — server-side pricing, modifier validation,
 * status FSM transitions, and timeline event recording.
 *
 * Key design decisions:
 * - Client NEVER sends prices. The server looks up products and calculates everything.
 * - All money in integer cents to avoid floating-point errors.
 * - Service fee calculated from config (basis points) for easy tuning.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly serviceFeeBasisPoints: number;

  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
    private readonly menuService: MenuService,
    private readonly timelineService: TimelineService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.serviceFeeBasisPoints = this.configService.get<number>(
      'SERVICE_FEE_BASIS_POINTS',
      500,
    );
  }

  /**
   * Create a new order with server-side pricing.
   *
   * Flow:
   * 1. Validate each item (product exists, available, modifiers valid)
   * 2. Record CART_ITEM_ADDED per item
   * 3. Calculate pricing -> record PRICING_CALCULATED
   * 4. Save order with PENDING status -> record ORDER_PLACED
   * 5. Emit 'order.created' for async processing
   * 6. Return 202 Accepted
   */
  async createOrder(
    dto: CreateOrderDto,
    userId: string,
    idempotencyKey: string,
  ): Promise<OrderAcceptedResponse> {
    const correlationId = this.timelineService.generateCorrelationId();
    const resolvedItems: ResolvedItem[] = [];

    // Step 1+2: Validate each item and resolve pricing
    for (const item of dto.items) {
      const resolved = await this.validateAndResolveItem(
        item,
        userId,
        correlationId,
      );
      resolvedItems.push(resolved);

      // Record CART_ITEM_ADDED for each item
      await this.timelineService.addEvent({
        orderId: 'pending', // Will be updated — orderId not yet known
        userId,
        type: TimelineEventType.CART_ITEM_ADDED,
        source: TimelineEventSource.API,
        correlationId,
        payload: {
          productId: resolved.productId,
          productName: resolved.productName,
          quantity: resolved.quantity,
          selectedModifiers: resolved.modifiers,
        },
      });
    }

    // Step 3: Calculate pricing
    const subtotal = resolvedItems.reduce((sum, i) => sum + i.itemTotal, 0);
    const serviceFee = calculateServiceFee(
      subtotal,
      this.serviceFeeBasisPoints,
    );
    const total = subtotal + serviceFee;

    // Step 4: Persist order
    const order = (await this.ordersRepository.create({
      userId,
      items: resolvedItems.map((item) => ({
        ...item,
        productId: item.productId as unknown as import('mongoose').Types.ObjectId,
      })),
      status: OrderStatus.PENDING,
      subtotal,
      serviceFee,
      total,
      idempotencyKey,
    })) as unknown as OrderPlain;

    const orderId = String(order._id);

    // Record PRICING_CALCULATED
    await this.timelineService.addEvent({
      orderId,
      userId,
      type: TimelineEventType.PRICING_CALCULATED,
      source: TimelineEventSource.API,
      correlationId,
      payload: {
        items: resolvedItems.map((i) => ({
          productName: i.productName,
          unitPrice: i.unitPrice,
          modifiers: i.modifiers,
          quantity: i.quantity,
          itemTotal: i.itemTotal,
        })),
        subtotal,
        serviceFee,
        serviceFeeBasisPoints: this.serviceFeeBasisPoints,
        total,
      },
    });

    // Record ORDER_PLACED
    await this.timelineService.addEvent({
      orderId,
      userId,
      type: TimelineEventType.ORDER_PLACED,
      source: TimelineEventSource.API,
      correlationId,
      payload: { status: OrderStatus.PENDING },
    });

    // Step 5: Emit event for async processing (fire and forget)
    const event: OrderCreatedEvent = { orderId, userId, correlationId };
    this.eventEmitter.emit('order.created', event);

    // Step 6: Return 202
    return {
      orderId,
      status: OrderStatus.PENDING,
      message: 'Order received and being processed',
    };
  }

  /**
   * Get full order details by ID.
   */
  async getOrderById(id: string): Promise<OrderDetailResponse> {
    const order =
      (await this.ordersRepository.findById(id)) as unknown as OrderPlain | null;
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return {
      orderId: String(order._id),
      userId: order.userId,
      items: order.items.map((item) => ({
        productId: String(item.productId),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        modifiers: item.modifiers,
        itemTotal: item.itemTotal,
      })),
      status: order.status,
      subtotal: order.subtotal,
      serviceFee: order.serviceFee,
      total: order.total,
      idempotencyKey: order.idempotencyKey,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Transition order status using the FSM.
   * Validates the transition is allowed before applying it.
   * Records ORDER_STATUS_CHANGED event in timeline.
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    source: TimelineEventSource,
    correlationId: string,
  ): Promise<void> {
    const order =
      (await this.ordersRepository.findById(orderId)) as unknown as OrderPlain | null;
    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    const currentStatus = order.status;
    if (!isValidTransition(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition: ${currentStatus} → ${newStatus}`,
      );
    }

    await this.ordersRepository.update(orderId, { status: newStatus });

    await this.timelineService.addEvent({
      orderId,
      userId: order.userId,
      type: TimelineEventType.ORDER_STATUS_CHANGED,
      source,
      correlationId,
      payload: {
        previousStatus: currentStatus,
        newStatus,
      },
    });

    this.logger.log(`Order ${orderId}: ${currentStatus} → ${newStatus}`);
  }

  // ───────────────── Private helpers ─────────────────

  /**
   * Validate a single order item against the product catalog.
   * Checks: product exists, product available, modifiers valid.
   * Returns a fully resolved item with server-side prices.
   */
  private async validateAndResolveItem(
    item: CreateOrderItemDto,
    userId: string,
    correlationId: string,
  ): Promise<ResolvedItem> {
    // Fetch product from the menu service (source of truth)
    let product: ProductResponse;
    try {
      product = await this.menuService.getProductById(item.productId);
    } catch {
      await this.recordValidationFailed(
        userId,
        correlationId,
        `Product "${item.productId}" not found`,
      );
      throw new BadRequestException(
        `Product "${item.productId}" not found`,
      );
    }

    if (!product.available) {
      await this.recordValidationFailed(
        userId,
        correlationId,
        `Product "${product.name}" is not available`,
      );
      throw new BadRequestException(
        `Product "${product.name}" is currently unavailable`,
      );
    }

    // Validate modifiers against product's modifier groups
    const selectedModifiers = item.selectedModifiers ?? {};
    const resolvedModifiers = this.validateModifiers(
      product,
      selectedModifiers,
      userId,
      correlationId,
    );

    // Calculate item total: (basePrice + sum(modifierAdjustments)) * quantity
    const modifierTotal = resolvedModifiers.reduce(
      (sum, m) => sum + m.priceAdjustment,
      0,
    );
    const itemTotal = (product.basePrice + modifierTotal) * item.quantity;

    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: product.basePrice,
      modifiers: resolvedModifiers,
      itemTotal,
    };
  }

  /**
   * Validate modifier selections against the product's modifier groups.
   * Returns resolved modifiers with names and priceAdjustments from the DB.
   * Throws BadRequestException with clear error messages on validation failure.
   */
  private validateModifiers(
    product: ProductResponse,
    selectedModifiers: Record<string, string[]>,
    userId: string,
    correlationId: string,
  ): { name: string; priceAdjustment: number }[] {
    const errors: string[] = [];
    const resolved: { name: string; priceAdjustment: number }[] = [];

    // Build a lookup map for product's modifier groups
    const groupMap = new Map<
      string,
      ProductResponse['modifierGroups'][number]
    >();
    for (const group of product.modifierGroups) {
      groupMap.set(group.name, group);
    }

    // Check that all required groups are present
    for (const group of product.modifierGroups) {
      const selected = selectedModifiers[group.name];

      if (group.required) {
        if (!selected || selected.length === 0) {
          errors.push(
            `Modifier group "${group.name}" is required (min: ${group.minSelections})`,
          );
          continue;
        }
        if (selected.length < group.minSelections) {
          errors.push(
            `Modifier group "${group.name}" requires at least ${group.minSelections} selection(s), got ${selected.length}`,
          );
        }
        if (selected.length > group.maxSelections) {
          errors.push(
            `Modifier group "${group.name}" allows at most ${group.maxSelections} selection(s), got ${selected.length}`,
          );
        }
      } else {
        // Optional group — may be absent, but if present, check maxSelections
        if (selected && selected.length > group.maxSelections) {
          errors.push(
            `Modifier group "${group.name}" allows at most ${group.maxSelections} selection(s), got ${selected.length}`,
          );
        }
      }
    }

    // Check that no unknown groups were sent
    for (const groupName of Object.keys(selectedModifiers)) {
      if (!groupMap.has(groupName)) {
        errors.push(
          `Unknown modifier group "${groupName}" for product "${product.name}"`,
        );
      }
    }

    if (errors.length > 0) {
      // Record VALIDATION_FAILED in timeline (fire-and-forget)
      this.recordValidationFailed(
        userId,
        correlationId,
        errors.join('; '),
      ).catch(() => {});
      throw new BadRequestException(errors);
    }

    // Resolve each selected option to its DB price
    for (const [groupName, optionNames] of Object.entries(selectedModifiers)) {
      const group = groupMap.get(groupName);
      if (!group) continue; // already checked above

      const optionMap = new Map<
        string,
        { name: string; priceAdjustment: number }
      >();
      for (const opt of group.options) {
        optionMap.set(opt.name, opt);
      }

      for (const optName of optionNames) {
        const option = optionMap.get(optName);
        if (!option) {
          // Record and throw immediately for unknown option
          this.recordValidationFailed(
            userId,
            correlationId,
            `Unknown option "${optName}" in modifier group "${groupName}"`,
          ).catch(() => {});
          throw new BadRequestException(
            `Unknown option "${optName}" in modifier group "${groupName}"`,
          );
        }
        resolved.push({
          name: option.name,
          priceAdjustment: option.priceAdjustment,
        });
      }
    }

    return resolved;
  }

  private async recordValidationFailed(
    userId: string,
    correlationId: string,
    reason: string,
  ): Promise<void> {
    await this.timelineService.addEvent({
      orderId: 'validation-failed',
      userId,
      type: TimelineEventType.VALIDATION_FAILED,
      source: TimelineEventSource.API,
      correlationId,
      payload: { reason },
    });
  }
}
