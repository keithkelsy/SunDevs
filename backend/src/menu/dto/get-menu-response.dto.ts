import { Expose, Type } from 'class-transformer';
import { ModifierGroupResponseDto } from './modifier-group-response.dto';

export class ProductResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string;

  @Expose()
  category!: string;

  @Expose()
  basePrice!: number;

  @Expose()
  available!: boolean;

  @Expose()
  @Type(() => ModifierGroupResponseDto)
  modifierGroups!: ModifierGroupResponseDto[];
}

/** A category with its products — used by the grouped GET /menu response */
export class MenuCategoryDto {
  @Expose()
  name!: string;

  @Expose()
  @Type(() => ProductResponseDto)
  products!: ProductResponseDto[];
}

/** GET /menu response — products grouped by category */
export class GetMenuResponseDto {
  @Expose()
  @Type(() => MenuCategoryDto)
  categories!: MenuCategoryDto[];
}
