import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Patch,
  Delete,
  Req,
  UseGuards,
  UnauthorizedException,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { BarbersService } from './barbers.service';
import { Barber } from './entities/barber.entity';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { UpdateBarberContactEmailDto } from './dto/update-barber-contact-email.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('barbers')
@Controller('barbers')
@UseInterceptors(ClassSerializerInterceptor)
export class BarbersController {
  constructor(private readonly barbersService: BarbersService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los barberos',
    description: 'Retorna una lista de todos los barberos activos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de barberos obtenida exitosamente',
    type: [Barber],
  })
  async findAll(): Promise<Barber[]> {
    return this.barbersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener barbero por ID',
    description: 'Retorna los detalles de un barbero específico',
  })
  @ApiParam({ name: 'id', description: 'ID del barbero', type: 'number' })
  @ApiResponse({ status: 200, description: 'Barbero encontrado', type: Barber })
  @ApiResponse({ status: 404, description: 'Barbero no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Barber> {
    return this.barbersService.findOneById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo barbero' })
  @ApiResponse({ status: 201, description: 'Barbero creado', type: Barber })
  async create(@Body() createBarberDto: CreateBarberDto): Promise<Barber> {
    return this.barbersService.create(createBarberDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar barbero' })
  @ApiParam({ name: 'id', description: 'ID del barbero', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Barbero actualizado',
    type: Barber,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBarberDto: UpdateBarberDto,
  ): Promise<Barber> {
    return this.barbersService.update(id, updateBarberDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar (desactivar) barbero' })
  @ApiParam({ name: 'id', description: 'ID del barbero', type: 'number' })
  @ApiResponse({ status: 204, description: 'Barbero desactivado' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.barbersService.remove(id);
  }

  @Patch('me/contact-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar email de contacto del barbero autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Email de contacto actualizado',
    type: Barber,
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updateMyContactEmail(
    @Req() req: { user: { id: number; role?: string } },
    @Body() dto: UpdateBarberContactEmailDto,
  ): Promise<Barber> {
    if (req.user?.role !== 'barber') {
      throw new UnauthorizedException('Solo barberos pueden actualizar su email de contacto');
    }
    return this.barbersService.updateContactEmail(req.user.id, dto.contact_email);
  }
}
