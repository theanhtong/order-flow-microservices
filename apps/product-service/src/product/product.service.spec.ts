import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';

describe('ProductService', () => {
  let service: ProductService;
  let productRepositoryMock: any;
  let rabbitClientMock: any;
  let redisClientMock: any;

  const mockProduct: Product = {
    id: 'prod-uuid-1234',
    name: 'MacBook Pro M3',
    sku: 'MBP-M3-2026',
    price: 2499.99,
    description: 'High performance laptop',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductJson = JSON.parse(JSON.stringify(mockProduct));

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    productRepositoryMock = {
      create: jest.fn((dto) => ({ id: 'prod-uuid-1234', ...dto })),
      save: jest.fn((prod) => Promise.resolve(prod)),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    rabbitClientMock = {
      emit: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    };

    redisClientMock = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: productRepositoryMock,
        },
        {
          provide: 'RABBITMQ_SERVICE',
          useValue: rabbitClientMock,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: redisClientMock,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProduct', () => {
    it('should create product, invalidate Redis cache, and emit product.created RMQ event', async () => {
      productRepositoryMock.findOne.mockResolvedValue(null);

      const dto = {
        name: mockProduct.name,
        sku: mockProduct.sku,
        price: mockProduct.price,
        description: mockProduct.description,
        quantity: 50,
      };

      const result = await service.createProduct(dto);

      expect(productRepositoryMock.save).toHaveBeenCalled();
      expect(redisClientMock.del).toHaveBeenCalledWith('products:all');
      expect(rabbitClientMock.emit).toHaveBeenCalledWith(
        'product.created',
        expect.objectContaining({
          productId: result.id,
          sku: dto.sku,
          quantity: dto.quantity,
        }),
      );
      expect(result.name).toBe(dto.name);
    });

    it('should handle RabbitMQ network disconnect gracefully when emitting product.created event', async () => {
      productRepositoryMock.findOne.mockResolvedValue(null);
      rabbitClientMock.emit.mockImplementation(() => {
        throw new Error('RabbitMQ Broker Disconnected / Timeout');
      });

      const dto = {
        name: mockProduct.name,
        sku: mockProduct.sku,
        price: mockProduct.price,
        description: mockProduct.description,
        quantity: 50,
      };

      const result = await service.createProduct(dto);

      expect(productRepositoryMock.save).toHaveBeenCalled();
      expect(result.name).toBe(dto.name);
    });

    it('should throw BadRequestException if product SKU already exists', async () => {
      productRepositoryMock.findOne.mockResolvedValue(mockProduct);

      const dto = {
        name: 'Duplicate SKU Product',
        sku: mockProduct.sku,
        price: 100,
        quantity: 10,
      };

      await expect(service.createProduct(dto)).rejects.toThrow(BadRequestException);
      expect(rabbitClientMock.emit).not.toHaveBeenCalled();
    });

    it('should prevent event emission if database save throws error', async () => {
      productRepositoryMock.findOne.mockResolvedValue(null);
      productRepositoryMock.save.mockRejectedValue(new Error('Database Connection Error'));

      const dto = {
        name: 'Faulty Product',
        sku: 'FAULTY-01',
        price: 99.99,
        quantity: 5,
      };

      await expect(service.createProduct(dto)).rejects.toThrow('Database Connection Error');
      expect(rabbitClientMock.emit).not.toHaveBeenCalled();
    });
  });

  describe('getProductById with Redis Caching', () => {
    it('should serve Product from Redis cache when CACHE HIT', async () => {
      redisClientMock.get.mockResolvedValue(JSON.stringify(mockProductJson));

      const result = await service.getProductById(mockProduct.id);

      expect(redisClientMock.get).toHaveBeenCalledWith(`products:${mockProduct.id}`);
      expect(productRepositoryMock.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(mockProductJson);
    });

    it('should fetch from Postgres DB and set Redis cache when CACHE MISS', async () => {
      redisClientMock.get.mockResolvedValue(null);
      productRepositoryMock.findOne.mockResolvedValue(mockProduct);

      const result = await service.getProductById(mockProduct.id);

      expect(productRepositoryMock.findOne).toHaveBeenCalledWith({ where: { id: mockProduct.id } });
      expect(redisClientMock.setex).toHaveBeenCalledWith(
        `products:${mockProduct.id}`,
        60,
        JSON.stringify(mockProduct),
      );
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product ID does not exist in DB on CACHE MISS', async () => {
      redisClientMock.get.mockResolvedValue(null);
      productRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.getProductById('invalid-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllProducts with Redis Caching', () => {
    it('should serve products array from Redis cache when CACHE HIT', async () => {
      redisClientMock.get.mockResolvedValue(JSON.stringify([mockProductJson]));

      const result = await service.getAllProducts();

      expect(redisClientMock.get).toHaveBeenCalledWith('products:all');
      expect(productRepositoryMock.find).not.toHaveBeenCalled();
      expect(result).toEqual([mockProductJson]);
    });

    it('should query Postgres DB and set Redis cache when CACHE MISS', async () => {
      redisClientMock.get.mockResolvedValue(null);
      productRepositoryMock.find.mockResolvedValue([mockProduct]);

      const result = await service.getAllProducts();

      expect(productRepositoryMock.find).toHaveBeenCalled();
      expect(redisClientMock.setex).toHaveBeenCalledWith('products:all', 60, JSON.stringify([mockProduct]));
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete product and invalidate Redis cache keys', async () => {
      redisClientMock.get.mockResolvedValue(JSON.stringify(mockProductJson));
      productRepositoryMock.findOne.mockResolvedValue({ ...mockProduct });

      const result = await service.deleteProduct(mockProduct.id);

      expect(productRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(redisClientMock.del).toHaveBeenCalledWith('products:all');
      expect(redisClientMock.del).toHaveBeenCalledWith(`products:${mockProduct.id}`);
      expect(result.isActive).toBe(false);
    });
  });
});
