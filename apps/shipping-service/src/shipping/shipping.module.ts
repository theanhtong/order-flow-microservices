import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Shipment } from './entities/shipment.entity';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shipment]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_ORDER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')],
            queue: 'orders_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
