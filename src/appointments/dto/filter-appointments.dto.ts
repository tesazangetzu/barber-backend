import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  IsString,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterAppointmentsDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID del barbero',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  barber_id?: number;

  @ApiPropertyOptional({
    description: 'Buscar por nombre del cliente',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Desde fecha (inclusive, formato ISO: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description:
      'Hasta fecha (inclusive, formato ISO: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Incluir citas canceladas',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  with_cancelled?: boolean;

  @ApiPropertyOptional({
    description: 'Ordenar por fecha de inicio (ASC o DESC)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';
}
