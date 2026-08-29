import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private getIdentifier(userId?: string, guestId?: string): string {
    const id = userId || guestId;
    if (!id) {
      throw new BadRequestException('Missing user identity (x-user-id or x-guest-id header required)');
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Get current Redis cart items' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID passed from Gateway' })
  @ApiHeader({ name: 'x-guest-id', required: false, description: 'Guest Session ID' })
  async getCart(
    @Headers('x-user-id') userId?: string,
    @Headers('x-guest-id') guestId?: string,
    @Query('guestId') queryGuestId?: string,
  ) {
    const identifier = this.getIdentifier(userId, guestId || queryGuestId);
    return await this.cartService.getCart(identifier);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add or update item quantity in Redis cart' })
  @ApiHeader({ name: 'x-user-id', required: false })
  @ApiHeader({ name: 'x-guest-id', required: false })
  async addItem(
    @Body() dto: AddCartItemDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-guest-id') guestId?: string,
    @Query('guestId') queryGuestId?: string,
  ) {
    const identifier = this.getIdentifier(userId, guestId || queryGuestId);
    return await this.cartService.addItem(identifier, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove single item from Redis cart' })
  @ApiHeader({ name: 'x-user-id', required: false })
  @ApiHeader({ name: 'x-guest-id', required: false })
  async removeItem(
    @Param('productId') productId: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-guest-id') guestId?: string,
    @Query('guestId') queryGuestId?: string,
  ) {
    const identifier = this.getIdentifier(userId, guestId || queryGuestId);
    return await this.cartService.removeItem(identifier, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items in Redis cart' })
  @ApiHeader({ name: 'x-user-id', required: false })
  @ApiHeader({ name: 'x-guest-id', required: false })
  async clearCart(
    @Headers('x-user-id') userId?: string,
    @Headers('x-guest-id') guestId?: string,
    @Query('guestId') queryGuestId?: string,
  ) {
    const identifier = this.getIdentifier(userId, guestId || queryGuestId);
    await this.cartService.clearCart(identifier);
    return { message: 'Cart cleared successfully' };
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge guest items into logged-in user Redis cart' })
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-guest-id', required: false })
  async mergeCart(
    @Body() dto: MergeCartDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-guest-id') guestId?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('x-user-id header required for cart merge');
    }
    const targetGuestId = dto.guestId || guestId;
    return await this.cartService.mergeCart(userId, dto.guestItems, targetGuestId);
  }
}
