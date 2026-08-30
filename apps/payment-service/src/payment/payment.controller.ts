import { Controller, Post, Get, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
import { CreateCheckoutDto, WebhookCallbackDto } from './dto';
import { Payment } from './entities/payment.entity';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Create a payment checkout session' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'Customer User ID passed from Gateway' })
  @ApiResponse({ status: 201, description: 'Payment checkout session created', type: Payment })
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @Headers('x-user-id') userId?: string,
  ): Promise<Payment> {
    return await this.paymentService.createCheckoutSession(userId, dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Simulated Payment Gateway IPN Webhook Callback' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(@Body() dto: WebhookCallbackDto) {
    return await this.paymentService.handleWebhook(dto);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment record by Order ID' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Payment record', type: Payment })
  async getPaymentByOrderId(@Param('orderId') orderId: string): Promise<Payment> {
    return await this.paymentService.getPaymentByOrderId(orderId);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Admin refund payment for an order' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment refunded', type: Payment })
  async refundPayment(@Param('id') id: string): Promise<Payment> {
    return await this.paymentService.refundPayment(id);
  }

  @Post('order/:orderId/cancel')
  @ApiOperation({ summary: 'Cancel/Refund payment by Order ID' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Payment status updated to REFUNDED/FAILED', type: Payment })
  async cancelPaymentByOrderId(
    @Param('orderId') orderId: string,
    @Body('reason') reason?: string,
  ): Promise<Payment | null> {
    return await this.paymentService.handleOrderCancelledOrFailed(orderId, reason);
  }

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() payload: any) {
    await this.paymentService.handleOrderCreated(payload);
  }

  @EventPattern('shipment.delivered')
  async handleShipmentDelivered(@Payload() payload: any) {
    await this.paymentService.handleShipmentDelivered(payload);
  }

  @EventPattern('order.cancelled')
  async handleOrderCancelled(@Payload() payload: any) {
    await this.paymentService.handleOrderCancelledOrFailed(payload?.orderId, payload?.reason);
  }

  @EventPattern('shipment.delivery_fail')
  async handleShipmentDeliveryFail(@Payload() payload: any) {
    await this.paymentService.handleOrderCancelledOrFailed(payload?.orderId, 'Delivery failed or returned');
  }

  @EventPattern('shipment.dispatched')
  async handleShipmentDispatched() {}

  @EventPattern('order.confirmed')
  async handleOrderConfirmed() {}

  @EventPattern('order.delivered')
  async handleOrderDelivered(@Payload() payload: any) {
    await this.paymentService.handleShipmentDelivered(payload);
  }

  @EventPattern('payment.completed')
  async handlePaymentCompleted() {}

  @EventPattern('payment.failed')
  async handlePaymentFailed() {}
}
