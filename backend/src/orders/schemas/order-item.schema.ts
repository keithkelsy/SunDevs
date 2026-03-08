import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

/**
 * OrderItem — an individual line item within an order.
 * Denormalized: stores productName and unitPrice at time of order
 * so the order record remains accurate even if menu prices change later.
 */
@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
  productId!: mongoose.Types.ObjectId;

  @Prop({ required: true })
  productName!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true, type: Number })
  unitPrice!: number;

  @Prop({
    type: [{ name: String, priceAdjustment: Number }],
    default: [],
  })
  modifiers!: { name: string; priceAdjustment: number }[];

  @Prop({ required: true, type: Number })
  itemTotal!: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
