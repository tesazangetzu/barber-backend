import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarbersService } from '../barbers/barbers.service';
import { AdminUser } from './entities/admin-user.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly barbersService: BarbersService,
    private readonly jwtService: JwtService,
    @InjectRepository(AdminUser)
    private readonly adminRepository: Repository<AdminUser>,
  ) {}

  async login(loginDto: LoginDto): Promise<{
    access_token: string;
    barber: { id: number; name: string; email: string; contact_email: string | null };
  }> {
    const barber = await this.barbersService.findOneByEmail(loginDto.email);

    if (!barber || !barber.is_active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      barber.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: barber.id, email: barber.email, role: 'barber' };
    return {
      access_token: this.jwtService.sign(payload),
      barber: {
        id: barber.id,
        name: barber.name,
        email: barber.email,
        contact_email: barber.contact_email ?? null,
      },
    };
  }

  async loginAdmin(loginDto: LoginDto): Promise<{
    access_token: string;
    admin: { id: number; email: string; role: 'admin' };
  }> {
    const adminUser = await this.adminRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!adminUser || !adminUser.is_active) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      adminUser.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: adminUser.id,
      email: adminUser.email,
      role: 'admin',
    };

    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        role: 'admin',
      },
    };
  }
}
