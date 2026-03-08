export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderItemModifier {
  name: string;
  priceAdjustment: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: OrderItemModifier[];
  itemTotal: number;
}

export interface OrderDetail {
  orderId: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  serviceFee: number;
  total: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderAcceptedResponse {
  orderId: string;
  status: OrderStatus;
  message: string;
}

export interface TimelineEvent {
  eventId: string;
  timestamp: string;
  orderId: string;
  userId: string;
  type: string;
  source: 'api' | 'worker' | 'ui';
  correlationId: string;
  payload: Record<string, unknown>;
}

export interface TimelinePagination {
  page: number;
  pageSize: number;
  totalEvents: number;
  totalPages: number;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  pagination: TimelinePagination;
}
