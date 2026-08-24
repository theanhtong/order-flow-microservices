import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('NotificationService');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const rmqUrl = configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: 'orders_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  logger.log('Notification Service connected to RabbitMQ queue: orders_queue');
}

bootstrap();
