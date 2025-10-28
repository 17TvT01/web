import { API_BASE_URL } from '@shared/config/env';

export interface OrderItemPayload {
  product_id: number;
  quantity: number;
  selected_options?: unknown;
}

export interface CreateOrderPayload {
  customer_name: string;
  items: OrderItemPayload[];
  total_price: number;
  order_type?: string;
  payment_method?: string;
  table_number?: string | number | null;
  needs_assistance?: boolean;
  note?: string;
  customer_email?: string;
  email_receipt?: boolean;
  payment_status?: string;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
    throw new Error(message);
  }
  return data as T;
};

export const fetchOrders = async (status?: string) => {
  const url = new URL(`${API_BASE_URL}/orders`);
  if (status) {
    url.searchParams.append('status', status);
  }
  const response = await fetch(url.toString());
  return handleResponse<unknown[]>(response);
};

export const createOrder = async (payload: CreateOrderPayload) => {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<{ order_id: number; table_number?: string }>(response);
};

export const updateOrderStatus = async (orderId: number, status: string) => {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });
  return handleResponse<{ message: string }>(response);
};

export const deleteOrder = async (orderId: number) => {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    method: 'DELETE'
  });
  return handleResponse<{ message: string }>(response);
};
