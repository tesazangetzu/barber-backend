import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Barber } from '../../barbers/entities/barber.entity';

@Entity('barber_schedules')
export class BarberSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  barber_id: number;

  @Column({ type: 'int' })
  day_of_week: number; // 0-6 (0 = Sunday, 6 = Saturday)

  @Column({ type: 'time' })
  start_hour: string; // e.g. "09:00:00"

  @Column({ type: 'time' })
  end_hour: string; // e.g. "18:00:00"

  @Column({ type: 'time', nullable: true })
  break_start?: string | null; // e.g. "13:00:00"

  @Column({ type: 'time', nullable: true })
  break_end?: string | null; // e.g. "14:00:00"

  @ManyToOne(() => Barber, (barber) => barber.schedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'barber_id' })
  barber: Barber;
}
