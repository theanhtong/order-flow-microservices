import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_ORDER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'orders_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'RABBITMQ_INVENTORY_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'inventory_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
