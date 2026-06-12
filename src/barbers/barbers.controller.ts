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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BarbersService } from './barbers.service';
import { Barber } from './entities/barber.entity';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@ApiTags('barbers')
@Controller('barbers')
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
}
