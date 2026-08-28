import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderStatus } from './entities/order.entity';

describe('OrderController', () => {
  let controller: OrderController;
  let orderServiceMock: any;

  const mockOrder = {
    id: 'order-uuid-1234',
    customerId: 'cust-uuid-1234',
    totalAmount: 4999.98,
    status: OrderStatus.PENDING,
    items: [],
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    orderServiceMock = {
      createOrder: jest.fn().mockResolvedValue(mockOrder),
      getOrderById: jest.fn().mockResolvedValue(mockOrder),
      findAllOrders: jest.fn().mockResolvedValue([mockOrder]),
      updateOrderStatus: jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.CONFIRMED }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: orderServiceMock,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleInventoryFailed', () => {
    it('should update order status to CANCELLED on inventory.failed event', async () => {
      const eventData = {
        orderId: 'order-uuid-1234',
        reason: 'Stock insufficient',
        failedAt: new Date(),
      };

      await controller.handleInventoryFailed(eventData);

      expect(orderServiceMock.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1234',
        OrderStatus.CANCELLED,
      );
    });

    it('should catch error gracefully if updateOrderStatus throws exception during network/DB disconnect', async () => {
      orderServiceMock.updateOrderStatus.mockRejectedValue(new Error('Database Connection Lost'));

      const eventData = {
        orderId: 'invalid-order-uuid',
        reason: 'Stock insufficient',
        failedAt: new Date(),
      };

      await expect(controller.handleInventoryFailed(eventData)).resolves.not.toThrow();
    });
  });

  describe('handlePaymentCompleted', () => {
    it('should update order status to CONFIRMED on payment.completed event', async () => {
      const eventData = {
        orderId: 'order-uuid-1234',
        paymentId: 'pay-uuid-1234',
        transactionId: 'TXN-123456',
        amount: 4999.98,
      };

      await controller.handlePaymentCompleted(eventData);

      expect(orderServiceMock.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1234',
        OrderStatus.CONFIRMED,
      );
    });

    it('should catch error gracefully if network or DB connection drops during payment.completed processing', async () => {
      orderServiceMock.updateOrderStatus.mockRejectedValue(new Error('Database Connection Timeout'));

      const eventData = {
        orderId: 'order-uuid-1234',
        paymentId: 'pay-uuid-1234',
        transactionId: 'TXN-123456',
        amount: 4999.98,
      };

      await expect(controller.handlePaymentCompleted(eventData)).resolves.not.toThrow();
    });
  });

  describe('handlePaymentFailed', () => {
    it('should update order status to CANCELLED on payment.failed event', async () => {
      const eventData = {
        orderId: 'order-uuid-1234',
        transactionId: 'TXN-123456',
        reason: 'Card declined',
      };

      await controller.handlePaymentFailed(eventData);

      expect(orderServiceMock.updateOrderStatus).toHaveBeenCalledWith(
        'order-uuid-1234',
        OrderStatus.CANCELLED,
      );
    });

    it('should catch error gracefully if DB drops during payment.failed processing', async () => {
      orderServiceMock.updateOrderStatus.mockRejectedValue(new Error('DB Query Timeout'));

      const eventData = {
        orderId: 'order-uuid-1234',
        transactionId: 'TXN-123456',
        reason: 'Card declined',
      };

      await expect(controller.handlePaymentFailed(eventData)).resolves.not.toThrow();
    });
  });

  describe('createOrder', () => {
    it('should inject header x-user-id as customerId', async () => {
      const dto = {
        customerId: '',
        items: [{ productId: 'prod-uuid-1234', quantity: 2, price: 2499.99 }],
      };

      const result = await controller.createOrder(dto, 'user-header-uuid');

      expect(orderServiceMock.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'user-header-uuid' }),
      );
      expect(result).toEqual(mockOrder);
    });
  });
});
