export class PaymentCompletedEvent {
  orderId: string;
  paymentId: string;
  transactionId: string;
  amount: number;

  constructor(partial: Partial<PaymentCompletedEvent>) {
    Object.assign(this, partial);
  }
}
