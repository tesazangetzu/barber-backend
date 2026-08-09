import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { BarberSchedule } from '../../schedules/entities/schedule.entity';

@Entity('barbers')
export class Barber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contact_email: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => Appointment, (appointment) => appointment.barber)
  appointments: Appointment[];

  @OneToMany(() => BarberSchedule, (schedule) => schedule.barber)
  schedules: BarberSchedule[];
}
