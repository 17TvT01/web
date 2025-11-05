export interface GuestOrderRecord {
  id: number;
  createdAt: string;
  status?: string;
  totalPrice?: number;
  customerName?: string;
  lastUpdated?: string;
  tableNumber?: string;
  items?: Array<{ product_id?: number; quantity?: number; name?: string }>;
}

const STORAGE_KEY = 'mobile_web_guest_orders';

const isStorageReady = (): boolean => {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
};

const readStorage = (): GuestOrderRecord[] => {
  if (!isStorageReady()) {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(item => typeof item?.id === 'number');
  } catch {
    return [];
  }
};

const writeStorage = (orders: GuestOrderRecord[]) => {
  if (!isStorageReady()) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Ignore quota or serialization errors
  }
};

export const getGuestOrders = (): GuestOrderRecord[] => {
  return readStorage();
};

export const saveGuestOrders = (orders: GuestOrderRecord[]): void => {
  writeStorage(orders);
};

export const addGuestOrder = (order: GuestOrderRecord): GuestOrderRecord[] => {
  const existing = readStorage();
  const filtered = existing.filter(item => item.id !== order.id);
  const updated = [{ ...order }, ...filtered].slice(0, 20); // keep latest 20
  writeStorage(updated);
  return updated;
};

export const updateGuestOrder = (
  id: number,
  patch: Partial<GuestOrderRecord>
): GuestOrderRecord[] => {
  const existing = readStorage();
  const updated = existing.map(order => (order.id === id ? { ...order, ...patch } : order));
  writeStorage(updated);
  return updated;
};

export const removeGuestOrder = (id: number): GuestOrderRecord[] => {
  const existing = readStorage();
  const updated = existing.filter(order => order.id !== id);
  writeStorage(updated);
  return updated;
};
