import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  UsePipes,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { AppointmentsDateInterceptor } from './interceptors/appointments-date.interceptor';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  Appointment,
  AppointmentStatus,
  PaymentStatus,
  PaymentMethod,
} from './entities/appointment.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('appointments')
@Controller('appointments')
@UseInterceptors(AppointmentsDateInterceptor)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Obtener todas las citas',
    description:
      'Retorna una lista de todas las citas (requiere autenticación)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de citas obtenida exitosamente',
    type: [Appointment],
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(): Promise<Appointment[]> {
    return this.appointmentsService.findAll();
  }

  @Get('barber/:barberId/today')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Obtener citas de hoy de un barbero',
    description:
      'Retorna las citas del día actual para un barbero específico en zona horaria America/Lima',
  })
  @ApiParam({ name: 'barberId', description: 'ID del barbero', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Citas del día obtenidas exitosamente',
    type: [Appointment],
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Barbero no encontrado' })
  async findTodayByBarber(
    @Param('barberId', ParseIntPipe) barberId: number,
  ): Promise<Appointment[]> {
    return this.appointmentsService.findTodayByBarber(barberId);
  }

  @Get('available')
  @ApiOperation({
    summary: 'Obtener horarios disponibles',
    description:
      'Retorna los horarios disponibles de un barbero para una fecha específica',
  })
  @ApiQuery({ name: 'barberId', description: 'ID del barbero', type: 'number' })
  @ApiQuery({
    name: 'date',
    description: 'Fecha en formato YYYY-MM-DD',
    type: 'string',
    example: '2026-05-21',
  })
  @ApiResponse({
    status: 200,
    description: 'Horarios disponibles obtenidos exitosamente',
    type: [String],
  })
  @ApiResponse({ status: 404, description: 'Barbero no trabaja ese día' })
  async getAvailableSlots(
    @Query('barberId', ParseIntPipe) barberId: number,
    @Query('date') date: string,
  ): Promise<string[]> {
    return this.appointmentsService.getAvailableSlots(barberId, date);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Crear una cita',
    description: 'Crea una nueva cita y verifica disponibilidad',
  })
  @ApiBody({ type: CreateAppointmentDto })
  @ApiResponse({
    status: 201,
    description: 'Cita creada exitosamente',
    type: Appointment,
  })
  @ApiResponse({
    status: 400,
    description: 'Error en validación o conflicto de reserva',
  })
  async create(@Body() createDto: CreateAppointmentDto): Promise<Appointment> {
    return this.appointmentsService.createAppointment(createDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Actualizar estado de cita',
    description:
      'Actualiza el estado de una cita (confirmada, cancelada, etc.)',
  })
  @ApiParam({ name: 'id', description: 'ID de la cita', type: 'number' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { status: { enum: Object.values(AppointmentStatus) } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
    type: Appointment,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: AppointmentStatus,
  ): Promise<Appointment> {
    return this.appointmentsService.updateStatus(id, status);
  }

  @Patch(':id/payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Actualizar estado de pago',
    description: 'Actualiza el estado y método de pago de una cita',
  })
  @ApiParam({ name: 'id', description: 'ID de la cita', type: 'number' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        payment_status: { enum: Object.values(PaymentStatus) },
        payment_method: { enum: Object.values(PaymentMethod) },
        payment_id: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Pago actualizado exitosamente',
    type: Appointment,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  async updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body('payment_status') paymentStatus: PaymentStatus,
    @Body('payment_method') paymentMethod?: PaymentMethod,
    @Body('payment_id') paymentId?: string,
  ): Promise<Appointment> {
    return this.appointmentsService.updatePaymentStatus(
      id,
      paymentStatus,
      paymentMethod,
      paymentId,
    );
  }
}
