export type Role = 'admin' | 'manager' | 'cashier';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: number | null;
  parent?: Category | null;
  children?: Category[];
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  category_id: number;
  category?: Category | null;
  cost_price: string;
  sell_price: string;
  stock_qty: number;
  reorder_level: number;
  is_active: boolean;
  is_low_stock: boolean;
  low_stock_notified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta?: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface CsvImportResult {
  message: string;
  imported_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    sku: string | null;
    message: string;
  }>;
}
