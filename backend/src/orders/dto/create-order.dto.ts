import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

/**
 * POST /orders request body.
 * userId comes from X-User-Id header (extracted in controller).
 * idempotencyKey comes from Idempotency-Key header (validated by interceptor).
 * The client NEVER sends prices — only product IDs, quantities, and modifier selections.
 */
export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
