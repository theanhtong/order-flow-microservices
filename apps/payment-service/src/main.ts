import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('PaymentService');
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Payment Service API')
    .setDescription('Online Payment Gateway & Webhook Microservice API Documentation')
    .setVersion('1.0')
    .addTag('payments', 'Payment Gateway & IPN Webhook Operations')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PAYMENT_SERVICE_PORT', 3005);

  await app.listen(port);
  logger.log(`Payment Service is running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
