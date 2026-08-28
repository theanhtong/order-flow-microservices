import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentStatus, PaymentMethod } from './entities/payment.entity';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentServiceMock: any;

  const mockPayment = {
    id: 'pay-uuid-1234',
    orderId: 'order-uuid-1234',
    customerId: 'cust-uuid-1234',
    amount: 4999.98,
    paymentMethod: PaymentMethod.VNPAY,
    status: PaymentStatus.PENDING,
    transactionId: 'TXN-123456',
  };

  beforeEach(async () => {
    paymentServiceMock = {
      createCheckoutSession: jest.fn().mockResolvedValue(mockPayment),
      handleWebhook: jest.fn().mockResolvedValue({ message: 'Payment processed', payment: mockPayment }),
      getPaymentByOrderId: jest.fn().mockResolvedValue(mockPayment),
      refundPayment: jest.fn().mockResolvedValue({ ...mockPayment, status: PaymentStatus.REFUNDED }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: paymentServiceMock,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckout', () => {
    it('should delegate checkout session creation to service', async () => {
      const dto = {
        orderId: 'order-uuid-1234',
        amount: 4999.98,
        paymentMethod: PaymentMethod.VNPAY,
      };

      const result = await controller.createCheckout(dto, 'user-uuid');

      expect(paymentServiceMock.createCheckoutSession).toHaveBeenCalledWith('user-uuid', dto);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('handleWebhook', () => {
    it('should delegate webhook callback to service', async () => {
      const dto = {
        transactionId: 'TXN-123456',
        status: 'SUCCESS' as const,
      };

      const result = await controller.handleWebhook(dto);

      expect(paymentServiceMock.handleWebhook).toHaveBeenCalledWith(dto);
      expect(result.message).toBe('Payment processed');
    });
  });

  describe('refundPayment', () => {
    it('should delegate admin refund request to service', async () => {
      const result = await controller.refundPayment('pay-uuid-1234');

      expect(paymentServiceMock.refundPayment).toHaveBeenCalledWith('pay-uuid-1234');
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });
  });
});
