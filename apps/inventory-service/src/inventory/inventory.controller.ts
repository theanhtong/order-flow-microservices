import { Controller, Post, Get, Patch, Body, Param, Logger, Inject } from '@nestjs/common';
import { EventPattern, Payload, ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { UpdateStockDto, DeductStockDto, ReserveStockDto } from './dto';
import { Inventory } from './entities/inventory.entity';
import {
  OrderCreatedEvent,
  ProductCreatedEvent,
  InventoryReservedEvent,
  InventoryFailedEvent,
} from '@orderflow-microservices/shared';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  private readonly logger = new Logger('InventoryController');

  constructor(
    private readonly inventoryService: InventoryService,
    @Inject('RABBITMQ_SERVICE')
    private readonly rabbitClient: ClientProxy,
  ) { }

  @EventPattern('product.created')
  async handleProductCreated(@Payload() data: ProductCreatedEvent) {
    this.logger.log(`Received product.created event for Product #${data.productId}`);
    try {
      await this.inventoryService.createInventory({
        productId: data.productId,
        sku: data.sku,
        quantity: data.quantity ?? 0,
      });
      this.logger.log(`Initialized inventory record for Product #${data.productId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize inventory for Product #${data.productId}: ${error.message}`);
    }
  }

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: OrderCreatedEvent) {
    this.logger.log(`Received order.created event for Order #${data.orderId}`);
    const reservedItems: { productId: string; quantity: number }[] = [];
    let isSuccess = true;
    let failureReason = '';

    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        try {
          await this.inventoryService.reserveStock(item.productId, { quantity: item.quantity });
          reservedItems.push({ productId: item.productId, quantity: item.quantity });
          this.logger.log(`Reserved ${item.quantity} units for product ${item.productId}`);
        } catch (error) {
          isSuccess = false;
          failureReason = error.message;
          this.logger.error(`Failed to reserve stock for product ${item.productId}: ${error.message}`);
          break;
        }
      }
    }

    if (isSuccess) {
      this.rabbitClient.emit(
        'inventory.reserved',
        new InventoryReservedEvent({ orderId: data.orderId }),
      );
      this.logger.log(`Emitted inventory.reserved event for Order #${data.orderId}`);
    } else {
      for (const item of reservedItems) {
        try {
          await this.inventoryService.releaseStock(item.productId, { quantity: item.quantity });
        } catch (rollbackError) {
          this.logger.error(`Failed to rollback stock for product ${item.productId}: ${rollbackError.message}`);
        }
      }

      this.rabbitClient.emit(
        'inventory.failed',
        new InventoryFailedEvent({ orderId: data.orderId, reason: failureReason }),
      );
      this.logger.log(`Emitted inventory.failed event for Order #${data.orderId}. Reason: ${failureReason}`);
    }
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
