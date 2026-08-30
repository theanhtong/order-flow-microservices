import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger('ShippingService');

  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @Inject('RABBITMQ_ORDER_SERVICE')
    private readonly orderRabbitClient: ClientProxy,
    private readonly configService: ConfigService,
  ) { }

  async getGhnProvinces(): Promise<any[]> {
    const token = this.configService.get<string>('GHN_TOKEN', '');
    try {
      const response = await axios.get(
        'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province',
        {
          headers: { Token: token },
          timeout: 5000,
        },
      );
      return response.data?.data || [];
    } catch (error: any) {
      this.logger.error(`Failed to fetch GHN Provinces: ${error.message}`);
      return [];
    }
  }

  async getGhnDistricts(provinceId: number): Promise<any[]> {
    const token = this.configService.get<string>('GHN_TOKEN', '');
    try {
      const response = await axios.post(
        'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district',
        { province_id: Number(provinceId) },
        {
          headers: {
            'Content-Type': 'application/json',
            Token: token,
          },
          timeout: 5000,
        },
      );
      return response.data?.data || [];
    } catch (error: any) {
      this.logger.error(`Failed to fetch GHN Districts for Province #${provinceId}: ${error.message}`);
      return [];
    }
  }

  async getGhnWards(districtId: number): Promise<any[]> {
    const token = this.configService.get<string>('GHN_TOKEN', '');
    try {
      const response = await axios.post(
        `https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id=${districtId}`,
        { district_id: Number(districtId) },
        {
          headers: {
            'Content-Type': 'application/json',
            Token: token,
          },
          timeout: 5000,
        },
      );
      return response.data?.data || [];
    } catch (error: any) {
      this.logger.error(`Failed to fetch GHN Wards for District #${districtId}: ${error.message}`);
      return [];
    }
  }

  async createGhnShippingOrder(
    orderId: string,
    recipientName = 'Customer',
    phone = '',
    address = '',
    toWardCode?: string,
    toDistrictId?: number,
  ): Promise<string> {
    const fallbackCode = `GHN-${Math.floor(100000 + Math.random() * 900000)}`;

    const ghnToken = this.configService.get<string>('GHN_TOKEN', '');
    const ghnShopId = this.configService.get<string>('GHN_SHOP_ID', '');
    const ghnShopName = this.configService.get<string>('GHN_SHOP_NAME', 'shop-name');
    const ghnShopPhone = this.configService.get<string>('GHN_SHOP_PHONE', '');
    const ghnFromAddress = this.configService.get<string>('GHN_FROM_ADDRESS', '');
    const ghnFromWardName = this.configService.get<string>('GHN_FROM_WARD_NAME', '');
    const ghnFromDistrictName = this.configService.get<string>('GHN_FROM_DISTRICT_NAME', '');
    const ghnFromProvinceName = this.configService.get<string>('GHN_FROM_PROVINCE_NAME', '');
    const ghnDefaultToAddress = this.configService.get<string>('GHN_DEFAULT_TO_ADDRESS', '');
    const ghnDefaultToWardCode =
      toWardCode || this.configService.get<string>('GHN_DEFAULT_TO_WARD_CODE', '20308');
    const ghnDefaultToDistrictId =
      toDistrictId ||
      Number(this.configService.get<string>('GHN_DEFAULT_TO_DISTRICT_ID', '1442'));

    const ghnApiUrl =
      this.configService.get<string>('GHN_API_URL') ||
      'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create';

    if (!ghnToken || !ghnShopId) {
      this.logger.log(`GHN API credentials not configured in environment. Generated tracking code: ${fallbackCode}`);
      return fallbackCode;
    }

    try {
      const payload = {
        payment_type_id: 2,
        note: `#${orderId.substring(0, 8)}`,
        required_note: 'KHONGCHOXEMHANG',
        from_name: ghnShopName,
        from_phone: ghnShopPhone,
        from_address: ghnFromAddress,
        from_ward_name: ghnFromWardName,
        from_district_name: ghnFromDistrictName,
        from_province_name: ghnFromProvinceName,
        return_phone: ghnShopPhone,
        return_address: ghnFromAddress,
        to_name: recipientName,
        to_phone: phone || ghnShopPhone,
        to_address: address || ghnDefaultToAddress,
        to_ward_code: String(ghnDefaultToWardCode),
        to_district_id: Number(ghnDefaultToDistrictId),
        weight: 200,
        length: 15,
        width: 15,
        height: 15,
        service_type_id: 2,
        items: [
          {
            name: `#${orderId.substring(0, 8)}`,
            code: orderId.substring(0, 8),
            quantity: 1,
            price: 500000,
          },
        ],
      };

      const response = await axios.post(ghnApiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          Token: ghnToken,
          ShopId: Number(ghnShopId),
        },
        timeout: 5000,
      });

      if (response.data && response.data.data && response.data.data.order_code) {
        const trackingCode = response.data.data.order_code;
        this.logger.log(`GHN Open API order created successfully! Tracking code: ${trackingCode}`);
        return trackingCode;
      }
    } catch (error: any) {
      this.logger.warn(
        `GHN API integration note: ${error?.response?.data?.message || error.message}. Using tracking code format: ${fallbackCode}`,
      );
    }

    return fallbackCode;
  }

  async createShipmentForOrder(
    orderId: string,
    carrierCode = 'GHN',
    recipientName?: string,
    phone?: string,
    address?: string,
    toWardCode?: string,
    toDistrictId?: number,
  ): Promise<Shipment> {
    const existing = await this.shipmentRepository.findOne({ where: { orderId } });
    if (existing) {
      return existing;
    }

    const trackingCode = await this.createGhnShippingOrder(
      orderId,
      recipientName,
      phone,
      address,
      toWardCode,
      toDistrictId,
    );

    const shipment = this.shipmentRepository.create({
      orderId,
      status: ShipmentStatus.READY_TO_PICK,
      carrierCode: 'GHN',
      trackingCode,
      recipientName,
      phone,
      address,
      toWardCode,
      toDistrictId,
    });

    const saved = await this.shipmentRepository.save(shipment);
    this.logger.log(
      `Created GHN Shipment #${saved.id} for Order #${orderId} (Tracking: ${trackingCode})`,
    );

    this.orderRabbitClient.emit('shipment.dispatched', {
      orderId: saved.orderId,
      shipmentId: saved.id,
      trackingCode,
    }).subscribe();
    return saved;
  }

  async getShipmentByOrderId(orderId: string): Promise<Shipment | null> {
    return await this.shipmentRepository.findOne({ where: { orderId } });
  }

  async updateShipmentStatus(
    orderId: string,
    dto: UpdateShipmentStatusDto,
  ): Promise<Shipment> {
    let shipment = await this.shipmentRepository.findOne({ where: { orderId } });
    if (!shipment) {
      shipment = await this.createShipmentForOrder(
        orderId,
        dto.carrierCode || 'GHN',
        dto.recipientName,
        dto.phone,
        dto.address,
        dto.toWardCode,
        dto.toDistrictId,
      );
    } else if (dto.toWardCode || dto.toDistrictId) {
      const newTrackingCode = await this.createGhnShippingOrder(
        orderId,
        dto.recipientName || shipment.recipientName,
        dto.phone || shipment.phone,
        dto.address || shipment.address,
        dto.toWardCode || shipment.toWardCode,
        dto.toDistrictId || shipment.toDistrictId,
      );
      shipment.trackingCode = newTrackingCode;
    }

    const statusRank: Record<string, number> = {
      READY_TO_PICK: 0,
      PICKING: 1,
      DELIVERING: 2,
      DELIVERED: 3,
      DELIVERY_FAIL: 3,
      CANCELLED: 3,
    };

    const currentRank = statusRank[shipment.status?.toUpperCase() || ''] ?? 0;
    const newRank = statusRank[dto.status?.toUpperCase() || ''] ?? 0;

    if (newRank < currentRank) {
      throw new BadRequestException(
        `Cannot revert shipment status from ${shipment.status} to ${dto.status}`,
      );
    }

    shipment.status = dto.status;
    if (dto.trackingCode) shipment.trackingCode = dto.trackingCode;
    if (dto.carrierCode) shipment.carrierCode = dto.carrierCode;
    if (dto.recipientName) shipment.recipientName = dto.recipientName;
    if (dto.phone) shipment.phone = dto.phone;
    if (dto.address) shipment.address = dto.address;
    if (dto.toWardCode) shipment.toWardCode = dto.toWardCode;
    if (dto.toDistrictId) shipment.toDistrictId = dto.toDistrictId;

    const updated = await this.shipmentRepository.save(shipment);
    this.logger.log(`Updated GHN Shipment for Order #${orderId} -> Status: ${dto.status}`);

    if (dto.status === ShipmentStatus.DELIVERED) {
      const payload = {
        orderId: shipment.orderId,
        shipmentId: shipment.id,
        status: shipment.status,
        deliveredAt: new Date(),
      };
      this.orderRabbitClient.emit('shipment.delivered', payload).subscribe();
      this.logger.log(`Emitted shipment.delivered event via RabbitMQ for Order #${orderId}`);
    } else if (dto.status === ShipmentStatus.DELIVERY_FAIL) {
      const payload = {
        orderId: shipment.orderId,
        shipmentId: shipment.id,
        status: shipment.status,
        reason: 'Delivery failed or returned',
      };
      this.orderRabbitClient.emit('shipment.delivery_fail', payload).subscribe();
      this.logger.log(`Emitted shipment.delivery_fail event via RabbitMQ for Order #${orderId}`);
    } else {
      this.orderRabbitClient.emit('shipment.dispatched', {
        orderId: shipment.orderId,
        shipmentId: shipment.id,
        trackingCode: shipment.trackingCode,
      }).subscribe();
    }

    return updated;
  }

  async handleGhnWebhook(payload: any): Promise<any> {
    this.logger.log(`Received GHN Webhook callback: ${JSON.stringify(payload)}`);
    const orderCode = payload?.OrderCode || payload?.order_code;
    const ghnStatus = (payload?.Status || payload?.status || '').toLowerCase();

    if (!orderCode) {
      return { success: false, message: 'Missing OrderCode' };
    }

    const shipment = await this.shipmentRepository.findOne({ where: { trackingCode: orderCode } });
    if (!shipment) {
      this.logger.warn(`GHN Webhook: Shipment with trackingCode ${orderCode} not found`);
      return { success: false, message: 'Shipment not found' };
    }

    if (ghnStatus === 'delivered') {
      shipment.status = ShipmentStatus.DELIVERED;
      await this.shipmentRepository.save(shipment);
      this.orderRabbitClient.emit('shipment.delivered', {
        orderId: shipment.orderId,
        shipmentId: shipment.id,
      }).subscribe();
      this.logger.log(`GHN Webhook: Order #${shipment.orderId} marked as DELIVERED`);
    } else if (ghnStatus === 'delivering' || ghnStatus === 'picked') {
      shipment.status = ShipmentStatus.DELIVERING;
      await this.shipmentRepository.save(shipment);
      this.orderRabbitClient.emit('shipment.dispatched', {
        orderId: shipment.orderId,
        shipmentId: shipment.id,
      }).subscribe();
    }

    return { success: true, trackingCode: orderCode, status: shipment.status };
  }
}
