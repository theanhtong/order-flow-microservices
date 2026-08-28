import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

describe('ProductController', () => {
  let controller: ProductController;
  let productServiceMock: any;

  const mockProduct = {
    id: 'prod-uuid-1234',
    name: 'MacBook Pro M3',
    sku: 'MBP-M3-2026',
    price: 2499.99,
    description: 'High performance laptop',
    isActive: true,
  };

  beforeEach(async () => {
    productServiceMock = {
      createProduct: jest.fn().mockResolvedValue(mockProduct),
      getAllProducts: jest.fn().mockResolvedValue([mockProduct]),
      getProductById: jest.fn().mockResolvedValue(mockProduct),
      updateProduct: jest.fn().mockResolvedValue(mockProduct),
      deleteProduct: jest.fn().mockResolvedValue({ ...mockProduct, isActive: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: productServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProduct', () => {
    it('should delegate product creation to service', async () => {
      const dto = {
        name: 'MacBook Pro M3',
        sku: 'MBP-M3-2026',
        price: 2499.99,
        quantity: 50,
      };

      const result = await controller.createProduct(dto);

      expect(productServiceMock.createProduct).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('getProductById', () => {
    it('should return product by UUID', async () => {
      const result = await controller.getProductById(mockProduct.id);

      expect(productServiceMock.getProductById).toHaveBeenCalledWith(mockProduct.id);
      expect(result).toEqual(mockProduct);
    });
  });
});
