import React from "react";
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { Products } from "../pages/Products";
import { Dashboard } from "../pages/Dashboard";
import { Pos } from "../pages/Pos";
import { ToastProvider } from "../context/ToastContext";
import { AuthContext, AuthProvider } from "../context/AuthContext";
import { authApi } from "../api/auth";
import { productApi } from "../api/products";
import { categoryApi } from "../api/categories";
import { supplierApi } from "../api/suppliers";
import { analyticsApi } from "../api/analytics";
import { saleApi } from "../api/sales";

vi.mock("recharts", async () => {
  const original = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

vi.mock("../api/auth", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("../api/products", () => ({
  productApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggleActive: vi.fn(),
    lowStock: vi.fn(),
    posSearch: vi.fn(),
  },
}));

vi.mock("../api/categories", () => ({
  categoryApi: {
    list: vi.fn(),
    tree: vi.fn(),
  },
}));

vi.mock("../api/suppliers", () => ({
  supplierApi: {
    list: vi.fn(),
  },
}));

vi.mock("../api/analytics", () => ({
  analyticsApi: {
    summary: vi.fn(),
    salesTrend: vi.fn(),
    topProducts: vi.fn(),
    salesByCategory: vi.fn(),
    paymentMethods: vi.fn(),
  },
}));

vi.mock("../api/sales", () => ({
  saleApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../api/customers", () => ({
  customerApi: {
    search: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

const managerAuth: any = {
  user: {
    id: 1,
    name: "Elena Manager",
    email: "manager@maisondecor.test",
    role: "manager",
  },
  token: "token-1",
  permissions: ["*"],
  isAdmin: false,
  isManager: true,
  isCashier: false,
  hasRole: () => true,
  hasPermission: () => true,
  settings: {
    business_name: "Maison Decor Studio",
    currency_symbol: "$",
    currency_code: "USD",
    tax_rate: 10,
  },
  formatMoney: (v: any) => `$${Number(v || 0).toFixed(2)}`,
};

const cashierAuth: any = {
  user: {
    id: 2,
    name: "Leo Cashier",
    email: "cashier@maisondecor.test",
    role: "cashier",
  },
  token: "token-2",
  permissions: ["sales.create", "sales.view_own"],
  isAdmin: false,
  isManager: false,
  isCashier: true,
  hasRole: (r: any) => r === "cashier",
  hasPermission: (p: any) => p === "sales.create" || p === "sales.view_own",
  settings: {
    business_name: "Maison Decor Studio",
    currency_symbol: "$",
    currency_code: "USD",
    tax_rate: 10,
  },
  formatMoney: (v: any) => `$${Number(v || 0).toFixed(2)}`,
};

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

describe("Interior Home Decoration Store Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("displays Parent > Subcategory, Supplier, decor attributes, and filters in Products", async () => {
    (categoryApi.list as any).mockResolvedValue({
      data: [
        { id: 1, name: "Lighting", parent_id: null },
        {
          id: 2,
          name: "Table Lamps",
          parent_id: 1,
          parent: { id: 1, name: "Lighting" },
        },
        { id: 3, name: "Vases & Pottery", parent_id: null },
        {
          id: 4,
          name: "Ceramic Vases",
          parent_id: 3,
          parent: { id: 3, name: "Vases & Pottery" },
        },
      ],
    });
    (supplierApi.list as any).mockResolvedValue({
      data: [{ id: 10, name: "Lumiere Lighting Studio" }],
    });
    (productApi.list as any).mockResolvedValue({
      data: [
        {
          id: 101,
          sku: "LMP-MOD-LED01",
          name: "Modern LED Table Lamp",
          category_id: 2,
          parent_category: { id: 1, name: "Lighting" },
          category: {
            id: 2,
            name: "Table Lamps",
            parent: { id: 1, name: "Lighting" },
          },
          supplier_id: 10,
          supplier: { id: 10, name: "Lumiere Lighting Studio" },
          color: "Black",
          size: "Medium",
          material: "Metal",
          style: "Modern",
          has_variants: true,
          variants: [
            {
              id: 501,
              product_id: 101,
              sku: "LMP-MOD-LED01-BLK",
              color: "Black",
              size: "Medium",
              sell_price: "89.00",
              cost_price: "42.00",
              stock_qty: 14,
              reorder_level: 4,
              is_active: true,
            },
            {
              id: 502,
              product_id: 101,
              sku: "LMP-MOD-LED01-GLD",
              color: "Gold",
              size: "Medium",
              sell_price: "98.00",
              cost_price: "48.00",
              stock_qty: 6,
              reorder_level: 3,
              is_active: true,
            },
          ],
          cost_price: "42.00",
          avg_cost: "44.00",
          sell_price: "89.00",
          stock_qty: 20,
          reorder_level: 5,
          is_active: true,
          is_low_stock: false,
          created_at: "2026-11-10T10:00:00Z",
          updated_at: "2026-11-10T10:00:00Z",
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
    });
    (productApi.create as any).mockResolvedValue({
      message: "Created",
      data: { id: 102 },
    });

    render(
      <QueryClientProvider client={createClient()}>
        <BrowserRouter>
          <AuthContext.Provider value={managerAuth}>
            <ToastProvider>
              <Products />
            </ToastProvider>
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>,
    );

    // Default Grid view shows clean, static boutique cards (image, category, status, name, SKU, price, stock)
    const card = await screen.findByTestId("catalog-product-card");
    expect(within(card).getByText("Modern LED Table Lamp")).toBeInTheDocument();
    expect(within(card).getByText("LMP-MOD-LED01")).toBeInTheDocument();
    expect(within(card).getByTestId("product-status-badge")).toHaveTextContent(
      "Active",
    );
    expect(within(card).getByText("$89.00")).toBeInTheDocument();
    expect(within(card).getByText("20 in stock")).toBeInTheDocument();
    expect(within(card).queryByText("2 variants")).not.toBeInTheDocument();
    expect(
      within(card).queryByText("Lumiere Lighting Studio"),
    ).not.toBeInTheDocument();

    // Card is strictly static display (no pointer cursor, no clickable hover styles, no click action)
    expect(card).not.toHaveClass("cursor-pointer");
    expect(card).not.toHaveClass("hover:-translate-y-0.5");
    fireEvent.click(card);
    fireEvent.click(within(card).getByText("Modern LED Table Lamp"));
    fireEvent.click(within(card).getByText("$89.00"));
    fireEvent.click(within(card).getByText("20 in stock"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Dedicated action menu exposes Edit Product, Delete Product, and View Details explicitly
    const actionsMenuBtn = within(card).getByRole("button", {
      name: "Product actions for Modern LED Table Lamp",
    });

    fireEvent.click(actionsMenuBtn);
    fireEvent.click(
      await within(card).findByRole("menuitem", { name: "Edit Product" }),
    );
    const editDialog = await screen.findByRole("dialog");
    expect(within(editDialog).getByText("Edit Product")).toBeInTheDocument();
    fireEvent.click(within(editDialog).getByRole("button", { name: "Cancel" }));

    fireEvent.click(actionsMenuBtn);
    fireEvent.click(
      await within(card).findByRole("menuitem", { name: "Delete Product" }),
    );
    const deleteDialog = await screen.findByRole("dialog");
    expect(
      within(deleteDialog).getByRole("heading", { name: "Delete Product" }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(deleteDialog).getByRole("button", { name: "Cancel" }),
    );

    fireEvent.click(actionsMenuBtn);
    fireEvent.click(
      await within(card).findByRole("menuitem", { name: "View Details" }),
    );
    const detailDialog = await screen.findByRole("dialog");
    expect(
      within(detailDialog).getByText(/Lighting > Table Lamps/),
    ).toBeInTheDocument();
    expect(
      within(detailDialog).getByText("Supplier: Lumiere Lighting Studio"),
    ).toBeInTheDocument();
    expect(
      within(detailDialog).getByText("Product Variations (2)"),
    ).toBeInTheDocument();
    expect(
      within(detailDialog).getByText("LMP-MOD-LED01-BLK"),
    ).toBeInTheDocument();
    expect(
      within(detailDialog).getByText("LMP-MOD-LED01-GLD"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(detailDialog).getByRole("button", { name: "Close" }),
    );

    // Toggling List View renders the structured inventory table with variants, attributes, and categories
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    const table = await screen.findByRole("table");
    expect(within(table).getByText("2 variants")).toBeInTheDocument();
    expect(
      within(table).getByText("Black · Medium · Metal · Modern"),
    ).toBeInTheDocument();
    expect(within(table).getByText("Lighting")).toBeInTheDocument();
    expect(within(table).getByText("Table Lamps")).toBeInTheDocument();
    expect(
      within(table).getByText("Lumiere Lighting Studio"),
    ).toBeInTheDocument();

    // Unified grouped category filter supports both parent collections (p:id) and subcategories
    const categorySelect = screen.getByLabelText("Filter by category");
    expect(within(categorySelect).getByText("Table Lamps")).toBeInTheDocument();
    expect(
      within(categorySelect).getByText("Ceramic Vases"),
    ).toBeInTheDocument();

    fireEvent.change(categorySelect, { target: { value: "p:1" } });
    await waitFor(() => {
      expect(productApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ parent_category_id: 1, category_id: "" }),
      );
    });

    fireEvent.change(categorySelect, { target: { value: "4" } });
    await waitFor(() => {
      expect(productApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ parent_category_id: "", category_id: 4 }),
      );
    });

    // Single stock status filter
    fireEvent.change(screen.getByLabelText("Filter by stock status"), {
      target: { value: "in_stock" },
    });

    await waitFor(() => {
      expect(productApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          stock_status: "in_stock",
        }),
      );
    });

    // Create product with variation rows
    fireEvent.click(screen.getByRole("button", { name: /add product/i }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText(/sku \/ barcode/i), {
      target: { value: "VAS-NEW-01" },
    });
    fireEvent.change(within(dialog).getByLabelText(/product name/i), {
      target: { value: "Fluted Travertine Vase" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^category/i), {
      target: { value: "4" },
    });
    fireEvent.change(within(dialog).getByLabelText(/cost price/i), {
      target: { value: "20" },
    });
    fireEvent.change(within(dialog).getByLabelText(/retail sell price/i), {
      target: { value: "48" },
    });

    // Enable variations checkbox
    const varToggle = within(dialog).getByRole("checkbox", {
      name: /enable product variations/i,
    });
    fireEvent.click(varToggle);

    const varSkuInput = within(dialog).getByPlaceholderText("Variant SKU *");
    fireEvent.change(varSkuInput, { target: { value: "VAS-NEW-01-BEIGE" } });

    const varColorInput = within(dialog).getByPlaceholderText("Color");
    fireEvent.change(varColorInput, { target: { value: "Beige" } });

    const varStockInput = within(dialog).getByTitle("Variant Stock Quantity");
    fireEvent.change(varStockInput, { target: { value: "8" } });

    fireEvent.click(
      within(dialog).getByRole("button", { name: /create product/i }),
    );

    await waitFor(() => {
      expect(productApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: "VAS-NEW-01",
          name: "Fluted Travertine Vase",
          has_variants: true,
          variants: [
            expect.objectContaining({
              sku: "VAS-NEW-01-BEIGE",
              color: "Beige",
              stock_qty: 8,
            }),
          ],
        }),
      );
    });
  });

  it("shows Total Products, Total Categories, Total Stock Value for Manager and hides them from Cashier on Dashboard", async () => {
    (analyticsApi.summary as any).mockResolvedValue({
      revenue: { current: 1850, previous: 1200, change: 650, change_pct: 54.2 },
      orders: { current: 14, previous: 10, change: 4, change_pct: 40.0 },
      average_order_value: {
        current: 132.14,
        previous: 120,
        change: 12.14,
        change_pct: 10.1,
      },
      units_sold: { current: 22, previous: 15, change: 7, change_pct: 46.7 },
      gross_profit: {
        current: 940,
        previous: 600,
        change: 340,
        change_pct: 56.7,
      },
      gross_margin_pct: {
        current: 50.8,
        previous: 50.0,
        change: 0.8,
        change_pct: 1.6,
      },
      low_stock_count: { current: 2, previous: 2, change: 0, change_pct: 0 },
      total_products: 32,
      total_categories: 68,
      total_stock_value: 24850.75,
      period: {
        from: "2026-11-01",
        to: "2026-11-10",
        prev_from: "2026-10-20",
        prev_to: "2026-10-31",
      },
    });
    (analyticsApi.salesTrend as any).mockResolvedValue([]);
    (analyticsApi.topProducts as any).mockResolvedValue([]);
    (analyticsApi.salesByCategory as any).mockResolvedValue([]);
    (analyticsApi.paymentMethods as any).mockResolvedValue([]);
    (productApi.lowStock as any).mockResolvedValue({
      data: [],
      meta: { total: 0 },
    });
    (saleApi.list as any).mockResolvedValue({ data: [] });

    const { unmount } = render(
      <QueryClientProvider client={createClient()}>
        <AuthContext.Provider value={managerAuth}>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Dashboard />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Total Products")).toBeInTheDocument();
    expect(await screen.findByText("32")).toBeInTheDocument();
    expect(screen.getByText("Total Categories")).toBeInTheDocument();
    expect(await screen.findByText("68")).toBeInTheDocument();
    expect(screen.getByText("Total Stock Value")).toBeInTheDocument();
    expect(await screen.findByText("$24850.75")).toBeInTheDocument();

    unmount();

    // Cashier view must not expose cost, profit, or stock value
    render(
      <QueryClientProvider client={createClient()}>
        <AuthContext.Provider value={cashierAuth}>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Dashboard />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Welcome, Leo Cashier")).toBeInTheDocument();
    expect(screen.queryByText("Total Stock Value")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Products")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Categories")).not.toBeInTheDocument();
    expect(screen.queryByText("Gross Profit")).not.toBeInTheDocument();
  });

  it("filters POS by dynamic category tree and adds distinct product variants as separate cart lines", async () => {
    (categoryApi.tree as any).mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Lighting",
          slug: "lighting",
          children: [
            { id: 11, name: "Table Lamps", slug: "table-lamps", parent_id: 1 },
          ],
        },
        {
          id: 2,
          name: "Vases & Pottery",
          slug: "vases-pottery",
          children: [
            {
              id: 21,
              name: "Ceramic Vases",
              slug: "ceramic-vases",
              parent_id: 2,
            },
          ],
        },
      ],
    });

    (productApi.posSearch as any).mockResolvedValue([
      {
        id: 201,
        sku: "VAS-CER-DEC01",
        name: "Ceramic Decorative Vase",
        sell_price: "54.00",
        stock_qty: 7,
        reorder_level: 3,
        is_active: true,
        has_variants: true,
        variants: [
          {
            id: 901,
            product_id: 201,
            sku: "VAS-CER-DEC01-WHT-S",
            color: "White",
            size: "Small",
            sell_price: "39.00",
            stock_qty: 5,
            reorder_level: 2,
            is_active: true,
          },
          {
            id: 902,
            product_id: 201,
            sku: "VAS-CER-DEC01-BGE-M",
            color: "Beige",
            size: "Medium",
            sell_price: "54.00",
            stock_qty: 2,
            reorder_level: 1,
            is_active: true,
          },
        ],
      },
    ]);

    (saleApi.create as any).mockResolvedValue({
      message: "Completed",
      data: {
        id: 77,
        total: "102.30",
        payment_method: "card",
        invoice: { id: 77, number: "MDS-2026-000077" },
      },
    });

    render(
      <QueryClientProvider client={createClient()}>
        <BrowserRouter>
          <AuthContext.Provider value={cashierAuth}>
            <Pos />
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>,
    );

    // Dynamic DB category pills appear
    const parentPill = await screen.findByRole("button", {
      name: "Vases & Pottery",
    });
    expect(parentPill).toBeInTheDocument();

    fireEvent.click(parentPill);
    await waitFor(() => {
      expect(productApi.posSearch).toHaveBeenCalledWith("", 2);
      expect(
        screen.getByRole("button", { name: "Ceramic Vases" }),
      ).toBeInTheDocument();
    });

    // Multi-variant card defaults to first variant (White · Small, $39.00)
    const card = await screen.findByTestId("pos-product-card");
    expect(within(card).getByText("$39.00")).toBeInTheDocument();
    expect(
      within(card).queryByTestId("add-to-cart-button"),
    ).not.toBeInTheDocument();

    // Clicking the card or product name does not add to Current Sale
    fireEvent.click(card);
    fireEvent.click(within(card).getByText("Ceramic Decorative Vase"));
    expect(screen.getByText(/Current Sale \(0\)/i)).toBeInTheDocument();

    const incBtn = within(card).getByRole("button", {
      name: "Increase quantity",
    });
    fireEvent.click(incBtn);

    // Switch to Beige · Medium on the same card ($54.00) and add to cart via (+)
    fireEvent.click(
      within(card).getByRole("button", { name: "Beige · Medium" }),
    );
    expect(within(card).getByText("$54.00")).toBeInTheDocument();
    fireEvent.click(incBtn);

    // Cart shows 2 items totaling $39 + $54 = $93 subtotal (+10% tax = $102.30)
    await waitFor(() => {
      expect(screen.getByText(/Current Sale \(2\)/i)).toBeInTheDocument();
      expect(screen.getByText("White / Small")).toBeInTheDocument();
      expect(screen.getByText("Beige / Medium")).toBeInTheDocument();
      expect(screen.getByText("$102.30")).toBeInTheDocument();
    });

    // Checkout via Card sends both distinct product_variant_id lines
    fireEvent.click(screen.getByRole("button", { name: /card/i }));
    fireEvent.click(screen.getByRole("button", { name: /complete sale/i }));

    await waitFor(() => {
      expect(saleApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: "card",
          items: [
            expect.objectContaining({
              product_id: 201,
              product_variant_id: 901,
              qty: 1,
            }),
            expect.objectContaining({
              product_id: 201,
              product_variant_id: 902,
              qty: 1,
            }),
          ],
        }),
        expect.any(String),
      );
    });
  });

  it("does not request restricted suppliers or stock movements when a cashier views Products", async () => {
    (categoryApi.list as any).mockResolvedValue({
      data: [{ id: 1, name: "Lighting", parent_id: null }],
    });
    (productApi.list as any).mockResolvedValue({
      data: [
        {
          id: 301,
          sku: "LMP-01",
          name: "Nordic Linen Lamp",
          sell_price: "89.00",
          stock_qty: 14,
          reorder_level: 5,
          is_active: true,
          is_low_stock: false,
          category_id: 1,
          category: { id: 1, name: "Lighting", parent: null },
          created_at: "2026-11-10T00:00:00Z",
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
    });

    render(
      <QueryClientProvider client={createClient()}>
        <BrowserRouter>
          <AuthContext.Provider value={cashierAuth}>
            <ToastProvider>
              <Products />
            </ToastProvider>
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Nordic Linen Lamp")).toBeInTheDocument();
    expect(supplierApi.list).not.toHaveBeenCalled();

    // Switch to List View and open details modal; Stock History tab should be hidden for cashiers
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    fireEvent.click(screen.getByTitle("View Details"));

    expect(
      await screen.findByRole("button", { name: /Overview & Specifications/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Stock History/i }),
    ).not.toBeInTheDocument();
  });

  it("closes Add Product modal and hides product management UI when another tab switches session to cashier", async () => {
    const adminUser = {
      id: 1,
      name: "Admin User",
      email: "admin@inventory.test",
      role: "admin",
    };
    const cashierUser = {
      id: 3,
      name: "Cashier User",
      email: "cashier@inventory.test",
      role: "cashier",
    };

    localStorage.setItem("auth_user", JSON.stringify(adminUser));
    localStorage.setItem(
      "auth_permissions",
      JSON.stringify(["products.view", "products.manage", "suppliers.view"]),
    );
    localStorage.setItem("auth_token", "admin-token");

    (authApi.me as any).mockResolvedValueOnce({
      user: adminUser,
      permissions: ["products.view", "products.manage", "suppliers.view"],
      settings: { business_name: "Maison Decor Studio", currency_symbol: "$" },
    });

    (categoryApi.list as any).mockResolvedValue({
      data: [{ id: 1, name: "Lighting", parent_id: null }],
    });
    (supplierApi.list as any).mockResolvedValue({ data: [] });
    (productApi.list as any).mockResolvedValue({
      data: [
        {
          id: 401,
          sku: "LMP-09",
          name: "Alabaster Table Lamp",
          sell_price: "129.00",
          stock_qty: 8,
          reorder_level: 3,
          is_active: true,
          is_low_stock: false,
          category_id: 1,
          category: { id: 1, name: "Lighting", parent: null },
          created_at: "2026-11-10T00:00:00Z",
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
    });

    const qc = createClient();

    render(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <AuthProvider onSessionChange={() => qc.clear()}>
            <ToastProvider>
              <Products />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );

    const addBtn = await screen.findByRole("button", { name: /add product/i });
    fireEvent.click(addBtn);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    (authApi.me as any).mockResolvedValueOnce({
      user: cashierUser,
      permissions: ["products.view", "sales.create"],
      settings: { business_name: "Maison Decor Studio", currency_symbol: "$" },
    });

    act(() => {
      localStorage.setItem("auth_user", JSON.stringify(cashierUser));
      localStorage.setItem(
        "auth_permissions",
        JSON.stringify(["products.view", "sales.create"]),
      );
      localStorage.setItem("auth_token", "cashier-token");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "auth_token",
          oldValue: "admin-token",
          newValue: "cashier-token",
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /add product/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Import CSV")).not.toBeInTheDocument();
    });
    expect(productApi.create).not.toHaveBeenCalled();
  });
});
