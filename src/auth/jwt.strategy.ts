import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarbersService } from '../barbers/barbers.service';
import { AdminUser } from './entities/admin-user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly barbersService: BarbersService,
    @InjectRepository(AdminUser)
    private readonly adminRepository: Repository<AdminUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'super-secret-key-for-barbers-dashboard',
      ),
    });
  }

  async validate(payload: { sub: number; email: string; role?: string }) {
    if (payload.role === 'admin') {
      const adminUser = await this.adminRepository.findOne({
        where: { id: payload.sub },
      });
      if (!adminUser || !adminUser.is_active) {
        throw new UnauthorizedException('Acceso no autorizado');
      }
      return {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'admin',
      };
    }

    if (typeof payload.sub !== 'number') {
      throw new UnauthorizedException('Acceso no autorizado');
    }

    const barber = await this.barbersService.findOneById(payload.sub);
    if (!barber || !barber.is_active) {
      throw new UnauthorizedException('Acceso no autorizado');
    }
    return {
      id: barber.id,
      name: barber.name,
      email: barber.email,
      role: 'barber',
    };
  }
}
