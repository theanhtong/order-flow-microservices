import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('ShippingService');

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'shipping_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  logger.log('Shipping Service RabbitMQ Consumer connected to queue: shipping_queue');

  const config = new DocumentBuilder()
    .setTitle('Shipping Service API')
    .setDescription('Logistics, GHN Open API integration, and shipment tracking')
    .setVersion('1.0')
    .addTag('shipments')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3006;
  await app.listen(port);
  logger.log(`Shipping Service is running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
