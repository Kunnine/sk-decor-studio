export type Role = "admin" | "manager" | "cashier";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  email_alerts_enabled?: boolean | null;
  digest_enabled?: boolean | null;
  wants_low_stock_email?: boolean;
  wants_low_stock_digest?: boolean;
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

export interface ProductVariant {
  id?: number;
  product_id?: number;
  sku: string;
  name?: string | null;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  style?: string | null;
  cost_price?: string | number;
  avg_cost?: string | number | null;
  sell_price: string | number;
  stock_qty: number;
  reorder_level: number;
  is_active: boolean;
  is_low_stock?: boolean;
  label?: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  category_id: number;
  category?: Category | null;
  parent_category?: Category | null;
  unit_id?: number | null;
  unit?: Unit | null;
  supplier_id?: number | null;
  supplier?: Supplier | null;
  cost_price?: string; // Optional because cashier cannot view cost_price
  avg_cost?: string | null;
  sell_price: string;
  stock_qty: number;
  reorder_level: number;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  style?: string | null;
  has_variants?: boolean;
  variants?: ProductVariant[];
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
  product_variant_id?: number | null;
  variant_label?: string | null;
  variant?: ProductVariant | null;
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
  product_variant_id?: number | null;
  variant_label?: string | null;
  variant?: ProductVariant | null;
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
  product_variant_id?: number | null;
  variant_label?: string | null;
  variant?: ProductVariant | null;
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
  variant?: ProductVariant | null;
  qty: number;
  unit_price: number;
  line_total: number;
}

// Phase 4 Types: Insights, Notifications, Analytics, Reports & Audit
export interface NotificationData {
  type?: string;
  product_id?: number;
  sku?: string;
  name?: string;
  stock_qty?: number;
  reorder_level?: number;
  deficit?: number;
  unit?: string;
  thumb_url?: string | null;
  message: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: number;
  data: NotificationData;
  read_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface MetricWithChange {
  current: number;
  previous: number;
  change: number;
  change_pct: number;
}

export interface AnalyticsSummary {
  revenue: MetricWithChange;
  orders: MetricWithChange;
  average_order_value: MetricWithChange;
  units_sold: MetricWithChange;
  gross_profit: MetricWithChange;
  gross_margin_pct: MetricWithChange;
  low_stock_count: MetricWithChange;
  total_products?: number;
  total_categories?: number;
  total_stock_value?: number;
  period: {
    from: string;
    to: string;
    prev_from: string;
    prev_to: string;
  };
}

export interface SalesTrendPoint {
  date: string;
  revenue: number;
  orders: number;
  profit: number;
}

export interface TopProductAnalytics {
  id: number;
  sku: string;
  name: string;
  thumb_url?: string | null;
  quantity: number;
  revenue: number;
}

export interface CategorySalesAnalytics {
  category_id: number;
  category_name: string;
  revenue: number;
  units_sold: number;
  percentage: number;
}

export interface SlowMoverItem {
  id: number;
  sku: string;
  name: string;
  stock_qty: number;
  unit: string;
  unit_cost: number;
  total_value: number;
  thumb_url?: string | null;
  last_sold_at?: string | null;
}

export interface ValuationAnalytics {
  total_valuation: number;
  total_units: number;
  total_products: number;
  by_category: Array<{
    category: string;
    products_count: number;
    total_stock: number;
    valuation: number;
  }>;
  slow_movers: SlowMoverItem[];
  slow_moving_days: number;
}

export interface PaymentMethodAnalytics {
  payment_method: string;
  orders_count: number;
  revenue: number;
  percentage: number;
}

export interface CashierAnalytics {
  user_id: number;
  cashier_name: string;
  orders_count: number;
  revenue: number;
  percentage: number;
}

export interface AuditLogItem {
  id: number;
  user_id?: number | null;
  user_name: string;
  user_email?: string | null;
  action: string;
  entity: string;
  entity_id?: number | null;
  changes?: Record<string, unknown> | null;
  ip?: string | null;
  created_at: string;
}
