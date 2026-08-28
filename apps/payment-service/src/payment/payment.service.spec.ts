import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepositoryMock: any;
  let orderRabbitClientMock: any;
  let inventoryRabbitClientMock: any;

  const mockPayment: Payment = {
    id: 'pay-uuid-1234',
    orderId: 'order-uuid-1234',
    customerId: 'cust-uuid-1234',
    amount: 4999.98,
    paymentMethod: PaymentMethod.VNPAY,
    status: PaymentStatus.PENDING,
    transactionId: 'TXN-123456',
    paymentUrl: 'http://localhost:3000/api/v1/payments/mock-gateway?txn=TXN-123456',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    paymentRepositoryMock = {
      create: jest.fn((dto) => ({ id: 'pay-uuid-1234', ...dto })),
      save: jest.fn((payment) => Promise.resolve(payment)),
      findOne: jest.fn(),
    };

    orderRabbitClientMock = {
      emit: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    };

    inventoryRabbitClientMock = {
      emit: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentRepositoryMock,
        },
        {
          provide: 'RABBITMQ_ORDER_SERVICE',
          useValue: orderRabbitClientMock,
        },
        {
          provide: 'RABBITMQ_INVENTORY_SERVICE',
          useValue: inventoryRabbitClientMock,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should create a new pending payment checkout session', async () => {
      paymentRepositoryMock.findOne.mockResolvedValue(null);

      const dto = {
        orderId: mockPayment.orderId,
        amount: mockPayment.amount,
        paymentMethod: mockPayment.paymentMethod,
      };

      const result = await service.createCheckoutSession('cust-uuid-1234', dto);

      expect(paymentRepositoryMock.save).toHaveBeenCalled();
      expect(result.orderId).toBe(dto.orderId);
      expect(result.status).toBe(PaymentStatus.PENDING);
    });

    it('should throw BadRequestException if order is already paid', async () => {
      const completedPayment = { ...mockPayment, status: PaymentStatus.COMPLETED };
      paymentRepositoryMock.findOne.mockResolvedValue(completedPayment);

      const dto = {
        orderId: mockPayment.orderId,
        amount: mockPayment.amount,
        paymentMethod: mockPayment.paymentMethod,
      };

      await expect(service.createCheckoutSession('cust-uuid-1234', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleWebhook', () => {
    it('should process SUCCESS webhook and emit payment.completed to order service', async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentRepositoryMock.findOne.mockResolvedValue(pendingPayment);

      const dto = {
        transactionId: 'TXN-123456',
        status: 'SUCCESS' as const,
      };

      const result = await service.handleWebhook(dto);

      expect(result.payment.status).toBe(PaymentStatus.COMPLETED);
      expect(orderRabbitClientMock.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({ orderId: mockPayment.orderId }),
      );
    });

    it('should handle RabbitMQ network disconnect when emitting payment.completed event', async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentRepositoryMock.findOne.mockResolvedValue(pendingPayment);
      orderRabbitClientMock.emit.mockImplementation(() => {
        throw new Error('RabbitMQ Broker Connection Refused');
      });

      const dto = {
        transactionId: 'TXN-123456',
        status: 'SUCCESS' as const,
      };

      await expect(service.handleWebhook(dto)).rejects.toThrow('RabbitMQ Broker Connection Refused');
    });

    it('should process FAILED webhook and emit payment.failed to both order and inventory services', async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentRepositoryMock.findOne.mockResolvedValue(pendingPayment);

      const dto = {
        transactionId: 'TXN-123456',
        status: 'FAILED' as const,
        reason: 'Insufficient balance',
      };

      const result = await service.handleWebhook(dto);

      expect(result.payment.status).toBe(PaymentStatus.FAILED);
      expect(inventoryRabbitClientMock.emit).toHaveBeenCalledWith(
        'payment.failed',
        expect.objectContaining({ orderId: mockPayment.orderId, reason: 'Insufficient balance' }),
      );
      expect(orderRabbitClientMock.emit).toHaveBeenCalledWith(
        'payment.failed',
        expect.objectContaining({ orderId: mockPayment.orderId }),
      );
    });

    it('should throw NotFoundException when transaction ID is not found', async () => {
      paymentRepositoryMock.findOne.mockResolvedValue(null);

      const dto = {
        transactionId: 'INVALID-TXN',
        status: 'SUCCESS' as const,
      };

      await expect(service.handleWebhook(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('refundPayment', () => {
    it('should refund completed payment and emit rollback events', async () => {
      const completedPayment = { ...mockPayment, status: PaymentStatus.COMPLETED };
      paymentRepositoryMock.findOne.mockResolvedValue(completedPayment);

      const result = await service.refundPayment(mockPayment.id);

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(inventoryRabbitClientMock.emit).toHaveBeenCalledWith(
        'payment.failed',
        expect.objectContaining({ orderId: mockPayment.orderId }),
      );
      expect(orderRabbitClientMock.emit).toHaveBeenCalledWith(
        'payment.failed',
        expect.objectContaining({ orderId: mockPayment.orderId }),
      );
    });

    it('should throw BadRequestException if payment status is not COMPLETED', async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentRepositoryMock.findOne.mockResolvedValue(pendingPayment);

      await expect(service.refundPayment(mockPayment.id)).rejects.toThrow(BadRequestException);
    });
  });
});
