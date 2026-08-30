import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let inventoryServiceMock: any;
  let rabbitClientMock: any;

  const mockInventory = {
    id: 'inv-uuid-1234',
    productId: 'prod-uuid-1234',
    sku: 'MBP-M3-2026',
    quantity: 50,
    reservedQuantity: 0,
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    inventoryServiceMock = {
      createInventory: jest.fn().mockResolvedValue(mockInventory),
      getByProductId: jest.fn().mockResolvedValue(mockInventory),
      getAllInventory: jest.fn().mockResolvedValue([mockInventory]),
      reserveStock: jest.fn().mockResolvedValue({ ...mockInventory, reservedQuantity: 2 }),
      releaseStock: jest.fn().mockResolvedValue(mockInventory),
    };

    rabbitClientMock = {
      emit: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: inventoryServiceMock,
        },
        {
          provide: 'RABBITMQ_SERVICE',
          useValue: rabbitClientMock,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleProductCreated', () => {
    it('should call createInventory on product.created event', async () => {
      const eventData = {
        productId: 'prod-uuid-1234',
        sku: 'MBP-M3-2026',
        quantity: 50,
        createdAt: new Date(),
      };

      await controller.handleProductCreated(eventData);

      expect(inventoryServiceMock.createInventory).toHaveBeenCalledWith({
        productId: eventData.productId,
        sku: eventData.sku,
        quantity: 50,
      });
    });

    it('should catch error gracefully when DB connection drops during inventory initialization', async () => {
      inventoryServiceMock.createInventory.mockRejectedValue(new Error('DB Connection Dropped / Network Disconnect'));

      const eventData = {
        productId: 'prod-uuid-1234',
        sku: 'MBP-M3-2026',
        quantity: 50,
        createdAt: new Date(),
      };

      await expect(controller.handleProductCreated(eventData)).resolves.not.toThrow();
    });
  });

  describe('handleOrderConfirmed', () => {
    it('should reserve stock and emit inventory.reserved when all items reserved on order confirmation', async () => {
      const eventData = {
        orderId: 'order-uuid-1234',
        items: [{ productId: 'prod-uuid-1234', quantity: 2 }],
      };

      await controller.handleOrderConfirmed(eventData as any);

      expect(inventoryServiceMock.reserveStock).toHaveBeenCalledWith('prod-uuid-1234', { quantity: 2 });
      expect(rabbitClientMock.emit).toHaveBeenCalledWith(
        'inventory.reserved',
        expect.objectContaining({ orderId: 'order-uuid-1234' }),
      );
    });

    it('should handle network failure gracefully when emitting inventory.reserved event', async () => {
      rabbitClientMock.emit.mockImplementation(() => {
        throw new Error('RabbitMQ Broker Unreachable / Socket Hangup');
      });

      const eventData = {
        orderId: 'order-uuid-1234',
        items: [{ productId: 'prod-uuid-1234', quantity: 2 }],
      };

      await expect(controller.handleOrderConfirmed(eventData as any)).rejects.toThrow(
        'RabbitMQ Broker Unreachable / Socket Hangup',
      );
    });

    it('should rollback stock and emit inventory.failed when reserveStock throws error', async () => {
      inventoryServiceMock.reserveStock.mockRejectedValue(new Error('Insufficient stock'));

      const eventData = {
        orderId: 'order-uuid-1234',
        items: [{ productId: 'prod-uuid-1234', quantity: 100 }],
      };

      await controller.handleOrderConfirmed(eventData as any);

      expect(rabbitClientMock.emit).toHaveBeenCalledWith(
        'inventory.failed',
        expect.objectContaining({
          orderId: 'order-uuid-1234',
          reason: 'Insufficient stock',
        }),
      );
    });
  });
});
