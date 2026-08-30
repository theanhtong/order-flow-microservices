import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OutboxMessage } from './outbox-message.entity';
import { OutboxProcessorService } from './outbox-processor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxMessage]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_INVENTORY_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'inventory_queue',
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: 'RABBITMQ_PAYMENT_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'payment_queue',
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: 'RABBITMQ_SHIPPING_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'shipping_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  providers: [OutboxProcessorService],
  exports: [TypeOrmModule, OutboxProcessorService],
})
export class OutboxModule {}
