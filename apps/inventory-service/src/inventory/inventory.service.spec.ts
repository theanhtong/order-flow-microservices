import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Inventory } from './entities/inventory.entity';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepositoryMock: any;

  const mockInventory: Inventory = {
    id: 'inv-uuid-1234',
    productId: 'prod-uuid-1234',
    sku: 'MBP-M3-2026',
    quantity: 50,
    reservedQuantity: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    inventoryRepositoryMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ id: 'inv-uuid-1234', reservedQuantity: 0, ...dto })),
      save: jest.fn((inv) => Promise.resolve(inv)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(Inventory),
          useValue: inventoryRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInventory', () => {
    it('should create inventory record for new product', async () => {
      inventoryRepositoryMock.findOne.mockResolvedValue(null);

      const dto = {
        productId: mockInventory.productId,
        sku: mockInventory.sku,
        quantity: 50,
      };

      const result = await service.createInventory(dto);

      expect(inventoryRepositoryMock.save).toHaveBeenCalled();
      expect(result.productId).toBe(dto.productId);
    });

    it('should throw BadRequestException if inventory already exists', async () => {
      inventoryRepositoryMock.findOne.mockResolvedValue(mockInventory);

      const dto = {
        productId: mockInventory.productId,
        sku: mockInventory.sku,
        quantity: 10,
      };

      await expect(service.createInventory(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getByProductId', () => {
    it('should return inventory when product ID exists', async () => {
      inventoryRepositoryMock.findOne.mockResolvedValue(mockInventory);

      const result = await service.getByProductId(mockInventory.productId);

      expect(result).toEqual(mockInventory);
    });

    it('should throw NotFoundException when product ID is invalid', async () => {
      inventoryRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.getByProductId('invalid-prod-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reserveStock', () => {
    it('should reserve requested quantity when available stock is sufficient', async () => {
      const currentStock = { ...mockInventory, quantity: 50, reservedQuantity: 2 };
      inventoryRepositoryMock.findOne.mockResolvedValue(currentStock);

      const result = await service.reserveStock(mockInventory.productId, { quantity: 5 });

      expect(currentStock.reservedQuantity).toBe(7);
      expect(inventoryRepositoryMock.save).toHaveBeenCalledWith(currentStock);
    });

    it('should throw BadRequestException when available stock is insufficient', async () => {
      const currentStock = { ...mockInventory, quantity: 5, reservedQuantity: 4 }; // Available: 1
      inventoryRepositoryMock.findOne.mockResolvedValue(currentStock);

      await expect(
        service.reserveStock(mockInventory.productId, { quantity: 3 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseStock', () => {
    it('should decrease reserved stock and clamp to minimum 0', async () => {
      const currentStock = { ...mockInventory, reservedQuantity: 5 };
      inventoryRepositoryMock.findOne.mockResolvedValue(currentStock);

      await service.releaseStock(mockInventory.productId, { quantity: 3 });

      expect(currentStock.reservedQuantity).toBe(2);

      await service.releaseStock(mockInventory.productId, { quantity: 10 });
      expect(currentStock.reservedQuantity).toBe(0);
    });
  });
});
