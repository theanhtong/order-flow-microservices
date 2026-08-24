import { Controller, Post, Get, Patch, Body, Param, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto, UpdateStockDto, DeductStockDto, ReserveStockDto } from './dto';
import { Inventory } from './entities/inventory.entity';
import { OrderCreatedEvent } from '@orderflow-microservices/shared';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  private readonly logger = new Logger('InventoryController');

  constructor(private readonly inventoryService: InventoryService) {}

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: OrderCreatedEvent) {
    this.logger.log(`Received order.created event for Order #${data.orderId}`);
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        try {
          await this.inventoryService.reserveStock(item.productId, { quantity: item.quantity });
          this.logger.log(`Automatically reserved ${item.quantity} units for product ${item.productId}`);
        } catch (error) {
          this.logger.error(`Failed to reserve stock for product ${item.productId}: ${error.message}`);
        }
      }
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new inventory record for product' })
  @ApiResponse({ status: 201, description: 'Inventory created', type: Inventory })
  async createInventory(@Body() dto: CreateInventoryDto): Promise<Inventory> {
    return await this.inventoryService.createInventory(dto);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get inventory by Product ID' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Inventory record', type: Inventory })
  async getByProductId(@Param('productId') productId: string): Promise<Inventory> {
    return await this.inventoryService.getByProductId(productId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiResponse({ status: 200, description: 'List of inventory items', type: [Inventory] })
  async getAllInventory(): Promise<Inventory[]> {
    return await this.inventoryService.getAllInventory();
  }

  @Patch(':productId/stock')
  @ApiOperation({ summary: 'Update product stock quantity' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Updated inventory', type: Inventory })
  async updateStock(
    @Param('productId') productId: string,
    @Body() dto: UpdateStockDto,
  ): Promise<Inventory> {
    return await this.inventoryService.updateStock(productId, dto);
  }

  @Post(':productId/deduct')
  @ApiOperation({ summary: 'Deduct stock quantity for product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Deducted inventory record', type: Inventory })
  async deductStock(
    @Param('productId') productId: string,
    @Body() dto: DeductStockDto,
  ): Promise<Inventory> {
    return await this.inventoryService.deductStock(productId, dto);
  }

  @Post(':productId/reserve')
  @ApiOperation({ summary: 'Reserve stock quantity for order' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Reserved inventory record', type: Inventory })
  async reserveStock(
    @Param('productId') productId: string,
    @Body() dto: ReserveStockDto,
  ): Promise<Inventory> {
    return await this.inventoryService.reserveStock(productId, dto);
  }

  @Post(':productId/release')
  @ApiOperation({ summary: 'Release reserved stock quantity' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Released inventory record', type: Inventory })
  async releaseStock(
    @Param('productId') productId: string,
    @Body() dto: ReserveStockDto,
  ): Promise<Inventory> {
    return await this.inventoryService.releaseStock(productId, dto);
  }
}
