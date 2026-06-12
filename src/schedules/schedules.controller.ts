import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { BarberSchedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los horarios',
    description: 'Retorna todos los horarios registrados en el sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Horarios obtenidos exitosamente',
    type: [BarberSchedule],
  })
  async findAll(): Promise<BarberSchedule[]> {
    return this.schedulesService.findAll();
  }

  @Get('barber/:barberId')
  @ApiOperation({
    summary: 'Obtener horarios de un barbero',
    description: 'Retorna los horarios de trabajo de un barbero específico',
  })
  @ApiParam({ name: 'barberId', description: 'ID del barbero', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Horarios obtenidos exitosamente',
    type: [BarberSchedule],
  })
  @ApiResponse({ status: 404, description: 'Barbero no encontrado' })
  async findByBarber(
    @Param('barberId', ParseIntPipe) barberId: number,
  ): Promise<BarberSchedule[]> {
    return this.schedulesService.findByBarber(barberId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener horario por ID',
    description: 'Retorna un horario específico por su ID',
  })
  @ApiParam({ name: 'id', description: 'ID del horario', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Horario encontrado',
    type: BarberSchedule,
  })
  @ApiResponse({ status: 404, description: 'Horario no encontrado' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BarberSchedule> {
    return this.schedulesService.findOneById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo horario' })
  @ApiBody({ type: CreateScheduleDto })
  @ApiResponse({
    status: 201,
    description: 'Horario creado',
    type: BarberSchedule,
  })
  async create(
    @Body() createScheduleDto: CreateScheduleDto,
  ): Promise<BarberSchedule> {
    return this.schedulesService.create(createScheduleDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar horario' })
  @ApiParam({ name: 'id', description: 'ID del horario', type: 'number' })
  @ApiBody({ type: UpdateScheduleDto })
  @ApiResponse({
    status: 200,
    description: 'Horario actualizado',
    type: BarberSchedule,
  })
  @ApiResponse({ status: 404, description: 'Horario no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ): Promise<BarberSchedule> {
    return this.schedulesService.update(id, updateScheduleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar horario' })
  @ApiParam({ name: 'id', description: 'ID del horario', type: 'number' })
  @ApiResponse({ status: 200, description: 'Horario eliminado' })
  @ApiResponse({ status: 404, description: 'Horario no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.schedulesService.remove(id);
  }
}
