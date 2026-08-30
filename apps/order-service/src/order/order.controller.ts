import { Controller, Post, Get, Patch, Body, Param, ParseUUIDPipe, Logger, Headers } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import {
  InventoryReservedEvent,
  InventoryFailedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '@orderflow-microservices/shared';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  private readonly logger = new Logger('OrderController');

  constructor(private readonly orderService: OrderService) {}

  @EventPattern('inventory.reserved')
  async handleInventoryReserved(@Payload() data: InventoryReservedEvent) {
    this.logger.log(`Received inventory.reserved event for Order #${data.orderId}. Reserved stock held.`);
  }

  @EventPattern('inventory.failed')
  async handleInventoryFailed(@Payload() data: InventoryFailedEvent) {
    this.logger.log(`Received inventory.failed event for Order #${data.orderId}. Reason: ${data.reason}`);
    try {
      await this.orderService.updateOrderStatus(data.orderId, OrderStatus.CANCELLED);
      this.logger.log(`Successfully updated Order #${data.orderId} status to CANCELLED`);
    } catch (error) {
      this.logger.error(`Failed to update Order #${data.orderId} status to CANCELLED: ${error.message}`);
    }
  }

  @EventPattern('payment.completed')
  async handlePaymentCompleted(@Payload() data: PaymentCompletedEvent) {
    this.logger.log(`Received payment.completed event for Order #${data.orderId}. Txn: ${data.transactionId}`);
    try {
      await this.orderService.updateOrderStatus(data.orderId, OrderStatus.CONFIRMED);
      this.logger.log(`Successfully confirmed Order #${data.orderId} after successful online payment`);
    } catch (error) {
      this.logger.error(`Failed to update Order #${data.orderId} status to CONFIRMED: ${error.message}`);
    }
  }

  @EventPattern('payment.failed')
  async handlePaymentFailed(@Payload() data: PaymentFailedEvent) {
    this.logger.log(`Received payment.failed event for Order #${data.orderId}. Reason: ${data.reason}`);
    try {
      await this.orderService.updateOrderStatus(data.orderId, OrderStatus.CANCELLED);
      this.logger.log(`Successfully updated Order #${data.orderId} status to CANCELLED due to payment failure`);
    } catch (error) {
      this.logger.error(`Failed to update Order #${data.orderId} status to CANCELLED: ${error.message}`);
    }
  }

  @EventPattern('shipment.dispatched')
  async handleShipmentDispatched(@Payload() data: { orderId: string; shipmentId: string }) {
    this.logger.log(`Received shipment.dispatched event for Order #${data.orderId}`);
    try {
      await this.orderService.updateOrderStatus(data.orderId, OrderStatus.SHIPPING);
      this.logger.log(`Successfully updated Order #${data.orderId} status to SHIPPING`);
    } catch (error) {
      this.logger.error(`Failed to update Order #${data.orderId} status to SHIPPING: ${error.message}`);
    }
  }

  @EventPattern('shipment.delivered')
  async handleShipmentDelivered(@Payload() data: { orderId: string; shipmentId: string }) {
    this.logger.log(`Received shipment.delivered event for Order #${data.orderId}`);
    try {
      await this.orderService.updateOrderStatus(data.orderId, OrderStatus.DELIVERED);
      this.logger.log(`Successfully updated Order #${data.orderId} status to DELIVERED upon carrier delivery confirmation`);
    } catch (error) {
      this.logger.error(`Failed to update Order #${data.orderId} status to DELIVERED: ${error.message}`);
    }
  }

  @EventPattern('shipment.delivery_fail')
  async handleShipmentDeliveryFail(@Payload() data: { orderId: string; reason?: string }) {
    this.logger.log(`Received shipment.delivery_fail event for Order #${data.orderId}`);
    try {
      await this.orderService.updateOrderStatus(data.orderId, OrderStatus.CANCELLED, data.reason || 'Delivery failed');
      this.logger.log(`Successfully updated Order #${data.orderId} status to CANCELLED on delivery failure`);
    } catch (error: any) {
      this.logger.error(`Failed to update Order #${data.orderId} status to CANCELLED: ${error.message}`);
    }
  }

  @EventPattern('order.created')
  async handleOrderCreated() {}

  @EventPattern('order.cancelled')
  async handleOrderCancelled() {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order successfully created', type: Order })
  @ApiResponse({ status: 400, description: 'Invalid input payload' })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Headers('x-user-id') userId?: string,
  ): Promise<Order> {
    if (userId) {
      createOrderDto.customerId = userId;
    }
    return await this.orderService.createOrder(createOrderDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by UUID' })
  @ApiParam({ name: 'id', description: 'Order UUID string' })
  @ApiResponse({ status: 200, description: 'Order details', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return await this.orderService.getOrderById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'List of all orders', type: [Order] })
  async findAllOrders(): Promise<Order[]> {
    return await this.orderService.findAllOrders();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order UUID string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(OrderStatus),
          example: OrderStatus.CONFIRMED,
        },
        cancelReason: {
          type: 'string',
          example: 'Changed my mind',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Updated order', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: OrderStatus,
    @Body('cancelReason') cancelReason?: string,
  ): Promise<Order> {
    return await this.orderService.updateOrderStatus(id, status, cancelReason);
  }
}
