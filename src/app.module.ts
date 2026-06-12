import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Barber } from './barbers/entities/barber.entity';
import { Service } from './services/entities/service.entity';
import { Appointment } from './appointments/entities/appointment.entity';
import { BarberSchedule } from './schedules/entities/schedule.entity';
import { AdminUser } from './auth/entities/admin-user.entity';
import { BarbersModule } from './barbers/barbers.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { SchedulesModule } from './schedules/schedules.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [Barber, Service, Appointment, BarberSchedule, AdminUser],
            synchronize: true,
            ssl:
              process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
          };
        }

        return {
          type: 'postgres' as const,
          host: configService.get<string>('DATABASE_HOST'),
          port: configService.get<number>('DATABASE_PORT'),
          username: configService.get<string>('DATABASE_USER'),
          password: configService.get<string>('DATABASE_PASSWORD'),
          database: configService.get<string>('DATABASE_NAME'),
          entities: [Barber, Service, Appointment, BarberSchedule, AdminUser],
          synchronize: configService.get('DATABASE_SYNCHRONIZE', true),
        };
      },
    }),
    // TypeOrmModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => ({
    //     type: 'postgres',
    //     host: configService.get<string>('DATABASE_HOST', 'localhost'),
    //     port: configService.get<number>('DATABASE_PORT', 5432),
    //     username: configService.get<string>('DATABASE_USER', 'postgres'),
    //     password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
    //     database: configService.get<string>('DATABASE_NAME', 'barberia'),
    //     entities: [Barber, Service, Appointment, BarberSchedule],
    //     synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE', true),
    //   }),
    // }),
    BarbersModule,
    AuthModule,
    ServicesModule,
    SchedulesModule,
    AppointmentsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
