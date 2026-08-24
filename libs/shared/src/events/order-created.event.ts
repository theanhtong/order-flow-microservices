export class OrderCreatedEvent {
  orderId: string;
  customerId: string;
  totalAmount: number;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  createdAt: Date;

  constructor(partial: Partial<OrderCreatedEvent>) {
    Object.assign(this, partial);
  }
}
