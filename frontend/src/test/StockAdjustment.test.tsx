import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Products } from "../pages/Products";
import { ToastProvider } from "../context/ToastContext";
import { AuthContext } from "../context/AuthContext";

vi.mock("../api/products", () => ({
  productApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: 10,
          sku: "SKU-TEST-100",
          name: "Precision Test Widget",
          category_id: 1,
          category: { id: 1, name: "Widgets" },
          cost_price: "50.00",
          avg_cost: "50.00",
          sell_price: "80.00",
          stock_qty: 15,
          reorder_level: 5,
          is_active: true,
          is_low_stock: false,
          created_at: "2026-10-30T10:00:00Z",
          updated_at: "2026-10-30T10:00:00Z",
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
    }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggleActive: vi.fn(),
  },
}));

vi.mock("../api/categories", () => ({
  categoryApi: {
    list: vi.fn().mockResolvedValue({
      data: [{ id: 1, name: "Widgets" }],
    }),
  },
}));

vi.mock("../api/adjustments", () => ({
  adjustmentApi: {
    create: vi.fn().mockResolvedValue({
      message: "Stock adjustment applied successfully.",
      data: {
        id: 1,
        product_id: 10,
        type: "adjustment",
        qty_change: 5,
        unit_cost: "50.00",
        reason: "Cycle count correction",
        user_id: 1,
        created_at: "2026-10-30T10:00:00Z",
      },
    }),
  },
}));

vi.mock("../api/movements", () => ({
  movementApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          product_id: 10,
          type: "adjustment",
          qty_change: 5,
          unit_cost: "50.00",
          reason: "Cycle count correction",
          user_id: 1,
          user: { id: 1, name: "Manager User" },
          created_at: "2026-10-30T10:00:00Z",
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
    }),
  },
}));

const mockAuthContextValue: any = {
  user: {
    id: 1,
    name: "Manager User",
    email: "manager@inventory.test",
    role: "manager",
  },
  token: "mock-token",
  permissions: [
    "products.view",
    "products.manage",
    "products.import",
    "products.cost_view",
    "stock_adjustments.manage",
  ],
  settings: {
    business_name: "Test Store",
    currency_symbol: "$",
    currency_code: "USD",
  },
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasRole: vi.fn().mockReturnValue(true),
  hasPermission: vi.fn().mockReturnValue(true),
  isAdmin: false,
  isManager: true,
  isCashier: false,
  formatMoney: (v: any) => `$${Number(v || 0).toFixed(2)}`,
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={mockAuthContextValue}>
            {ui}
          </AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>,
  );
};

describe("Stock Adjustment & Product Details", () => {
  it("opens adjustment modal, validates delta, and checks projected stock", async () => {
    renderWithProviders(<Products />);

    const listToggle = await screen.findByRole("button", { name: "List view" });
    fireEvent.click(listToggle);

    await waitFor(() => {
      expect(screen.getByText("SKU-TEST-100")).toBeInTheDocument();
    });

    // Click on Stock Adjustment button
    const adjustBtn = screen.getByTitle("Stock Adjustment");
    fireEvent.click(adjustBtn);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Manual Stock Adjustment"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Precision Test Widget"),
    ).toBeInTheDocument();

    // Projected stock is currently 15 with 0 delta
    expect(within(dialog).getByText("15 units")).toBeInTheDocument();

    // Enter a negative delta that causes negative stock (-20)
    const deltaInput = within(dialog).getByPlaceholderText("e.g. +5 or -3");
    fireEvent.change(deltaInput, { target: { value: "-20" } });

    // Should show error message preventing negative stock
    expect(
      within(dialog).getByText(/Cannot adjust stock below 0/i),
    ).toBeInTheDocument();

    // Enter delta that triggers low stock warning (-12 => resulting stock 3 <= 5)
    fireEvent.change(deltaInput, { target: { value: "-12" } });
    expect(
      within(dialog).getByText(/will reach or fall below reorder alert level/i),
    ).toBeInTheDocument();
  });

  it("opens product details modal and switches to stock history tab", async () => {
    renderWithProviders(<Products />);

    const listToggle = await screen.findByRole("button", { name: "List view" });
    fireEvent.click(listToggle);

    await waitFor(() => {
      expect(screen.getByText("SKU-TEST-100")).toBeInTheDocument();
    });

    const viewBtn = screen.getByTitle("View Details & Stock History");
    fireEvent.click(viewBtn);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Overview & Specifications"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Stock History")).toBeInTheDocument();

    // Switch to Stock History tab inside the dialog
    const historyTab = within(dialog).getByRole("button", {
      name: /Stock History/i,
    });
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(
        within(dialog).getByText("Cycle count correction"),
      ).toBeInTheDocument();
      expect(within(dialog).getByText("+5")).toBeInTheDocument();
    });
  });

  it("renders Add Product modal with ImageUploader drop zone", async () => {
    renderWithProviders(<Products />);

    await waitFor(() => {
      expect(screen.getByText("Precision Test Widget")).toBeInTheDocument();
    });

    // Click Add Product button
    const addBtn = screen.getByRole("button", { name: /Add Product/i });
    fireEvent.click(addBtn);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Add New Product")).toBeInTheDocument();
    expect(within(dialog).getByText("Product Image")).toBeInTheDocument();
    expect(within(dialog).getByText(/click to upload/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/webp, png, or jpg/i)).toBeInTheDocument();
  });
});
