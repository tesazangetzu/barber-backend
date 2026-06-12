import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { AppointmentsService } from './appointments.service';
import {
  Appointment,
  AppointmentStatus,
  PaymentStatus,
  PaymentMethod,
} from './entities/appointment.entity';
import { Barber } from '../barbers/entities/barber.entity';
import { Service } from '../services/entities/service.entity';
import { BarberSchedule } from '../schedules/entities/schedule.entity';
import { BadRequestException } from '@nestjs/common';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let appointmentRepository: Repository<Appointment>;
  let serviceRepository: Repository<Service>;
  let barberRepository: Repository<Barber>;
  let scheduleRepository: Repository<BarberSchedule>;
  let dataSource: DataSource;

  // Mock repositories and query builders
  const mockAppointmentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockServiceRepository = {
    findOne: jest.fn(),
  };

  const mockBarberRepository = {
    findOne: jest.fn(),
  };

  const mockScheduleRepository = {
    findOne: jest.fn(),
  };

  // Mocking QueryBuilder specifically for the pessimistic write lock double-booking prevention check
  const mockQueryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockEntityManager = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn((entity, data) => data),
    save: jest.fn((data) => ({ id: 42, ...data })),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb(mockEntityManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: mockAppointmentRepository,
        },
        {
          provide: getRepositoryToken(Service),
          useValue: mockServiceRepository,
        },
        {
          provide: getRepositoryToken(Barber),
          useValue: mockBarberRepository,
        },
        {
          provide: getRepositoryToken(BarberSchedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    appointmentRepository = module.get<Repository<Appointment>>(
      getRepositoryToken(Appointment),
    );
    serviceRepository = module.get<Repository<Service>>(
      getRepositoryToken(Service),
    );
    barberRepository = module.get<Repository<Barber>>(
      getRepositoryToken(Barber),
    );
    scheduleRepository = module.get<Repository<BarberSchedule>>(
      getRepositoryToken(BarberSchedule),
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAppointment', () => {
    const createDto = {
      barber_id: 1,
      service_id: 2,
      client_name: 'Alejandro Ruiz',
      client_phone: '+525544332211',
      client_email: 'alejandro@gmail.com',
      start_time: '2026-05-20T09:30:00Z',
    };

    const mockService = {
      id: 2,
      name: 'Corte de Cabello Clásico',
      price: 15.0,
      duration_minutes: 30,
      is_active: true,
    };

    const mockBarber = {
      id: 1,
      name: 'Carlos Mendoza',
      is_active: true,
    };

    const mockSchedule = {
      id: 10,
      barber_id: 1,
      day_of_week: 3, // Wednesday
      start_hour: '09:00:00',
      end_hour: '19:00:00',
      break_start: '13:00:00',
      break_end: '14:00:00',
    };

    it('should successfully create an appointment when slot is free and fits schedule', async () => {
      mockServiceRepository.findOne.mockResolvedValue(mockService);
      mockBarberRepository.findOne.mockResolvedValue(mockBarber);
      mockQueryBuilder.getOne.mockResolvedValue(null); // No conflicting appointment
      mockEntityManager.findOne.mockResolvedValue(mockSchedule); // Barber schedule exists

      const expectedSavedApp = {
        id: 42,
        barber_id: 1,
        service_id: 2,
        client_name: 'Alejandro Ruiz',
        client_phone: '+525544332211',
        client_email: 'alejandro@gmail.com',
        start_time: new Date('2026-05-20T09:30:00Z'),
        end_time: new Date('2026-05-20T10:00:00Z'),
        status: AppointmentStatus.CONFIRMED,
        payment_status: PaymentStatus.PENDING,
        payment_method: PaymentMethod.LOCAL,
      };

      mockEntityManager.findOne.mockImplementation((entity, options) => {
        if (entity === BarberSchedule) {
          return Promise.resolve(mockSchedule);
        }
        return Promise.resolve(expectedSavedApp);
      });

      const result = await service.createAppointment(createDto);

      expect(mockServiceRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(mockBarberRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
      expect(result).toBeDefined();
      expect(result.id).toBe(42);
      expect(result.client_name).toBe('Alejandro Ruiz');
    });

    it('should throw BadRequestException if another appointment conflicts (double-booking prevention)', async () => {
      mockServiceRepository.findOne.mockResolvedValue(mockService);
      mockBarberRepository.findOne.mockResolvedValue(mockBarber);

      // Mock conflicting appointment exists
      mockQueryBuilder.getOne.mockResolvedValue({
        id: 99,
        barber_id: 1,
        start_time: new Date('2026-05-20T09:30:00Z'),
        end_time: new Date('2026-05-20T10:00:00Z'),
      });

      await expect(service.createAppointment(createDto)).rejects.toThrow(
        new BadRequestException(
          'El horario seleccionado ya ha sido reservado por otro cliente.',
        ),
      );
    });

    it('should throw BadRequestException if the service does not exist', async () => {
      mockServiceRepository.findOne.mockResolvedValue(null);

      await expect(service.createAppointment(createDto)).rejects.toThrow(
        new BadRequestException(
          'El servicio seleccionado no está activo o no existe.',
        ),
      );
    });

    it('should throw BadRequestException if requested time is outside working hours', async () => {
      mockServiceRepository.findOne.mockResolvedValue(mockService);
      mockBarberRepository.findOne.mockResolvedValue(mockBarber);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Slot at 08:30 is before barber starts working (starts at 09:00)
      const earlyDto = {
        ...createDto,
        start_time: '2026-05-20T08:30:00Z',
      };

      mockEntityManager.findOne.mockResolvedValue(mockSchedule);

      await expect(service.createAppointment(earlyDto)).rejects.toThrow(
        new BadRequestException(
          'La cita está fuera del horario laboral del barbero.',
        ),
      );
    });

    it('should throw BadRequestException if requested time overlaps with barber break', async () => {
      mockServiceRepository.findOne.mockResolvedValue(mockService);
      mockBarberRepository.findOne.mockResolvedValue(mockBarber);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Slot at 13:30 overlaps with break (13:00 - 14:00)
      const breakDto = {
        ...createDto,
        start_time: '2026-05-20T13:30:00Z',
      };

      mockEntityManager.findOne.mockResolvedValue(mockSchedule);

      await expect(service.createAppointment(breakDto)).rejects.toThrow(
        new BadRequestException(
          'El horario seleccionado coincide con el descanso del barbero.',
        ),
      );
    });
  });

  describe('getAvailableSlots', () => {
    it('should exclude a 30-minute slot if an existing appointment lasts 45 minutes', async () => {
      const mockSchedule = {
        barber_id: 1,
        day_of_week: 3,
        start_hour: '09:00:00',
        end_hour: '12:00:00',
      };

      const existingAppointments = [
        {
          barber_id: 1,
          start_time: new Date(2026, 4, 20, 9, 0, 0),
          end_time: new Date(2026, 4, 20, 9, 45, 0),
          status: AppointmentStatus.CONFIRMED,
        },
      ];

      mockScheduleRepository.findOne.mockResolvedValue(mockSchedule);
      mockAppointmentRepository.find.mockResolvedValue(existingAppointments);

      const slots = await service.getAvailableSlots(1, '2026-05-20');

      expect(slots).not.toContain('09:00');
      expect(slots).not.toContain('09:30');
      expect(slots).toContain('10:00');
    });
  });
});
