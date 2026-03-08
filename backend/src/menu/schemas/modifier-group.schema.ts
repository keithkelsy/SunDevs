import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ModifierOption, ModifierOptionSchema } from './modifier-option.schema';

/**
 * ModifierGroup — groups related modifier options (e.g., "Size", "Toppings").
 * minSelections/maxSelections enforce selection constraints at the domain level.
 * Embedded subdocument of Product.
 */
@Schema({ _id: false })
export class ModifierGroup {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  required!: boolean;

  @Prop({ required: true, min: 0 })
  minSelections!: number;

  @Prop({ required: true, min: 1 })
  maxSelections!: number;

  @Prop({ type: [ModifierOptionSchema], default: [] })
  options!: ModifierOption[];
}

export const ModifierGroupSchema =
  SchemaFactory.createForClass(ModifierGroup);
