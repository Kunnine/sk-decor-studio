import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Products } from "../pages/Products";
import { Pos } from "../pages/Pos";
import { ToastProvider } from "../context/ToastContext";
import { AuthContext } from "../context/AuthContext";
import { productApi } from "../api/products";
import { saleApi } from "../api/sales";

vi.mock("../api/products", () => ({
  productApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggleActive: vi.fn(),
    posSearch: vi.fn(),
  },
}));

vi.mock("../api/categories", () => ({
  categoryApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: "Lighting", parent_id: null },
        {
          id: 2,
          name: "Table Lamps",
          parent_id: 1,
          parent: { id: 1, name: "Lighting" },
        },
      ],
    }),
    tree: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("../api/suppliers", () => ({
  supplierApi: {
    list: vi.fn().mockResolvedValue({
      data: [{ id: 10, name: "Atelier Brass" }],
    }),
  },
}));

vi.mock("../api/customers", () => ({
  customerApi: {
    search: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

vi.mock("../api/sales", () => ({
  saleApi: {
    create: vi.fn(),
    downloadPdf: vi.fn(),
    viewPdf: vi.fn(),
  },
}));

const managerAuth: any = {
  user: {
    id: 1,
    name: "Maison Manager",
    email: "manager@maison.test",
    role: "manager",
  },
  token: "token-mgr",
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

const activeProduct = {
  id: 11,
  sku: "LMP-BRS-011",
  name: "Brushed Brass Desk Lamp",
  category_id: 2,
  parent_category: { id: 1, name: "Lighting" },
  category: {
    id: 2,
    name: "Table Lamps",
    parent: { id: 1, name: "Lighting" },
  },
  supplier_id: 10,
  supplier: { id: 10, name: "Atelier Brass" },
  cost_price: "45.00",
  avg_cost: "45.00",
  sell_price: "110.00",
  stock_qty: 8,
  reorder_level: 3,
  is_active: true,
  is_low_stock: false,
  image_url: "http://localhost:8000/storage/products/lamp.webp",
  thumb_url: "http://localhost:8000/storage/products/lamp_thumb.webp",
  created_at: "2026-11-11T09:00:00Z",
  updated_at: "2026-11-11T09:00:00Z",
};

const inactiveProduct = {
  id: 12,
  sku: "LMP-VNT-012",
  name: "Archived Vintage Sconce",
  category_id: 2,
  parent_category: { id: 1, name: "Lighting" },
  category: {
    id: 2,
    name: "Table Lamps",
    parent: { id: 1, name: "Lighting" },
  },
  cost_price: "60.00",
  avg_cost: "60.00",
  sell_price: "145.00",
  stock_qty: 4,
  reorder_level: 2,
  is_active: false,
  is_low_stock: false,
  image_url: null,
  thumb_url: null,
  created_at: "2026-11-11T08:00:00Z",
  updated_at: "2026-11-11T08:00:00Z",
};

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

describe("Products & POS Synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("displays SKU, Active/Inactive status, status filter, toggle-active action, and invalidates posProducts cache on changes", async () => {
    (productApi.list as any).mockResolvedValue({
      data: [activeProduct, inactiveProduct],
      meta: {
        current_page: 1,
        from: 1,
        to: 2,
        last_page: 1,
        per_page: 12,
        total: 2,
      },
    });
    (productApi.toggleActive as any).mockResolvedValue({
      message: "Product is now inactive and hidden from POS checkout.",
      data: { ...activeProduct, is_active: false },
    });

    const qc = createClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    render(
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <AuthContext.Provider value={managerAuth}>
            <ToastProvider>
              <Products />
            </ToastProvider>
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>,
    );

    const cards = await screen.findAllByTestId("catalog-product-card");
    expect(cards).toHaveLength(2);

    // Card 1 shows SKU, Category, Name, Price, Stock, Active status
    expect(within(cards[0]).getByText("LMP-BRS-011")).toBeInTheDocument();
    expect(
      within(cards[0]).getByText("Lighting › Table Lamps"),
    ).toBeInTheDocument();
    expect(within(cards[0]).getByText("$110.00")).toBeInTheDocument();
    expect(within(cards[0]).getByText("8 in stock")).toBeInTheDocument();
    expect(
      within(cards[0]).getByTestId("product-status-badge"),
    ).toHaveTextContent("Active");

    // Card 2 shows Inactive status
    expect(within(cards[1]).getByText("LMP-VNT-012")).toBeInTheDocument();
    expect(
      within(cards[1]).getByTestId("product-status-badge"),
    ).toHaveTextContent("Inactive");

    // Filter by product status dropdown works cleanly
    const statusFilter = screen.getByLabelText("Filter by product status");
    fireEvent.change(statusFilter, { target: { value: "0" } });
    await waitFor(() => {
      expect(productApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: "0", page: 1 }),
      );
    });

    // Deactivate via three-dot menu and verify both products & posProducts queries invalidate
    const actionsBtn = await screen.findByRole("button", {
      name: `Product actions for ${activeProduct.name}`,
    });
    fireEvent.click(actionsBtn);
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "Deactivate Product",
      }),
    );

    await waitFor(() => {
      expect(productApi.toggleActive).toHaveBeenCalledWith(activeProduct.id);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["posProducts"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["products"],
      });
    });
  });

  it("syncs persisted cart prices/stock with live POS catalog, removes deactivated items, and omits unit_price on checkout", async () => {
    // Seed persisted cart with stale price ($50), excessive qty (10), and an item that was deactivated (id 99)
    localStorage.setItem(
      "pos_cart_items",
      JSON.stringify([
        {
          product: { ...activeProduct, sell_price: "50.00", stock_qty: 20 },
          variant: null,
          qty: 10,
          unit_price: 50,
          line_total: 500,
        },
        {
          product: { ...inactiveProduct, id: 99, name: "Removed Pendant" },
          variant: null,
          qty: 2,
          unit_price: 75,
          line_total: 150,
        },
      ]),
    );

    // Live POS API returns updated sell_price ($110.00) and reduced stock (8), without id 99
    (productApi.posSearch as any).mockResolvedValue([activeProduct]);
    (saleApi.create as any).mockResolvedValue({
      message: "Completed",
      data: {
        id: 500,
        total: "968.00",
        payment_method: "card",
        invoice: { id: 500, number: "MDS-2026-000500" },
      },
    });

    render(
      <QueryClientProvider client={createClient()}>
        <BrowserRouter>
          <AuthContext.Provider value={managerAuth}>
            <Pos />
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>,
    );

    // Cart removes Removed Pendant, clamps qty 10 -> 8, updates price $50 -> $110 ($880 subtotal + 10% tax = $968)
    await waitFor(() => {
      expect(screen.getByText(/Current Sale \(8\)/i)).toBeInTheDocument();
      expect(screen.getByText("$110.00 each")).toBeInTheDocument();
      expect(screen.getByText("$968.00")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Removed Pendant");
      expect(screen.getByRole("status")).toHaveTextContent(
        "Brushed Brass Desk Lamp",
      );
    });

    // Checkout as Manager should NOT send stale client unit_price override
    fireEvent.click(screen.getByRole("button", { name: /card/i }));
    fireEvent.click(screen.getByRole("button", { name: /complete sale/i }));

    await waitFor(() => {
      expect(saleApi.create).toHaveBeenCalledTimes(1);
    });

    const submittedPayload = (saleApi.create as any).mock.calls[0][0];
    expect(submittedPayload.items[0]).toEqual({
      product_id: 11,
      product_variant_id: null,
      qty: 8,
    });
    expect(submittedPayload.items[0]).not.toHaveProperty("unit_price");
  });

  it("displays retry error state when POS catalog fetch fails and recovers on retry", async () => {
    (productApi.posSearch as any)
      .mockRejectedValueOnce(new Error("Connection timeout"))
      .mockResolvedValueOnce([activeProduct]);

    render(
      <QueryClientProvider client={createClient()}>
        <BrowserRouter>
          <AuthContext.Provider value={managerAuth}>
            <Pos />
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Unable to load POS catalog");

    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByText("Brushed Brass Desk Lamp"),
    ).toBeInTheDocument();
  });
});
