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

  @EventPattern('shipment.dispatched')
  handleShipmentDispatched(@Payload() data: any) {
    this.logger.log(`Received shipment.dispatched event for Order #${data?.orderId}`);
  }

  @EventPattern('shipment.delivered')
  handleShipmentDelivered(@Payload() data: any) {
    this.logger.log(`Received shipment.delivered event for Order #${data?.orderId}`);
  }

  @EventPattern('order.cancelled')
  handleOrderCancelled(@Payload() data: any) {
    this.logger.log(`Received order.cancelled event for Order #${data?.orderId}`);
    this.notificationService.sendOrderCancelledNotification(data);
  }

  @EventPattern('shipment.delivery_fail')
  handleShipmentDeliveryFail(@Payload() data: any) {
    this.logger.log(`Received shipment.delivery_fail event for Order #${data?.orderId}`);
  }
}
