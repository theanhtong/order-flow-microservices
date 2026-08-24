import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderCreatedEvent } from '@orderflow-microservices/shared';

@Injectable()
export class OrderService {
  private readonly logger = new Logger('OrderService');

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @Inject('RABBITMQ_SERVICE')
    private readonly rabbitClient: ClientProxy,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const totalAmount = createOrderDto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order = this.orderRepository.create({
      customerId: createOrderDto.customerId,
      totalAmount,
      status: OrderStatus.PENDING,
      items: createOrderDto.items.map((item) =>
        this.orderItemRepository.create({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        }),
      ),
    });

    const savedOrder = await this.orderRepository.save(order);

    // Emit order.created event asynchronously to RabbitMQ
    try {
      this.rabbitClient.emit(
        'order.created',
        new OrderCreatedEvent({
          orderId: savedOrder.id,
          customerId: savedOrder.customerId,
          totalAmount: savedOrder.totalAmount,
          items: savedOrder.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: Number(i.price),
          })),
          createdAt: savedOrder.createdAt,
        }),
      );
      this.logger.log(`Emitted order.created event for Order #${savedOrder.id}`);
    } catch (error) {
      this.logger.error(`Failed to emit order.created event for Order #${savedOrder.id}`, error);
    }

    return savedOrder;
  }

  async getOrderById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.getOrderById(id);

    if (order.status === status) {
      throw new BadRequestException(`Order status is already ${status}`);
    }

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED]: [],
    };

    const validNextStates = allowedTransitions[order.status] || [];
    if (!validNextStates.includes(status)) {
      throw new BadRequestException(
        `Cannot transition order status from ${order.status} to ${status}`,
      );
    }

    order.status = status;
    return await this.orderRepository.save(order);
  }

  async findAllOrders(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}
