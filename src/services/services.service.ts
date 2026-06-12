import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async findAll(): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { is_active: true },
      order: { price: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id },
    });
    if (!service) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
    return service;
  }

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const service = this.serviceRepository.create({
      name: createServiceDto.name,
      description: createServiceDto.description,
      duration_minutes: createServiceDto.duration_minutes,
      price: createServiceDto.price,
      is_active:
        typeof createServiceDto.is_active === 'boolean'
          ? createServiceDto.is_active
          : true,
    });

    const saved = await this.serviceRepository.save(service);

    const result = await this.serviceRepository.findOne({
      where: { id: saved.id },
    });
    if (!result)
      throw new NotFoundException('Error al obtener el servicio creado');
    return result;
  }

  async update(
    id: number,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service)
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);

    if (typeof updateServiceDto.name !== 'undefined')
      service.name = updateServiceDto.name;
    if (typeof updateServiceDto.description !== 'undefined')
      service.description = updateServiceDto.description;
    if (typeof updateServiceDto.duration_minutes !== 'undefined')
      service.duration_minutes = updateServiceDto.duration_minutes;
    if (typeof updateServiceDto.price !== 'undefined')
      service.price = updateServiceDto.price;
    if (typeof updateServiceDto.is_active !== 'undefined')
      service.is_active = updateServiceDto.is_active;

    const saved = await this.serviceRepository.save(service);

    const result = await this.serviceRepository.findOne({
      where: { id: saved.id },
    });
    if (!result)
      throw new NotFoundException('Error al obtener el servicio actualizado');
    return result;
  }

  async remove(id: number): Promise<void> {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service)
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    service.is_active = false;
    await this.serviceRepository.save(service);
  }
}
