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
        (alias) => `DATE(${alias}) BETWEEN :start AND :end`,
        {
          start: filters.startDate,
          end: filters.endDate,
        },
      );
    } else if (filters?.startDate) {
      where.start_time = Raw((alias) => `DATE(${alias}) >= :start`, {
        start: filters.startDate,
      });
    } else if (filters?.endDate) {
      where.start_time = Raw((alias) => `DATE(${alias}) <= :end`, {
        end: filters.endDate,
      });
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
    const nowUtc = new Date();
    const nowLima = toZonedTime(nowUtc, TIMEZONE);
    const todayStart = new Date(nowLima);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(nowLima);
    todayEnd.setHours(23, 59, 59, 999);

    return this.appointmentRepository.find({
      where: {
        barber_id: barberId,
        start_time: Between(todayStart, todayEnd),
        status: Not(AppointmentStatus.CANCELLED),
      },
      relations: ['service'],
      order: { start_time: 'ASC' },
    });
  }

  async getAvailableSlots(
    barberId: number,
    dateStr: string,
  ): Promise<string[]> {
    const [year, month, day] = dateStr.split('-').map(Number);

    const dateLima = new Date(year, month - 1, day);
    const dayOfWeek = dateLima.getDay();

    const schedule = await this.scheduleRepository.findOne({
      where: {
        barber_id: barberId,
        day_of_week: dayOfWeek,
      },
    });

    if (!schedule) {
      return [];
    }

    const startOfDay = new Date(dateLima);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateLima);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await this.appointmentRepository.find({
      where: {
        barber_id: barberId,
        status: Not(AppointmentStatus.CANCELLED),
        start_time: LessThanOrEqual(endOfDay),
        end_time: MoreThanOrEqual(startOfDay),
      },
      order: {
        start_time: 'ASC',
      },
    });

    const slots: string[] = [];

    const [startH, startM] = schedule.start_hour.split(':').map(Number);
    const [endH, endM] = schedule.end_hour.split(':').map(Number);

    const workStart = new Date(dateLima);
    workStart.setHours(startH, startM, 0, 0);

    const workEnd = new Date(dateLima);
    workEnd.setHours(endH, endM, 0, 0);

    const breakStart = schedule.break_start
      ? (() => {
          const [h, m] = schedule.break_start.split(':').map(Number);
          const d = new Date(dateLima);
          d.setHours(h, m, 0, 0);
          return d;
        })()
      : null;

    const breakEnd = schedule.break_end
      ? (() => {
          const [h, m] = schedule.break_end.split(':').map(Number);
          const d = new Date(dateLima);
          d.setHours(h, m, 0, 0);
          return d;
        })()
      : null;

    // Intervalo de agenda: 30 minutos
    const SLOT_INTERVAL_MINUTES = 30;

    let current = new Date(workStart);

    while (current < workEnd) {
      const slotStart = new Date(current);

      const slotEnd = new Date(
        slotStart.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000,
      );

      // Evita generar slots fuera del horario laboral
      if (slotEnd > workEnd) {
        break;
      }

      const isBreak =
        breakStart && breakEnd && slotStart < breakEnd && slotEnd > breakStart;

      let isOverlapping = false;

      for (const appointment of appointments) {
        const appStart = new Date(appointment.start_time);
        const appEnd = new Date(appointment.end_time);

        const overlaps = slotStart < appEnd && slotEnd > appStart;

        if (overlaps) {
          isOverlapping = true;
          break;
        }
      }

      if (!isBreak && !isOverlapping) {
        slots.push(
          `${String(slotStart.getHours()).padStart(2, '0')}:${String(
            slotStart.getMinutes(),
          ).padStart(2, '0')}`,
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

    // Parse start_time as Lima local wall time
    const parsed = start_time.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/,
    );
    if (!parsed) {
      throw new BadRequestException('Formato de fecha inválido.');
    }

    const [, year, month, day, hour, minute, second = '0'] = parsed;
    const appStart = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );

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

      const workStart = new Date(appStart);
      const [startH, startM] = schedule.start_hour.split(':').map(Number);
      workStart.setHours(startH, startM, 0, 0);

      const workEnd = new Date(appStart);
      const [endH, endM] = schedule.end_hour.split(':').map(Number);
      workEnd.setHours(endH, endM, 0, 0);

      if (appStart < workStart || appEnd > workEnd) {
        throw new BadRequestException(
          'La cita está fuera del horario laboral del barbero.',
        );
      }

      if (schedule.break_start && schedule.break_end) {
        const breakStart = new Date(appStart);
        const [bsh, bsm] = schedule.break_start.split(':').map(Number);
        breakStart.setHours(bsh, bsm, 0, 0);

        const breakEnd = new Date(appStart);
        const [beh, bem] = schedule.break_end.split(':').map(Number);
        breakEnd.setHours(beh, bem, 0, 0);

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

  async updateService(
    id: number,
    serviceId: number,
  ): Promise<Appointment> {
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
