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
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
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
import { MailService } from '../mail/mail.service';
import {
  newAppointmentHtml,
  newAppointmentSubject,
} from '../mail/templates/new-appointment.template';

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
    private readonly mailService: MailService,
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
    const todayStr = format(now, 'yyyy-MM-dd', { timeZone: TIMEZONE });
    const dayStart = fromZonedTime(`${todayStr}T00:00:00`, TIMEZONE);
    const dayEnd = fromZonedTime(`${todayStr}T23:59:59`, TIMEZONE);

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
    const dayStart = fromZonedTime(`${dateStr}T00:00:00`, TIMEZONE);
    const dayEnd = fromZonedTime(`${dateStr}T23:59:59`, TIMEZONE);
    const dayOfWeek = toZonedTime(dayStart, TIMEZONE).getDay();

    const schedule = await this.scheduleRepository.findOne({
      where: { barber_id: barberId, day_of_week: dayOfWeek },
    });
    if (!schedule) return [];

    const appointments = await this.appointmentRepository.find({
      where: {
        barber_id: barberId,
        status: Not(AppointmentStatus.CANCELLED),
        start_time: LessThanOrEqual(dayEnd),
        end_time: MoreThanOrEqual(dayStart),
      },
      order: { start_time: 'ASC' },
    });

    let durationMinutes = 30;
    if (serviceId) {
      const service = await this.serviceRepository.findOne({
        where: { id: serviceId, is_active: true },
      });
      if (service) durationMinutes = service.duration_minutes;
    }

    const workStart = fromZonedTime(
      `${dateStr}T${schedule.start_hour}`,
      TIMEZONE,
    );
    const workEnd = fromZonedTime(
      `${dateStr}T${schedule.end_hour}`,
      TIMEZONE,
    );
    const breakStart = schedule.break_start
      ? fromZonedTime(`${dateStr}T${schedule.break_start}`, TIMEZONE)
      : null;
    const breakEnd = schedule.break_end
      ? fromZonedTime(`${dateStr}T${schedule.break_end}`, TIMEZONE)
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
        slots.push(format(slotStart, 'HH:mm', { timeZone: TIMEZONE }));
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
      appStart = fromZonedTime(start_time, TIMEZONE);
    } catch {
      throw new BadRequestException('Formato de fecha inválido.');
    }

    const appEnd = new Date(
      appStart.getTime() + service.duration_minutes * 60 * 1000,
    );

    const appointment = await this.dataSource.transaction(async (entityManager) => {
      const conflicting = await entityManager
        .createQueryBuilder(Appointment, 'appointment')
        .setLock('pessimistic_write')
        .where('appointment.barber_id = :barberId', { barberId: barber_id })
        .andWhere('appointment.status != :cancelled', {
          cancelled: AppointmentStatus.CANCELLED,
        })
        .andWhere(
          'appointment.start_time < :appEnd AND appointment.end_time > :appStart',
          { appStart, appEnd },
        )
        .getOne();

      if (conflicting) {
        throw new BadRequestException(
          'El horario seleccionado ya ha sido reservado por otro cliente.',
        );
      }

      const dayOfWeek = toZonedTime(appStart, TIMEZONE).getDay();
      const schedule = await entityManager.findOne(BarberSchedule, {
        where: { barber_id, day_of_week: dayOfWeek },
      });

      if (!schedule) {
        throw new BadRequestException(
          'El barbero no trabaja en el día seleccionado.',
        );
      }

      const limaDate = format(appStart, 'yyyy-MM-dd', { timeZone: TIMEZONE });
      const workStart = fromZonedTime(
        `${limaDate}T${schedule.start_hour}`,
        TIMEZONE,
      );
      const workEnd = fromZonedTime(
        `${limaDate}T${schedule.end_hour}`,
        TIMEZONE,
      );

      if (appStart < workStart || appEnd > workEnd) {
        throw new BadRequestException(
          'La cita está fuera del horario laboral del barbero.',
        );
      }

      if (schedule.break_start && schedule.break_end) {
        const breakStart = fromZonedTime(
          `${limaDate}T${schedule.break_start}`,
          TIMEZONE,
        );
        const breakEnd = fromZonedTime(
          `${limaDate}T${schedule.break_end}`,
          TIMEZONE,
        );

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

    const limaDate = format(appointment.start_time, 'yyyy-MM-dd', { timeZone: TIMEZONE });
    const startLima = format(appointment.start_time, 'HH:mm', { timeZone: TIMEZONE });
    const endLima = format(appointment.end_time, 'HH:mm', { timeZone: TIMEZONE });

    this.mailService.sendEmail({
      to: appointment.barber.email,
      subject: newAppointmentSubject(),
      html: newAppointmentHtml({
        barberName: appointment.barber.name,
        clientName: appointment.client_name,
        clientPhone: appointment.client_phone,
        clientEmail: appointment.client_email ?? undefined,
        serviceName: appointment.service.name,
        date: limaDate,
        startTime: startLima,
        endTime: endLima,
      }),
    });

    return appointment;
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
