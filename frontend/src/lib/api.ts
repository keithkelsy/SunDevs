import type { MenuResponse } from '@/types/menu';
import type { OrderAcceptedResponse, OrderDetail, TimelineResponse } from '@/types/order';
import type { CartItem } from '@/types/cart';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json() as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export async function fetchMenu(): Promise<MenuResponse> {
  const res = await fetch(`${API_URL}/menu`);
  return handleResponse<MenuResponse>(res);
}

export async function placeOrder(
  items: CartItem[],
  idempotencyKey: string,
): Promise<OrderAcceptedResponse> {
  const body = {
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      ...(Object.keys(item.selectedModifiers).length > 0
        ? { selectedModifiers: item.selectedModifiers }
        : {}),
    })),
  };

  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'X-User-Id': 'user-default',
    },
    body: JSON.stringify(body),
  });

  return handleResponse<OrderAcceptedResponse>(res);
}

export async function fetchOrder(orderId: string): Promise<OrderDetail> {
  const res = await fetch(`${API_URL}/orders/${orderId}`);
  return handleResponse<OrderDetail>(res);
}

export async function fetchTimeline(
  orderId: string,
  page = 1,
  pageSize = 50,
): Promise<TimelineResponse> {
  const res = await fetch(
    `${API_URL}/orders/${orderId}/timeline?page=${page}&pageSize=${pageSize}`,
  );
  return handleResponse<TimelineResponse>(res);
}

export { ApiError };
