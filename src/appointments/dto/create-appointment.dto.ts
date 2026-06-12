import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsInt,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({
    example: 4,
    description: 'ID del barbero',
  })
  @IsInt()
  barber_id: number;

  @ApiProperty({
    example: 7,
    description: 'ID del servicio',
  })
  @IsInt()
  service_id: number;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre del cliente',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  client_name: string;

  @ApiProperty({
    example: '999888777',
    description: 'Teléfono del cliente',
  })
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  client_phone: string;

  @ApiProperty({
    example: 'juan@example.com',
    description: 'Correo electrónico del cliente',
  })
  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  client_email: string;

  @ApiProperty({
    example: '2026-06-12T20:00:00',
    description:
      'Fecha y hora de inicio en formato ISO 8601 (sin timezone, hora local Lima)',
  })
  @IsDateString({}, { message: 'La fecha y hora de inicio debe ser válida' })
  start_time: string;
}
