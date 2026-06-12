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

    // // 1. Clean database
    // console.log('🧹 Cleaning database...');
    // await dataSource.query(
    //   'TRUNCATE TABLE "barber_schedules", "appointments", "barbers", "services", "admin_users" CASCADE;',
    // );

    // // 2. Seed Services
    // console.log('✂️ Seeding services...');
    // const servicesData = [
    //   {
    //     name: 'Corte de Cabello Clásico',
    //     description:
    //       'Corte tradicional de caballero con lavado, secado y peinado con cera premium.',
    //     duration_minutes: 30,
    //     price: 15.0,
    //     is_active: true,
    //   },
    //   {
    //     name: 'Corte de Cabello + Barba',
    //     description:
    //       'Corte de cabello personalizado más arreglo, perfilado e hidratación de barba.',
    //     duration_minutes: 45,
    //     price: 22.0,
    //     is_active: true,
    //   },
    //   {
    //     name: 'Perfilado de Barba con Toalla Caliente',
    //     description:
    //       'Afeitado tradicional con navaja libre, toalla caliente y bálsamo calmante.',
    //     duration_minutes: 30,
    //     price: 12.0,
    //     is_active: true,
    //   },
    //   {
    //     name: 'Diseño de Corte Completo / Cejas',
    //     description:
    //       'Corte moderno con degradado (fade), diseño de líneas y perfilado de cejas.',
    //     duration_minutes: 60,
    //     price: 28.0,
    //     is_active: true,
    //   },
    // ];

    // const services = await serviceRepo.save(serviceRepo.create(servicesData));
    // console.log(`✅ Seeded ${services.length} services.`);

    // // 3. Seed Barbers
    // console.log('💈 Seeding barbers...');
    const saltRounds = 10;
    // const passwordHash = await bcrypt.hash('barberpassword123', saltRounds);

    // const barbersData = [
    //   {
    //     name: 'Carlos Mendoza',
    //     email: 'carlos@barberia.com',
    //     password_hash: passwordHash,
    //     phone: '+525512345678',
    //     is_active: true,
    //   },
    //   {
    //     name: 'Mateo Silva',
    //     email: 'mateo@barberia.com',
    //     password_hash: passwordHash,
    //     phone: '+525587654321',
    //     is_active: true,
    //   },
    // ];

    // const barbers = await barberRepo.save(barberRepo.create(barbersData));
    // console.log(`✅ Seeded ${barbers.length} barbers.`);

    // 4. Seed Superuser Admin
    console.log('👑 Seeding superuser admin...');
    const superuserPasswordHash = await bcrypt.hash(
      'superuser123@',
      saltRounds,
    );
    const adminUser = adminRepo.create({
      email: 'admin@superuser.com',
      password_hash: superuserPasswordHash,
      name: 'Superuser',
      is_active: true,
    });
    await adminRepo.save(adminUser);
    console.log('✅ Superuser admin seeded: admin@superuser.com');

    // // 5. Seed Schedules
    // console.log('📅 Seeding schedules for barbers...');
    // const schedulesData: Partial<BarberSchedule>[] = [];

    // for (const barber of barbers) {
    //   // Monday (1) to Saturday (6)
    //   for (let day = 1; day <= 6; day++) {
    //     schedulesData.push({
    //       barber_id: barber.id,
    //       day_of_week: day,
    //       start_hour: '09:00:00',
    //       end_hour: '19:00:00',
    //       break_start: '13:00:00',
    //       break_end: '14:00:00',
    //     });
    //   }
    // }

    // const schedules = await scheduleRepo.save(
    //   scheduleRepo.create(schedulesData),
    // );
    // console.log(`✅ Seeded ${schedules.length} schedules.`);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
