import { OrderStatus } from '../enums/order-status.enum';

/** Response shape for POST /orders — 202 Accepted */
export class OrderAcceptedResponseDto {
  orderId!: string;
  status!: OrderStatus;
  message!: string;
}
