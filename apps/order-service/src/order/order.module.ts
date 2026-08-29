import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory]),
    OutboxModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
