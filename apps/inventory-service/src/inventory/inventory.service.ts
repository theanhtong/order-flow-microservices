import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { CreateInventoryDto, UpdateStockDto, DeductStockDto, ReserveStockDto } from './dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
  ) { }

  async createInventory(dto: CreateInventoryDto): Promise<Inventory> {
    const existing = await this.inventoryRepository.findOne({
      where: [{ productId: dto.productId }, { sku: dto.sku }],
    });

    if (existing) {
      throw new BadRequestException(`Inventory already exists for product ${dto.productId} or SKU ${dto.sku}`);
    }

    const inventory = this.inventoryRepository.create(dto);
    return await this.inventoryRepository.save(inventory);
  }

  async getByProductId(productId: string): Promise<Inventory> {
    let inventory = await this.inventoryRepository.findOne({ where: { productId } });
    if (!inventory) {
      inventory = this.inventoryRepository.create({
        productId,
        sku: `SKU-${productId.substring(0, 8)}`,
        quantity: 50,
        reservedQuantity: 0,
      });
      inventory = await this.inventoryRepository.save(inventory);
    }
    return inventory;
  }

  async getAllInventory(): Promise<Inventory[]> {
    return await this.inventoryRepository.find({ order: { createdAt: 'DESC' } });
  }

  async updateStock(productId: string, dto: UpdateStockDto): Promise<Inventory> {
    const inventory = await this.getByProductId(productId);
    const newQuantity = inventory.quantity + dto.quantityDelta;

    if (newQuantity < 0) {
      throw new BadRequestException(`Insufficient stock. Current quantity: ${inventory.quantity}`);
    }

    inventory.quantity = newQuantity;
    return await this.inventoryRepository.save(inventory);
  }

  async deductStock(productId: string, dto: DeductStockDto): Promise<Inventory> {
    const inventory = await this.getByProductId(productId);

    if (inventory.quantity < dto.quantity) {
      throw new BadRequestException(
        `Cannot deduct ${dto.quantity} items for product ${productId}. Current stock: ${inventory.quantity}`,
      );
    }

    inventory.quantity -= dto.quantity;
    if (inventory.reservedQuantity >= dto.quantity) {
      inventory.reservedQuantity -= dto.quantity;
    } else {
      inventory.reservedQuantity = 0;
    }

    return await this.inventoryRepository.save(inventory);
  }

  async reserveStock(productId: string, dto: ReserveStockDto): Promise<Inventory> {
    const inventory = await this.getByProductId(productId);
    const availableStock = inventory.quantity - inventory.reservedQuantity;

    if (availableStock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient available stock for product ${productId}. Available: ${availableStock}, Requested: ${dto.quantity}`,
      );
    }

    inventory.reservedQuantity += dto.quantity;
    return await this.inventoryRepository.save(inventory);
  }

  async releaseStock(productId: string, dto: ReserveStockDto): Promise<Inventory> {
    const inventory = await this.getByProductId(productId);

    inventory.reservedQuantity = Math.max(0, inventory.reservedQuantity - dto.quantity);
    return await this.inventoryRepository.save(inventory);
  }
}
