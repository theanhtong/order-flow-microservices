import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AddCartItemDto } from './dto/add-cart-item.dto';

export interface RedisCartItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

@Injectable()
export class CartService implements OnModuleDestroy {
  private readonly logger = new Logger(CartService.name);
  private readonly redisClient: Redis;
  private readonly ttlSeconds = 30 * 24 * 60 * 60; // 30 days TTL

  constructor(private readonly configService: ConfigService) {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'redis');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.redisClient.on('connect', () => {
      this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
    });

    this.redisClient.on('error', (err) => {
      this.logger.error(`Redis Error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }

  private getCartKey(identifier: string): string {
    return `cart:${identifier}`;
  }

  /**
   * Get all cart items from Redis for an identifier (userId or guestId)
   */
  async getCart(identifier: string): Promise<RedisCartItem[]> {
    const key = this.getCartKey(identifier);
    const data = await this.redisClient.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return [];
    }

    return Object.values(data).map((raw) => JSON.parse(raw) as RedisCartItem);
  }

  /**
   * Add or update quantity of an item in Redis
   */
  async addItem(identifier: string, dto: AddCartItemDto): Promise<RedisCartItem[]> {
    const key = this.getCartKey(identifier);
    const existingRaw = await this.redisClient.hget(key, dto.productId);

    let quantity = dto.quantity;
    if (existingRaw) {
      const existingItem = JSON.parse(existingRaw) as RedisCartItem;
      quantity += existingItem.quantity;
    }

    const itemToSave: RedisCartItem = {
      productId: dto.productId,
      sku: dto.sku,
      name: dto.name,
      price: dto.price,
      quantity,
      category: dto.category,
    };

    await this.redisClient.hset(key, dto.productId, JSON.stringify(itemToSave));
    await this.redisClient.expire(key, this.ttlSeconds);

    return this.getCart(identifier);
  }

  /**
   * Remove a single item from Redis cart
   */
  async removeItem(identifier: string, productId: string): Promise<RedisCartItem[]> {
    const key = this.getCartKey(identifier);
    await this.redisClient.hdel(key, productId);
    return this.getCart(identifier);
  }

  /**
   * Clear all items in Redis cart
   */
  async clearCart(identifier: string): Promise<void> {
    const key = this.getCartKey(identifier);
    await this.redisClient.del(key);
  }

  /**
   * Merge guest items into logged in user Redis cart and delete guest cart immediately
   */
  async mergeCart(
    userId: string,
    guestItems?: AddCartItemDto[],
    guestId?: string,
  ): Promise<RedisCartItem[]> {
    // 1. Merge items from guestId Redis store if guestId is provided
    if (guestId) {
      const existingGuestItems = await this.getCart(guestId);
      for (const item of existingGuestItems) {
        await this.addItem(userId, {
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
        });
      }
      // Single-use cleanup: Immediately delete guest cart from Redis
      await this.clearCart(guestId);
      this.logger.log(`Merged and deleted guest cart for guestId: ${guestId} into userId: ${userId}`);
    }

    // 2. Merge any guest items array passed in payload
    if (guestItems && guestItems.length > 0) {
      for (const item of guestItems) {
        await this.addItem(userId, item);
      }
    }

    return this.getCart(userId);
  }
}
