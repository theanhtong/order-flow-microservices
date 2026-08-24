export class InventoryFailedEvent {
  orderId: string;
  reason: string;
  failedAt: Date;

  constructor(partial: Partial<InventoryFailedEvent>) {
    Object.assign(this, partial);
    this.failedAt = partial.failedAt || new Date();
  }
}
