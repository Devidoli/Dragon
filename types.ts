export type UserRole = 'admin' | 'customer';
export type UserStatus = 'pending' | 'approved';

export interface User {
  id: string;
  email: string;
  phone: string;
  shopName: string;
  address: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  volume: string;
  price: number;
  stock: number;
  image: string;
  unit: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  volume?: string;
}

export type OrderStatus = 'pending' | 'packed' | 'dispatched' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  customerEmail: string;
  shopName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: 'COD';
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'qr' | 'split';

export interface CounterSale {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  createdAt: string;
  // One checkout = one bill. Older sales (before this update) have none of these.
  billId?: string;
  paymentMethod?: PaymentMethod;
  cashAmount?: number; // this item's share paid in cash
  qrAmount?: number;   // this item's share paid by QR
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// One line in the Income / Expenses book. Older entries have no type = expense.
export interface Expense {
  id: string;
  name: string;
  amount: number;
  type?: 'income' | 'expense';
  createdAt: string;
}
