import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Corte clásico' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'Corte de cabello tradicional con acabado limpio',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 45 })
  @IsInt()
  @IsPositive()
  duration_minutes!: number;

  @ApiProperty({ example: 25.0 })
  @IsPositive()
  price!: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  is_active?: boolean;
}
