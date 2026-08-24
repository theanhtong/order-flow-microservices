import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import {
  OrderCreatedEvent,
  InventoryReservedEvent,
  InventoryFailedEvent,
} from '@orderflow-microservices/shared';

@Controller()
export class NotificationController {
  private readonly logger = new Logger('NotificationController');

  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern('order.created')
  handleOrderCreated(@Payload() data: OrderCreatedEvent) {
    this.logger.log(`Received order.created event for Order #${data.orderId}`);
    this.notificationService.sendOrderCreatedNotification(data);
  }

  @EventPattern('inventory.reserved')
  handleInventoryReserved(@Payload() data: InventoryReservedEvent) {
    this.logger.log(`Received inventory.reserved event for Order #${data.orderId}`);
    this.notificationService.sendOrderConfirmedNotification(data);
  }

  @EventPattern('inventory.failed')
  handleInventoryFailed(@Payload() data: InventoryFailedEvent) {
    this.logger.log(`Received inventory.failed event for Order #${data.orderId}`);
    this.notificationService.sendOrderCancelledNotification(data);
  }
}
