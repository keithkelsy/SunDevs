import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { TimelineService } from '../timeline/timeline.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaginationQueryDto } from '../common/dto';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';

/**
 * Orders controller — handles HTTP requests for order operations.
 * Zero business logic: validates input, extracts headers, delegates to services.
 * Timeline endpoint is co-located here since it's nested under /orders/:id.
 */
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly timelineService: TimelineService,
  ) {}

  /**
   * POST /orders — create a new order.
   * Requires Idempotency-Key header (UUID v4).
   * userId from X-User-Id header, defaults to "user-default".
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(IdempotencyInterceptor)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Headers('x-user-id') userId: string,
  ) {
    const resolvedUserId = userId ?? 'user-default';
    return this.ordersService.createOrder(dto, resolvedUserId, idempotencyKey);
  }

  /**
   * GET /orders/:orderId — full order details with pricing breakdown.
   */
  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string) {
    return this.ordersService.getOrderById(orderId);
  }

  /**
   * GET /orders/:orderId/timeline — paginated timeline events for an order.
   * Sorted by timestamp ascending (chronological).
   */
  @Get(':orderId/timeline')
  async getOrderTimeline(
    @Param('orderId') orderId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.timelineService.getOrderTimeline(
      orderId,
      query.page,
      query.pageSize,
    );
    return {
      events: result.data,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        totalEvents: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}
