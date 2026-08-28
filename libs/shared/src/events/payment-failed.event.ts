export class PaymentFailedEvent {
  orderId: string;
  paymentId?: string;
  reason: string;

  constructor(partial: Partial<PaymentFailedEvent>) {
    Object.assign(this, partial);
  }
}
