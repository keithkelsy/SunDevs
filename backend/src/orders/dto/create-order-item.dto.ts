import { IsInt, IsMongoId, IsObject, IsOptional, Min } from 'class-validator';

/**
 * Client sends selectedModifiers as { groupName: [optionName, ...] }.
 * The server resolves prices — client NEVER sends price data.
 */
export class CreateOrderItemDto {
  @IsMongoId()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  /**
   * Map of modifier group name -> selected option names.
   * Example: { "Protein": ["Chicken"], "Toppings": ["Cheese", "Bacon"] }
   * Business validation (group/option existence, min/max) happens in the service.
   */
  @IsOptional()
  @IsObject()
  selectedModifiers?: Record<string, string[]>;
}
