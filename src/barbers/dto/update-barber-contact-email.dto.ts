import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateBarberContactEmailDto {
  @ApiProperty({ example: 'contacto@example.com' })
  @IsEmail()
  @IsNotEmpty()
  contact_email!: string;
}