import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * ModifierOption — a single selectable modifier (e.g., "Extra cheese").
 * Embedded subdocument of ModifierGroup, not a standalone collection.
 * priceAdjustment in integer cents to avoid floating-point issues.
 */
@Schema({ _id: false })
export class ModifierOption {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, type: Number })
  priceAdjustment!: number;
}

export const ModifierOptionSchema =
  SchemaFactory.createForClass(ModifierOption);
