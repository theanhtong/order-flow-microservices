import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OutboxMessage, OutboxStatus } from '../outbox/outbox-message.entity';
import { OrderCreatedEvent } from '@orderflow-microservices/shared';

@Injectable()
export class OrderService {
  private readonly logger = new Logger('OrderService');

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private readonly statusHistoryRepository: Repository<OrderStatusHistory>,
    private readonly dataSource: DataSource,
  ) { }

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const totalAmount = createOrderDto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    return await this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        customerId: createOrderDto.customerId,
        totalAmount,
        status: OrderStatus.PENDING,
        items: createOrderDto.items.map((item) =>
          manager.create(OrderItem, {
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          }),
        ),
      });

      const savedOrder = await manager.save(Order, order);

      const initialHistory = manager.create(OrderStatusHistory, {
        orderId: savedOrder.id,
        status: OrderStatus.PENDING,
      });
      await manager.save(OrderStatusHistory, initialHistory);

      const outboxPayload = new OrderCreatedEvent({
        orderId: savedOrder.id,
        customerId: savedOrder.customerId,
        totalAmount: savedOrder.totalAmount,
        items: savedOrder.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: Number(i.price),
        })),
        createdAt: savedOrder.createdAt,
      });

      const outboxMessage = manager.create(OutboxMessage, {
        aggregateType: 'Order',
        aggregateId: savedOrder.id,
        eventType: 'order.created',
        payload: { ...outboxPayload },
        status: OutboxStatus.PENDING,
      });

      await manager.save(OutboxMessage, outboxMessage);

      this.logger.log(
        `Created Order #${savedOrder.id} and status history in a single atomic database transaction`,
      );

      return savedOrder;
    });
  }

  async getOrderById(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'statusHistory'],
      order: {
        statusHistory: {
          createdAt: 'ASC',
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus, cancelReason?: string): Promise<Order> {
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
    if (cancelReason !== undefined) {
      order.cancelReason = cancelReason;
    }
    const savedOrder = await this.orderRepository.save(order);

    const newHistory = this.statusHistoryRepository.create({
      orderId: savedOrder.id,
      status,
    });
    await this.statusHistoryRepository.save(newHistory);

    return await this.getOrderById(savedOrder.id);
  }

  async findAllOrders(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['items', 'statusHistory'],
      order: {
        createdAt: 'DESC',
        statusHistory: {
          createdAt: 'ASC',
        },
      },
    });
  }
}
