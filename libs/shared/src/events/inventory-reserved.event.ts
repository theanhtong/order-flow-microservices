export class InventoryReservedEvent {
  orderId: string;
  reservedAt: Date;

  constructor(partial: Partial<InventoryReservedEvent>) {
    Object.assign(this, partial);
    this.reservedAt = partial.reservedAt || new Date();
  }
}
