import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Barber } from './barbers/entities/barber.entity';
import { Service } from './services/entities/service.entity';
import { BarberSchedule } from './schedules/entities/schedule.entity';
import { AdminUser } from './auth/entities/admin-user.entity';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  console.log('🌱 Starting database seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const dataSource = app.get(DataSource);
    const barberRepo = dataSource.getRepository(Barber);
    const serviceRepo = dataSource.getRepository(Service);
    const adminRepo = dataSource.getRepository(AdminUser);
    const scheduleRepo = dataSource.getRepository(BarberSchedule);

    // 1. Clean database
    console.log('🧹 Cleaning database...');
    await dataSource.query(
      'TRUNCATE TABLE "barber_schedules", "appointments", "barbers", "services", "admin_users" CASCADE;',
    );

    // 2. Seed Services
    console.log('✂️ Seeding services...');
    const servicesData = [
      {
        name: 'Corte clásico',
        description: 'Corte de cabello tradicional con acabado limpio',
        duration_minutes: 40,
        price: 25.0,
        is_active: true,
      },
      {
        name: 'Corte clásico + barba',
        description:
          'Corte de cabello tradicional con acabado limpio + corte y perfilado tradicional de la barba',
        duration_minutes: 50,
        price: 30.0,
        is_active: true,
      },
      {
        name: 'Corte Urbano + barba',
        description:
          'Corte urbano a elección + Corte y perfilado tradicional de la barba',
        duration_minutes: 50,
        price: 30.0,
        is_active: true,
      },
      {
        name: 'Barba',
        description: 'Corte y perfilado tradicional',
        duration_minutes: 20,
        price: 10.0,
        is_active: true,
      },
      {
        name: 'Perfilado de cejas',
        description: 'Perfilado o limpieza de cejas',
        duration_minutes: 15,
        price: 5.0,
        is_active: true,
      },
      {
        name: 'Corte a Domicilio',
        description:
          'Según el lugar del domicilio varía el costo del servicio, comunicarse directamente con el barbero',
        duration_minutes: 60,
        price: 40.0,
        is_active: true,
      },
      {
        name: 'Corte urbano',
        description:
          'Skin fade: Low Fade, Mid Fade, High Fade / blow Out / Taper Fade / Burst Fade / Mohicano / Entre otros',
        duration_minutes: 40,
        price: 25.0,
        is_active: true,
      },
    ];

    const services = await serviceRepo.save(serviceRepo.create(servicesData));
    console.log(`✅ Seeded ${services.length} services.`);

    // 3. Seed Barbers
    console.log('💈 Seeding barbers...');
    const saltRounds = 10;
    const barberPasswordHash = await bcrypt.hash('barber123', saltRounds);

    const barbersData = [
      {
        name: 'Miguel Segura',
        email: 'miguel.segura@goodshands.com',
        password_hash: barberPasswordHash,
        phone: '+5491123456789',
        is_active: true,
      },
    ];

    const barbers = await barberRepo.save(barberRepo.create(barbersData));
    console.log(`✅ Seeded ${barbers.length} barbers.`);

    // 4. Seed Superuser Admin
    console.log('👑 Seeding superuser admin...');
    const adminPasswordHash = await bcrypt.hash('superuser123@', saltRounds);
    const adminUser = adminRepo.create({
      email: 'admin@superuser.com',
      password_hash: adminPasswordHash,
      name: 'Superuser',
      is_active: true,
    });
    await adminRepo.save(adminUser);
    console.log('✅ Superuser admin seeded: admin@superuser.com');

    // 5. Seed Schedules
    console.log('📅 Seeding schedules for barbers...');
    const schedulesData: Partial<BarberSchedule>[] = [];

    for (const barber of barbers) {
      for (let day = 1; day <= 6; day++) {
        schedulesData.push({
          barber_id: barber.id,
          day_of_week: day,
          start_hour: '09:00:00',
          end_hour: '21:00:00',
          break_start: '13:00:00',
          break_end: '14:00:00',
        });
      }
    }

    const schedules = await scheduleRepo.save(
      scheduleRepo.create(schedulesData),
    );
    console.log(`✅ Seeded ${schedules.length} schedules.`);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
