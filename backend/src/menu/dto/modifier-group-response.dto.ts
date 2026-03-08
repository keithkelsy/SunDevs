import { Expose, Type } from 'class-transformer';
import { ModifierOptionResponseDto } from './modifier-option-response.dto';

export class ModifierGroupResponseDto {
  @Expose()
  name!: string;

  @Expose()
  required!: boolean;

  @Expose()
  minSelections!: number;

  @Expose()
  maxSelections!: number;

  @Expose()
  @Type(() => ModifierOptionResponseDto)
  options!: ModifierOptionResponseDto[];
}
