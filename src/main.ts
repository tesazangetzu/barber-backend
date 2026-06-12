import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = process.env.PORT ?? 3000;
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Barbería Booking API')
    .setDescription('API para sistema de reservas de barbería')
    .setVersion('1.0.0')
    .addTag('auth', 'Autenticación y Login')
    .addTag('barbers', 'Gestión de Barberos')
    .addTag('services', 'Gestión de Servicios')
    .addTag('schedules', 'Horarios de Barberos')
    .addTag('appointments', 'Gestión de Citas')
    .addTag('payments', 'Gestión de Pagos')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
    },
  });

  await app.listen(port);
  console.log(`API Documentation available at http://localhost:${port}/api`);
}
bootstrap();
