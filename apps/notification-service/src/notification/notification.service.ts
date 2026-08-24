import { Injectable, Logger } from '@nestjs/common';
import {
  OrderCreatedEvent,
  InventoryReservedEvent,
  InventoryFailedEvent,
} from '@orderflow-microservices/shared';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger('NotificationService');

  sendOrderCreatedNotification(data: OrderCreatedEvent) {
    this.logger.log(
      `Sending Order Received Email/SMS notification to Customer for Order #${data.orderId}`,
    );
  }

  sendOrderConfirmedNotification(data: InventoryReservedEvent) {
    this.logger.log(
      `Sending Order Confirmation Email/SMS notification to Customer for Order #${data.orderId}`,
    );
  }

  sendOrderCancelledNotification(data: InventoryFailedEvent) {
    this.logger.log(
      `Sending Order Cancellation Email/SMS notification to Customer for Order #${data.orderId}. Reason: ${data.reason}`,
    );
  }
}
