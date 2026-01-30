
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

export interface CounterSale {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
