import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({
    example: 1,
    description: 'ID del barbero al que pertenece el horario',
  })
  barber_id: number;

  @ApiProperty({
    example: 1,
    description: 'Día de la semana correspondiente (0 = domingo, 6 = sábado)',
  })
  day_of_week: number;

  @ApiProperty({
    example: '09:00:00',
    description: 'Hora de inicio del horario',
  })
  start_hour: string;

  @ApiProperty({ example: '18:00:00', description: 'Hora de fin del horario' })
  end_hour: string;

  @ApiProperty({
    example: '13:00:00',
    required: false,
    nullable: true,
    description: 'Hora de inicio del descanso (opcional)',
  })
  break_start?: string;

  @ApiProperty({
    example: '14:00:00',
    required: false,
    nullable: true,
    description: 'Hora de fin del descanso (opcional)',
  })
  break_end?: string;
}
