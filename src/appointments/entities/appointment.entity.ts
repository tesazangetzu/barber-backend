import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Barber } from '../../barbers/entities/barber.entity';
import { Service } from '../../services/entities/service.entity';

export enum AppointmentStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  LOCAL = 'LOCAL',
  ONLINE = 'ONLINE',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  'id': number;

  @Column({ type: 'int' })
  'barber_id': number;

  @Column({ type: 'int' })
  'service_id': number;

  @Column({ type: 'varchar', length: 150 })
  'client_name': string;

  @Column({ type: 'varchar', length: 20 })
  'client_phone': string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  'client_email': string;

  @Column({ type: 'timestamptz' })
  'start_time': Date;

  @Column({ type: 'timestamptz' })
  'end_time': Date;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.CONFIRMED,
  })
  'status': AppointmentStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  'payment_status': PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.LOCAL,
  })
  'payment_method': PaymentMethod;

  @Column({ type: 'varchar', length: 255, nullable: true })
  'payment_id': string;

  @CreateDateColumn({ type: 'timestamptz' })
  'created_at': Date;

  @ManyToOne(() => Barber, (barber) => barber.appointments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'barber_id' })
  'barber': Barber;

  @ManyToOne(() => Service, (service) => service.appointments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'service_id' })
  'service': Service;
}
