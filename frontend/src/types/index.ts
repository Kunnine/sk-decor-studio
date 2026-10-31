export type Role = "admin" | "manager" | "cashier";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface AppSettings {
  business_name: string;
  business_logo?: string | null;
  business_logo_url?: string | null;
  currency_code: string;
  currency_symbol: string;
  tax_rate: string | number;
  default_reorder_level: string | number;
  invoice_prefix: string;
  date_format: string;
}

export interface Unit {
  id: number;
  name: string;
  short_name: string;
  products_count?: number;
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
  sort_order?: number;
  products_count?: number;
  children_count?: number;
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
  unit_id?: number | null;
  unit?: Unit | null;
  cost_price?: string; // Optional because cashier cannot view cost_price
  sell_price: string;
  stock_qty: number;
  reorder_level: number;
  image_url?: string | null;
  thumb_url?: string | null;
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

export interface CsvImportErrorRow {
  row: number;
  sku?: string | null;
  message: string;
}

export interface CsvImportPreview {
  preview_token: string;
  total_rows: number;
  valid_rows_count: number;
  error_count: number;
  errors: CsvImportErrorRow[];
  new_categories: string[];
  new_units: string[];
  duplicate_skus: string[];
  sample_rows: Array<{
    sku: string;
    name: string;
    category_name: string;
    unit_name?: string | null;
    cost_price: number;
    sell_price: number;
    stock_qty: number;
    reorder_level: number;
  }>;
}

export interface CsvImportCommitResult {
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  message: string;
}
