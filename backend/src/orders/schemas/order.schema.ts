import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OrderItem, OrderItemSchema } from './order-item.schema';
import { OrderStatus } from '../enums/order-status.enum';

export type OrderDocument = HydratedDocument<Order>;

/**
 * Order — represents a customer order with line items and pricing.
 * All monetary values in integer cents.
 * idempotencyKey ensures duplicate order submissions are safely handled.
 */
@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items!: OrderItem[];

  @Prop({
    required: true,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    index: true,
  })
  status!: OrderStatus;

  @Prop({ required: true, type: Number })
  subtotal!: number;

  @Prop({ required: true, type: Number })
  serviceFee!: number;

  @Prop({ required: true, type: Number })
  total!: number;

  @Prop({ required: true, unique: true, index: true })
  idempotencyKey!: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
