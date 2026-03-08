import { OrderStatus } from '../enums/order-status.enum';

/** Shape of an Order document returned by Mongoose .lean() */
export interface OrderPlain {
  _id: unknown;
  userId: string;
  items: OrderItemPlain[];
  status: OrderStatus;
  subtotal: number;
  serviceFee: number;
  total: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemPlain {
  productId: unknown;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: { name: string; priceAdjustment: number }[];
  itemTotal: number;
}

/** GET /orders/:id response shape */
export interface OrderDetailResponse {
  orderId: string;
  userId: string;
  items: OrderItemDetailResponse[];
  status: OrderStatus;
  subtotal: number;
  serviceFee: number;
  total: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemDetailResponse {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: { name: string; priceAdjustment: number }[];
  itemTotal: number;
}

/** POST /orders 202 response shape */
export interface OrderAcceptedResponse {
  orderId: string;
  status: OrderStatus;
  message: string;
}

/** Internal event emitted after order is created */
export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  correlationId: string;
}
