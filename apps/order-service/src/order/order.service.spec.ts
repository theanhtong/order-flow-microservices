import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

import { OrderStatusHistory } from './entities/order-status-history.entity';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepositoryMock: any;
  let orderItemRepositoryMock: any;
  let statusHistoryRepositoryMock: any;
  let dataSourceMock: any;
  let entityManagerMock: any;

  const mockOrder: Order = {
    id: 'order-uuid-1234',
    customerId: 'cust-uuid-1234',
    totalAmount: 4999.98,
    status: OrderStatus.PENDING,
    items: [
      {
        id: 'item-1',
        orderId: 'order-uuid-1234',
        productId: 'prod-uuid-1234',
        quantity: 2,
        price: 2499.99,
      } as OrderItem,
    ],
    statusHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    entityManagerMock = {
      create: jest.fn((entity, dto) => ({ id: 'new-id', ...dto })),
      save: jest.fn((entity, data) => Promise.resolve({ id: 'order-uuid-1234', ...data })),
    };

    dataSourceMock = {
      transaction: jest.fn((cb) => cb(entityManagerMock)),
    };

    orderRepositoryMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((order) => Promise.resolve(order)),
    };

    orderItemRepositoryMock = {
      create: jest.fn(),
      save: jest.fn(),
    };

    statusHistoryRepositoryMock = {
      create: jest.fn((dto) => dto),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepositoryMock,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: orderItemRepositoryMock,
        },
        {
          provide: getRepositoryToken(OrderStatusHistory),
          useValue: statusHistoryRepositoryMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create order and outbox message in atomic transaction', async () => {
      const dto = {
        customerId: 'cust-uuid-1234',
        items: [{ productId: 'prod-uuid-1234', quantity: 2, price: 2499.99 }],
      };

      const result = await service.createOrder(dto);

      expect(dataSourceMock.transaction).toHaveBeenCalled();
      expect(entityManagerMock.create).toHaveBeenCalledTimes(3); // Order, OrderItem, OutboxMessage
      expect(entityManagerMock.save).toHaveBeenCalledTimes(2); // Order, OutboxMessage
      expect(result.totalAmount).toBe(4999.98);
      expect(result.status).toBe(OrderStatus.PENDING);
    });

    it('should rollback transaction if database error occurs during order creation', async () => {
      dataSourceMock.transaction.mockRejectedValue(new Error('Transaction Failed'));

      const dto = {
        customerId: 'cust-uuid-1234',
        items: [{ productId: 'prod-uuid-1234', quantity: 2, price: 2499.99 }],
      };

      await expect(service.createOrder(dto)).rejects.toThrow('Transaction Failed');
    });
  });

  describe('getOrderById', () => {
    it('should return order details when valid UUID is provided', async () => {
      orderRepositoryMock.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrderById(mockOrder.id);

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order ID is not found', async () => {
      orderRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.getOrderById('invalid-order-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status from PENDING to CONFIRMED', async () => {
      const currentOrder = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepositoryMock.findOne.mockResolvedValue(currentOrder);

      const result = await service.updateOrderStatus(mockOrder.id, OrderStatus.CONFIRMED);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(orderRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CONFIRMED }),
      );
    });

    it('should update order status from PENDING to CANCELLED', async () => {
      const currentOrder = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepositoryMock.findOne.mockResolvedValue(currentOrder);

      const result = await service.updateOrderStatus(mockOrder.id, OrderStatus.CANCELLED);

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw BadRequestException if transition is invalid (CANCELLED -> CONFIRMED)', async () => {
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };
      orderRepositoryMock.findOne.mockResolvedValue(cancelledOrder);

      await expect(
        service.updateOrderStatus(mockOrder.id, OrderStatus.CONFIRMED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transitioning to the exact same status', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepositoryMock.findOne.mockResolvedValue(pendingOrder);

      await expect(
        service.updateOrderStatus(mockOrder.id, OrderStatus.PENDING),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
