import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  Between,
  Not,
  LessThanOrEqual,
  MoreThanOrEqual,
  ILike,
  Raw,
} from 'typeorm';
import { toZonedTime } from 'date-fns-tz';
import {
  Appointment,
  AppointmentStatus,
  PaymentStatus,
  PaymentMethod,
} from './entities/appointment.entity';
import { Barber } from '../barbers/entities/barber.entity';
import { Service } from '../services/entities/service.entity';
import { BarberSchedule } from '../schedules/entities/schedule.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

const TIMEZONE = 'America/Lima';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Barber)
    private readonly barberRepository: Repository<Barber>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(BarberSchedule)
    private readonly scheduleRepository: Repository<BarberSchedule>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters?: {
    barberId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    withCancelled?: boolean;
    order?: 'ASC' | 'DESC';
  }): Promise<Appointment[]> {
    const where: any = {};

    if (filters?.barberId) {
      where.barber_id = filters.barberId;
    }

    if (filters?.startDate && filters?.endDate) {
      where.start_time = Raw(
        (alias) =>
          `(${alias} AT TIME ZONE 'America/Lima')::date BETWEEN :start AND :end`,
        {
          start: filters.startDate,
          end: filters.endDate,
        },
      );
    } else if (filters?.startDate) {
      where.start_time = Raw(
        (alias) => `(${alias} AT TIME ZONE 'America/Lima')::date >= :start`,
        {
          start: filters.startDate,
        },
      );
    } else if (filters?.endDate) {
      where.start_time = Raw(
        (alias) => `(${alias} AT TIME ZONE 'America/Lima')::date <= :end`,
        {
          end: filters.endDate,
        },
      );
    }

    if (!filters?.withCancelled) {
      where.status = Not(AppointmentStatus.CANCELLED);
    }

    if (filters?.search) {
      where.client_name = ILike(`%${filters.search}%`);
    }

    return this.appointmentRepository.find({
      where,
      relations: ['barber', 'service'],
      order: {
        start_time: filters?.order ?? 'ASC',
      },
    });
  }

  async findTodayByBarber(barberId: number): Promise<Appointment[]> {
    const now = new Date();
    const nowLima = toZonedTime(now, TIMEZONE);
    const y = nowLima.getFullYear();
    const M = String(nowLima.getMonth() + 1).padStart(2, '0');
    const D = String(nowLima.getDate()).padStart(2, '0');
    const todayStr = `${y}-${M}-${D}`;

    const dayStart = new Date(`${todayStr}T00:00:00-05:00`);
    const dayEnd = new Date(`${todayStr}T23:59:59.999-05:00`);

    return this.appointmentRepository.find({
      where: {
        barber_id: barberId,
        start_time: Between(dayStart, dayEnd),
        status: Not(AppointmentStatus.CANCELLED),
      },
      relations: ['service'],
      order: { start_time: 'ASC' },
    });
  }

  async getAvailableSlots(
    barberId: number,
    dateStr: string,
    serviceId?: number,
  ): Promise<string[]> {
    const dayStart = new Date(`${dateStr}T00:00:00-05:00`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999-05:00`);

    const schedule = await this.scheduleRepository.findOne({
      where: {
        barber_id: barberId,
        day_of_week: dayStart.getUTCDay(),
      },
    });

    if (!schedule) {
      return [];
    }

    const appointments = await this.appointmentRepository.find({
      where: {
        barber_id: barberId,
        status: Not(AppointmentStatus.CANCELLED),
        start_time: LessThanOrEqual(dayEnd),
        end_time: MoreThanOrEqual(dayStart),
      },
      order: {
        start_time: 'ASC',
      },
    });

    let durationMinutes = 30;
    if (serviceId) {
      const service = await this.serviceRepository.findOne({
        where: { id: serviceId, is_active: true },
      });
      if (service) {
        durationMinutes = service.duration_minutes;
      }
    }

    const workStart = new Date(`${dateStr}T${schedule.start_hour}-05:00`);
    const workEnd = new Date(`${dateStr}T${schedule.end_hour}-05:00`);
    const breakStart = schedule.break_start
      ? new Date(`${dateStr}T${schedule.break_start}-05:00`)
      : null;
    const breakEnd = schedule.break_end
      ? new Date(`${dateStr}T${schedule.break_end}-05:00`)
      : null;

    const SLOT_INTERVAL_MINUTES = 30;
    const slots: string[] = [];
    let current = new Date(workStart);

    while (current < workEnd) {
      const slotStart = new Date(current);
      const slotEnd = new Date(
        slotStart.getTime() + durationMinutes * 60 * 1000,
      );

      if (slotEnd > workEnd) {
        current = new Date(
          current.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000,
        );
        continue;
      }

      if (
        breakStart &&
        breakEnd &&
        slotStart < breakEnd &&
        slotEnd > breakStart
      ) {
        current = new Date(
          current.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000,
        );
        continue;
      }

      let isOverlapping = false;
      for (const appointment of appointments) {
        const appStart = new Date(appointment.start_time);
        const appEndExisting = new Date(appointment.end_time);

        if (slotStart < appEndExisting && slotEnd > appStart) {
          isOverlapping = true;
          break;
        }
      }

      if (!isOverlapping) {
        const h = (slotStart.getUTCHours() - 5 + 24) % 24;
        const m = slotStart.getUTCMinutes();
        slots.push(
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        );
      }

      current = new Date(current.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000);
    }

    return slots;
  }

  async createAppointment(
    createDto: CreateAppointmentDto,
  ): Promise<Appointment> {
    const {
      barber_id,
      service_id,
      start_time,
      client_name,
      client_phone,
      client_email,
    } = createDto;

    // 1. Fetch Service to calculate end time based on duration
    const service = await this.serviceRepository.findOne({
      where: { id: service_id },
    });
    if (!service || !service.is_active) {
      throw new BadRequestException(
        'El servicio seleccionado no está activo o no existe.',
      );
    }

    const barber = await this.barberRepository.findOne({
      where: { id: barber_id },
    });
    if (!barber || !barber.is_active) {
      throw new BadRequestException(
        'El barbero seleccionado no está activo o no existe.',
      );
    }

    let appStart: Date;
    try {
      appStart = toZonedTime(start_time, TIMEZONE);
    } catch {
      throw new BadRequestException('Formato de fecha inválido.');
    }

    const appEnd = new Date(
      appStart.getTime() + service.duration_minutes * 60 * 1000,
    );

    // 2. Perform transactional double-booking prevention
    return this.dataSource.transaction(async (entityManager) => {
      const conflicting = await entityManager
        .createQueryBuilder(Appointment, 'appointment')
        .setLock('pessimistic_write')
        .where('appointment.barber_id = :barberId', { barberId: barber_id })
        .andWhere('appointment.status != :cancelled', {
          cancelled: AppointmentStatus.CANCELLED,
        })
        .andWhere(
          'appointment.start_time < :appEnd AND appointment.end_time > :appStart',
          {
            appStart,
            appEnd,
          },
        )
        .getOne();

      if (conflicting) {
        throw new BadRequestException(
          'El horario seleccionado ya ha sido reservado por otro cliente.',
        );
      }

      const dayOfWeek = appStart.getDay();
      const schedule = await entityManager.findOne(BarberSchedule, {
        where: { barber_id: barber_id, day_of_week: dayOfWeek },
      });

      if (!schedule) {
        throw new BadRequestException(
          'El barbero no trabaja en el día seleccionado.',
        );
      }

      const y = appStart.getFullYear();
      const M = String(appStart.getMonth() + 1).padStart(2, '0');
      const D = String(appStart.getDate()).padStart(2, '0');
      const limaDate = `${y}-${M}-${D}`;

      const workStart = new Date(`${limaDate}T${schedule.start_hour}-05:00`);
      const workEnd = new Date(`${limaDate}T${schedule.end_hour}-05:00`);

      if (appStart < workStart || appEnd > workEnd) {
        throw new BadRequestException(
          'La cita está fuera del horario laboral del barbero.',
        );
      }

      if (schedule.break_start && schedule.break_end) {
        const breakStart = new Date(
          `${limaDate}T${schedule.break_start}-05:00`,
        );
        const breakEnd = new Date(`${limaDate}T${schedule.break_end}-05:00`);

        if (appStart < breakEnd && appEnd > breakStart) {
          throw new BadRequestException(
            'El horario seleccionado coincide con el descanso del barbero.',
          );
        }
      }

      const appointment = entityManager.create(Appointment, {
        barber_id: barber.id,
        service_id: service.id,
        client_name,
        client_phone,
        client_email,
        start_time: appStart,
        end_time: appEnd,
        status: AppointmentStatus.CONFIRMED,
        payment_status: PaymentStatus.PENDING,
        payment_method: PaymentMethod.LOCAL,
      });

      const saved = await entityManager.save(appointment);

      // Load relations to return a complete object
      return entityManager.findOne(Appointment, {
        where: { id: saved.id },
        relations: ['barber', 'service'],
      }) as Promise<Appointment>;
    });
  }

  async updateStatus(
    id: number,
    status: AppointmentStatus,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['barber', 'service'],
    });

    if (!appointment) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    appointment.status = status;
    return this.appointmentRepository.save(appointment);
  }

  async updatePaymentStatus(
    id: number,
    paymentStatus: PaymentStatus,
    method?: PaymentMethod,
    paymentId?: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['barber', 'service'],
    });

    if (!appointment) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    appointment.payment_status = paymentStatus;
    if (method) appointment.payment_method = method;
    if (paymentId) appointment.payment_id = paymentId;

    return this.appointmentRepository.save(appointment);
  }

  async updateService(id: number, serviceId: number): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['barber', 'service'],
    });

    if (!appointment) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        'Solo se puede cambiar el servicio de citas en estado CONFIRMED.',
      );
    }

    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
    });
    if (!service || !service.is_active) {
      throw new BadRequestException(
        'El servicio seleccionado no está activo o no existe.',
      );
    }

    appointment.service_id = service.id;
    appointment.service = service;

    // Recalculate end_time based on new service duration
    const appStart = new Date(appointment.start_time);
    const appEnd = new Date(
      appStart.getTime() + service.duration_minutes * 60 * 1000,
    );
    appointment.end_time = appEnd;

    return this.appointmentRepository.save(appointment);
  }
}
