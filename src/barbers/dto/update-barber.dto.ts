import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateBarberDto } from './create-barber.dto';

export class UpdateBarberDto extends PartialType(CreateBarberDto) {
  @ApiProperty({ example: true, required: false })
  is_active?: boolean;
}
