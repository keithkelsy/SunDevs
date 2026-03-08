import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ModifierGroup, ModifierGroupSchema } from './modifier-group.schema';

export type ProductDocument = HydratedDocument<Product>;

/**
 * Product — a menu item with optional modifier groups.
 * basePrice stored in integer cents to avoid floating-point precision errors.
 * Modifier groups are embedded (not referenced) since they belong to the product.
 */
@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ required: true, index: true })
  category!: string;

  @Prop({ required: true, type: Number })
  basePrice!: number;

  @Prop({ default: true })
  available!: boolean;

  @Prop({ type: [ModifierGroupSchema], default: [] })
  modifierGroups!: ModifierGroup[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
