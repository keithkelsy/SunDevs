import { Expose } from 'class-transformer';

export class ModifierOptionResponseDto {
  @Expose()
  name!: string;

  @Expose()
  priceAdjustment!: number;
}
