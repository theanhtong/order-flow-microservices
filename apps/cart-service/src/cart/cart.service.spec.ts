import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      disconnect: jest.fn(),
      hgetall: jest.fn().mockResolvedValue({}),
      hget: jest.fn().mockResolvedValue(null),
      hset: jest.fn().mockResolvedValue(1),
      hdel: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    })),
  };
});

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty array for non-existent cart', async () => {
    const cart = await service.getCart('user-123');
    expect(cart).toEqual([]);
  });

  it('should add item to cart', async () => {
    const dto: AddCartItemDto = {
      productId: 'prod-1',
      sku: 'SKU-001',
      name: 'Test Product',
      price: 100,
      quantity: 2,
    };

    const cart = await service.addItem('user-123', dto);
    expect(cart).toBeDefined();
  });
});
