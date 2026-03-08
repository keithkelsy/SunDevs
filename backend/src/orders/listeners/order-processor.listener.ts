import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrdersService } from '../orders.service';
import { OrderStatus } from '../enums/order-status.enum';
import { TimelineEventSource } from '../../timeline/enums/timeline-event-source.enum';

interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  correlationId: string;
}

/**
 * Async order processor — simulates a kitchen/fulfillment workflow.
 * Listens for 'order.created' events emitted by OrdersService and
 * progresses the order through status transitions with realistic delays.
 *
 * In production this would be a separate Lambda or worker process;
 * using EventEmitter2 here for local simulation.
 */
@Injectable()
export class OrderProcessorListener {
  private readonly logger = new Logger(OrderProcessorListener.name);

  constructor(private readonly ordersService: OrdersService) {}

  @OnEvent('order.created', { async: true })
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const { orderId, correlationId } = event;
    this.logger.log(`Processing order ${orderId}...`);

    try {
      // PENDING → CONFIRMED (simulate payment/validation: 2-3s)
      await this.delay(2000, 3000);
      await this.ordersService.updateOrderStatus(
        orderId,
        OrderStatus.CONFIRMED,
        TimelineEventSource.WORKER,
        correlationId,
      );

      // CONFIRMED → PREPARING (simulate kitchen start: 3-5s)
      await this.delay(3000, 5000);
      await this.ordersService.updateOrderStatus(
        orderId,
        OrderStatus.PREPARING,
        TimelineEventSource.WORKER,
        correlationId,
      );

      // PREPARING → READY (simulate cooking complete: 2-3s)
      await this.delay(2000, 3000);
      await this.ordersService.updateOrderStatus(
        orderId,
        OrderStatus.READY,
        TimelineEventSource.WORKER,
        correlationId,
      );

      this.logger.log(`Order ${orderId} is READY for pickup`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Order processing failed for ${orderId}: ${message}`,
      );
    }
  }

  /** Random delay between min and max milliseconds */
  private delay(minMs: number, maxMs: number): Promise<void> {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
