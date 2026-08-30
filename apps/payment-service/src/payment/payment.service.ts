import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';
import { CreateCheckoutDto, WebhookCallbackDto } from './dto';
import { PaymentCompletedEvent, PaymentFailedEvent } from '@orderflow-microservices/shared';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger('PaymentService');

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @Inject('RABBITMQ_ORDER_SERVICE')
    private readonly orderRabbitClient: ClientProxy,
    @Inject('RABBITMQ_INVENTORY_SERVICE')
    private readonly inventoryRabbitClient: ClientProxy,
  ) {}

  async createCheckoutSession(customerId: string, dto: CreateCheckoutDto): Promise<Payment> {
    const existing = await this.paymentRepository.findOne({
      where: { orderId: dto.orderId, status: PaymentStatus.COMPLETED },
    });
    if (existing) {
      throw new BadRequestException(`Order #${dto.orderId} is already paid`);
    }

    const transactionId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentUrl = `http://localhost:3000/api/v1/payments/mock-gateway?txn=${transactionId}`;

    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      customerId: customerId || 'guest-customer',
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      status: PaymentStatus.PENDING,
      transactionId,
      paymentUrl,
    });

    const saved = await this.paymentRepository.save(payment);
    this.logger.log(`Created payment checkout session #${saved.id} for Order #${dto.orderId} (Txn: ${transactionId})`);
    return saved;
  }

  async handleWebhook(dto: WebhookCallbackDto): Promise<{ message: string; payment: Payment }> {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: dto.transactionId },
    });

    if (!payment) {
      throw new NotFoundException(`Transaction "${dto.transactionId}" not found`);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return { message: 'Payment was already completed', payment };
    }

    if (dto.status === 'SUCCESS') {
      payment.status = PaymentStatus.COMPLETED;
      const updated = await this.paymentRepository.save(payment);

      this.orderRabbitClient.emit(
        'payment.completed',
        new PaymentCompletedEvent({
          orderId: payment.orderId,
          paymentId: payment.id,
          transactionId: payment.transactionId,
          amount: Number(payment.amount),
        }),
      ).subscribe();

      this.logger.log(`Payment #${payment.id} COMPLETED for Order #${payment.orderId}. Emitted payment.completed event.`);
      return { message: 'Payment processed successfully', payment: updated };
    } else {
      payment.status = PaymentStatus.FAILED;
      const updated = await this.paymentRepository.save(payment);
      const failureReason = dto.reason || 'Payment failed or declined by Gateway';

      this.inventoryRabbitClient.emit(
        'payment.failed',
        new PaymentFailedEvent({
          orderId: payment.orderId,
          paymentId: payment.id,
          reason: failureReason,
        }),
      ).subscribe();

      this.orderRabbitClient.emit(
        'payment.failed',
        new PaymentFailedEvent({
          orderId: payment.orderId,
          paymentId: payment.id,
          reason: failureReason,
        }),
      ).subscribe();

      this.logger.warn(`Payment #${payment.id} FAILED for Order #${payment.orderId}. Emitted payment.failed events to trigger stock release & cancellation.`);
      return { message: 'Payment marked as FAILED and rollback triggered', payment: updated };
    }
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment> {
    let payment = await this.paymentRepository.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
    if (!payment) {
      payment = await this.handleOrderCreated({ orderId });
    }
    if (!payment) {
      throw new NotFoundException(`No payment found for Order ID "${orderId}"`);
    }
    return payment;
  }

  async refundPayment(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Payment #${id} not found`);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(`Cannot refund payment in status "${payment.status}"`);
    }

    payment.status = PaymentStatus.REFUNDED;
    const updated = await this.paymentRepository.save(payment);

    this.inventoryRabbitClient.emit(
      'payment.failed',
      new PaymentFailedEvent({
        orderId: payment.orderId,
        paymentId: payment.id,
        reason: 'Refunded by Admin',
      }),
    ).subscribe();

    this.orderRabbitClient.emit(
      'payment.failed',
      new PaymentFailedEvent({
        orderId: payment.orderId,
        paymentId: payment.id,
        reason: 'Refunded by Admin',
      }),
    ).subscribe();

    this.logger.log(`Refunded Payment #${id} for Order #${payment.orderId}. Triggered stock release and status update.`);
    return updated;
  }

  async handleOrderCreated(payload: any): Promise<Payment | null> {
    const { orderId, customerId, totalAmount, paymentMethod: rawMethod } = payload || {};
    if (!orderId) return null;

    const existing = await this.paymentRepository.findOne({ where: { orderId } });
    if (existing) {
      this.logger.log(`Payment record for Order #${orderId} already exists`);
      return existing;
    }

    let method: PaymentMethod = PaymentMethod.COD;
    const strMethod = String(rawMethod || '').toUpperCase();
    if (strMethod === 'VNPAY') method = PaymentMethod.VNPAY;
    else if (strMethod === 'MOMO') method = PaymentMethod.MOMO;
    else if (strMethod === 'BANK_QR' || strMethod === 'BANK_TRANSFER') method = PaymentMethod.BANK_QR;
    else if (strMethod === 'CREDIT_CARD' || strMethod === 'CARD') method = PaymentMethod.CREDIT_CARD;
    else method = PaymentMethod.COD;

    const isCod = method === PaymentMethod.COD;
    const initialStatus = isCod ? PaymentStatus.PENDING : PaymentStatus.COMPLETED;
    const transactionId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = this.paymentRepository.create({
      orderId,
      customerId: customerId || 'guest-customer',
      amount: totalAmount || 0,
      paymentMethod: method,
      status: initialStatus,
      transactionId,
      paymentUrl: `http://localhost:3000/api/v1/payments/mock-gateway?txn=${transactionId}`,
    });

    const saved = await this.paymentRepository.save(payment);
    this.logger.log(`Auto-created ${method} payment #${saved.id} for Order #${orderId} with status ${initialStatus}`);

    if (initialStatus === PaymentStatus.COMPLETED) {
      this.orderRabbitClient.emit(
        'payment.completed',
        new PaymentCompletedEvent({
          orderId: saved.orderId,
          paymentId: saved.id,
          transactionId: saved.transactionId,
          amount: Number(saved.amount),
        }),
      ).subscribe();
    }

    return saved;
  }

  async handleShipmentDelivered(payload: any): Promise<Payment | null> {
    const { orderId } = payload || {};
    if (!orderId) return null;

    let payment = await this.paymentRepository.findOne({ where: { orderId } });
    if (!payment) {
      payment = await this.handleOrderCreated({ orderId });
    }
    if (!payment) return null;

    if (payment.paymentMethod === PaymentMethod.COD && (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.FAILED)) {
      payment.status = PaymentStatus.COMPLETED;
      const updated = await this.paymentRepository.save(payment);

      this.orderRabbitClient.emit(
        'payment.completed',
        new PaymentCompletedEvent({
          orderId: updated.orderId,
          paymentId: updated.id,
          transactionId: updated.transactionId,
          amount: Number(updated.amount),
        }),
      ).subscribe();

      this.logger.log(`COD Payment #${updated.id} auto-updated to COMPLETED for Order #${orderId} upon delivery`);
      return updated;
    }

    return payment;
  }

  async handleOrderCancelledOrFailed(orderId: string, reason?: string): Promise<Payment | null> {
    if (!orderId) return null;

    let payment = await this.paymentRepository.findOne({ where: { orderId } });
    if (!payment) {
      payment = await this.handleOrderCreated({ orderId });
    }
    if (!payment) return null;

    if (payment.status === PaymentStatus.PENDING) {
      payment.status = PaymentStatus.FAILED;
      const updated = await this.paymentRepository.save(payment);
      this.logger.warn(`Pending payment #${updated.id} marked as FAILED for Order #${orderId} due to: ${reason || 'Cancellation/Delivery Fail'}`);
      return updated;
    } else if (payment.status === PaymentStatus.COMPLETED) {
      payment.status = PaymentStatus.REFUNDED;
      const updated = await this.paymentRepository.save(payment);
      this.logger.log(`Completed payment #${updated.id} auto-REFUNDED for Order #${orderId} due to: ${reason || 'Cancellation/Delivery Fail'}`);
      return updated;
    }

    return payment;
  }
}
