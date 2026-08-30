import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ShippingService } from './shipping.service';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';

@ApiTags('shipments')
@Controller('shipments')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('ghn/provinces')
  @ApiOperation({ summary: 'Get GHN Master Data Provinces (Tỉnh / Thành phố)' })
  async getGhnProvinces() {
    return await this.shippingService.getGhnProvinces();
  }

  @Get('ghn/districts')
  @ApiOperation({ summary: 'Get GHN Master Data Districts by Province ID (Quận / Huyện)' })
  @ApiQuery({ name: 'provinceId', required: true, type: Number })
  async getGhnDistricts(@Query('provinceId', ParseIntPipe) provinceId: number) {
    return await this.shippingService.getGhnDistricts(provinceId);
  }

  @Get('ghn/wards')
  @ApiOperation({ summary: 'Get GHN Master Data Wards by District ID (Phường / Xã)' })
  @ApiQuery({ name: 'districtId', required: true, type: Number })
  async getGhnWards(@Query('districtId', ParseIntPipe) districtId: number) {
    return await this.shippingService.getGhnWards(districtId);
  }

  @Post('ghn/webhook')
  @ApiOperation({ summary: 'GHN Webhook callback for real-time shipment updates' })
  async handleGhnWebhook(@Body() payload: any) {
    return await this.shippingService.handleGhnWebhook(payload);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get shipment information by order ID' })
  @ApiParam({ name: 'orderId', description: 'Target Order UUID' })
  async getShipmentByOrderId(@Param('orderId') orderId: string) {
    return await this.shippingService.getShipmentByOrderId(orderId);
  }

  @Patch('order/:orderId/status')
  @ApiOperation({ summary: 'Update shipment status & carrier tracking information' })
  @ApiParam({ name: 'orderId', description: 'Target Order UUID' })
  async updateShipmentStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return await this.shippingService.updateShipmentStatus(orderId, dto);
  }

  @EventPattern('order.created')
  async handleOrderCreated() {
    // No shipment created on PENDING order. Shipment is only created upon order.confirmed or manual admin action.
  }

  @EventPattern('order.confirmed')
  async handleOrderConfirmed() {
    // No automatic shipment created on order.confirmed. Shipment is only created when Admin explicitly clicks "Create GHN".
  }

  @EventPattern('order.cancelled')
  async handleOrderCancelled() {}

  @EventPattern('shipment.dispatched')
  async handleShipmentDispatched() {}

  @EventPattern('shipment.delivered')
  async handleShipmentDelivered() {}

  @EventPattern('shipment.delivery_fail')
  async handleShipmentDeliveryFail() {}
}
