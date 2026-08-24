export class ProductCreatedEvent {
  productId: string;
  sku: string;
  quantity: number;
  createdAt: Date;

  constructor(partial: Partial<ProductCreatedEvent>) {
    Object.assign(this, partial);
    this.createdAt = partial.createdAt || new Date();
  }
}
