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
  avg_cost?: string | null;
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

export type CsvImportResult = CsvImportCommitResult;

export interface CsvImportCommitResult {
  error_count?: number;
  errors?: CsvImportErrorRow[];
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  message: string;
}

// Phase 2 Types
export interface Supplier {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  purchases_count?: number;
  created_at: string;
  updated_at: string;
}

export type PurchaseStatus = "draft" | "received";

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  product?: Product;
  qty: number;
  unit_cost: string;
  line_total?: string;
  subtotal?: string;
}

export interface Purchase {
  id: number;
  supplier_id: number;
  supplier?: Supplier;
  ref_no: string;
  status: PurchaseStatus;
  total: string;
  notes?: string | null;
  created_by: number;
  creator?: User;
  received_at?: string | null;
  items?: PurchaseItem[];
  items_count?: number;
  created_at: string;
  updated_at: string;
}

export type MovementType = "purchase" | "sale" | "adjustment" | "void";

export interface StockMovement {
  id: number;
  product_id: number;
  product?: Product;
  type: MovementType;
  qty_change: number;
  unit_cost?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  reference?: {
    id: number;
    ref_no?: string;
    number?: string;
  } | null;
  reference_label?: string | null;
  reason?: string | null;
  user_id: number;
  user?: User;
  created_at: string;
}

// Phase 3 Types: Sales & POS
export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  sales_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type PaymentMethod = "cash" | "card" | "transfer";
export type SaleStatus = "completed" | "void";

export interface Invoice {
  id: number;
  sale_id: number;
  number: string;
  issued_at: string;
  pdf_path?: string | null;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product?: Product;
  qty: number;
  unit_price: string;
  unit_cost?: string | null;
  line_total: string;
}

export interface Sale {
  id: number;
  customer_id?: number | null;
  customer?: Customer | null;
  user_id: number;
  cashier?: User;
  status: SaleStatus;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  payment_method: PaymentMethod;
  amount_paid: string;
  change_due: string;
  notes?: string | null;
  sold_at?: string | null;
  voided_at?: string | null;
  voided_by?: number | null;
  voided_by_user?: User | null;
  void_reason?: string | null;
  items?: SaleItem[];
  invoice?: Invoice | null;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  unit_price: number;
  line_total: number;
}
