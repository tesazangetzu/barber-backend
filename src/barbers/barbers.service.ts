import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Barber } from './entities/barber.entity';
import * as bcrypt from 'bcrypt';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@Injectable()
export class BarbersService {
  constructor(
    @InjectRepository(Barber)
    private readonly barberRepository: Repository<Barber>,
  ) {}

  async findAll(): Promise<Barber[]> {
    return this.barberRepository.find({
      where: { is_active: true },
      select: ['id', 'name', 'email', 'phone', 'contact_email', 'is_active'],
    });
  }

  async findOneByEmail(email: string): Promise<Barber | null> {
    return this.barberRepository.findOne({
      where: { email },
    });
  }

  async create(createBarberDto: CreateBarberDto): Promise<Barber> {
    const existing = await this.findOneByEmail(createBarberDto.email);
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const password_hash = await bcrypt.hash(createBarberDto.password, 10);

    const barber = this.barberRepository.create({
      name: createBarberDto.name,
      email: createBarberDto.email,
      password_hash,
      phone: createBarberDto.phone,
      contact_email: createBarberDto.contact_email,
      is_active: true,
    });

    const saved = await this.barberRepository.save(barber);
    const result = await this.barberRepository.findOne({
      where: { id: saved.id },
      select: ['id', 'name', 'email', 'phone', 'contact_email', 'is_active'],
    });

    if (!result) {
      throw new NotFoundException('Error al obtener el barbero creado');
    }
    return result;
  }

  async update(id: number, updateBarberDto: UpdateBarberDto): Promise<Barber> {
    const barber = await this.barberRepository.findOne({ where: { id } });
    if (!barber) {
      throw new NotFoundException(`Barbero con ID ${id} no encontrado`);
    }

    if (updateBarberDto.email && updateBarberDto.email !== barber.email) {
      const exists = await this.findOneByEmail(updateBarberDto.email);
      if (exists && exists.id !== id) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    if (updateBarberDto.password) {
      barber.password_hash = await bcrypt.hash(updateBarberDto.password, 10);
    }

    if (typeof updateBarberDto.name !== 'undefined')
      barber.name = updateBarberDto.name;
    if (typeof updateBarberDto.email !== 'undefined')
      barber.email = updateBarberDto.email;
    if (typeof updateBarberDto.phone !== 'undefined')
      barber.phone = updateBarberDto.phone;
    if (typeof updateBarberDto.contact_email !== 'undefined')
      barber.contact_email = updateBarberDto.contact_email;
    if (typeof updateBarberDto.is_active !== 'undefined')
      barber.is_active = updateBarberDto.is_active;

    const saved = await this.barberRepository.save(barber);
    const result = await this.barberRepository.findOne({
      where: { id: saved.id },
      select: ['id', 'name', 'email', 'phone', 'contact_email', 'is_active'],
    });
    if (!result) {
      throw new NotFoundException('Error al obtener el barbero actualizado');
    }
    return result;
  }

  async remove(id: number): Promise<void> {
    const barber = await this.barberRepository.findOne({ where: { id } });
    if (!barber) {
      throw new NotFoundException(`Barbero con ID ${id} no encontrado`);
    }
    barber.is_active = false;
    await this.barberRepository.save(barber);
  }

  async findOneById(id: number): Promise<Barber> {
    const barber = await this.barberRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'phone', 'contact_email', 'is_active'],
    });
    if (!barber) {
      throw new NotFoundException(`Barbero con ID ${id} no encontrado`);
    }
    return barber;
  }

  async updateContactEmail(id: number, contactEmail: string): Promise<Barber> {
    const barber = await this.findOneById(id);
    barber.contact_email = contactEmail;
    await this.barberRepository.save(barber);
    return this.findOneById(id);
  }
}
