import { Expose, Type } from 'class-transformer';
import { OrderStatus } from '../enums/order-status.enum';

export class OrderItemResponseDto {
  @Expose()
  productId!: string;

  @Expose()
  productName!: string;

  @Expose()
  quantity!: number;

  @Expose()
  unitPrice!: number;

  @Expose()
  modifiers!: { name: string; priceAdjustment: number }[];

  @Expose()
  itemTotal!: number;
}

export class OrderResponseDto {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  @Type(() => OrderItemResponseDto)
  items!: OrderItemResponseDto[];

  @Expose()
  status!: OrderStatus;

  @Expose()
  subtotal!: number;

  @Expose()
  serviceFee!: number;

  @Expose()
  total!: number;

  @Expose()
  idempotencyKey!: string;

  @Expose()
  createdAt!: string;

  @Expose()
  updatedAt!: string;
}
