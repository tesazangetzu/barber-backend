import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarberSchedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(BarberSchedule)
    private readonly scheduleRepository: Repository<BarberSchedule>,
  ) {}

  async findAll(): Promise<BarberSchedule[]> {
    return this.scheduleRepository.find({
      relations: ['barber'],
      order: { barber_id: 'ASC', day_of_week: 'ASC' },
    });
  }

  async findByBarber(barberId: number): Promise<BarberSchedule[]> {
    return this.scheduleRepository.find({
      where: { barber_id: barberId },
      relations: ['barber'],
      order: { day_of_week: 'ASC' },
    });
  }

  async findOneById(id: number): Promise<BarberSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['barber'],
    });
    if (!schedule)
      throw new NotFoundException(`Horario con ID ${id} no encontrado`);
    return schedule;
  }

  async create(createScheduleDto: CreateScheduleDto): Promise<BarberSchedule> {
    const schedule = this.scheduleRepository.create(createScheduleDto);
    return this.scheduleRepository.save(schedule);
  }

  async update(
    id: number,
    updateScheduleDto: UpdateScheduleDto,
  ): Promise<BarberSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
    });
    if (!schedule)
      throw new NotFoundException(`Horario con ID ${id} no encontrado`);

    if (typeof updateScheduleDto.barber_id !== 'undefined')
      schedule.barber_id = updateScheduleDto.barber_id;
    if (typeof updateScheduleDto.day_of_week !== 'undefined')
      schedule.day_of_week = updateScheduleDto.day_of_week;
    if (typeof updateScheduleDto.start_hour !== 'undefined')
      schedule.start_hour = updateScheduleDto.start_hour;
    if (typeof updateScheduleDto.end_hour !== 'undefined')
      schedule.end_hour = updateScheduleDto.end_hour;
    if (typeof updateScheduleDto.break_start !== 'undefined')
      schedule.break_start = updateScheduleDto.break_start;
    if (typeof updateScheduleDto.break_end !== 'undefined')
      schedule.break_end = updateScheduleDto.break_end;

    return this.scheduleRepository.save(schedule);
  }

  async remove(id: number): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
    });
    if (!schedule)
      throw new NotFoundException(`Horario con ID ${id} no encontrado`);
    await this.scheduleRepository.remove(schedule);
  }
}
