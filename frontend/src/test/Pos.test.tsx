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
import { Pos } from "../pages/Pos";
import { AuthContext } from "../context/AuthContext";
import { productApi } from "../api/products";
import { saleApi } from "../api/sales";

vi.mock("../api/products", () => ({
  productApi: {
    posSearch: vi.fn(),
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

const mockProducts = [
  {
    id: 1,
    sku: "WIDGET-A",
    name: "Standard Widget A",
    sell_price: "50.00",
    stock_qty: 10,
    reorder_level: 5,
    is_active: true,
  },
  {
    id: 2,
    sku: "WIDGET-B",
    name: "Premium Widget B",
    sell_price: "100.00",
    stock_qty: 3,
    reorder_level: 5,
    is_active: true,
  },
];

const mockAuthValue: any = {
  user: {
    id: 1,
    name: "Test Cashier",
    email: "cashier@inventory.local",
    role: "cashier",
    is_active: true,
    permissions: ["sales.create", "sales.view_own"],
  },
  token: "mock-token",
  permissions: ["sales.create", "sales.view_own"],
  settings: {
    business_name: "Test Store",
    currency_symbol: "$",
    currency_code: "USD",
    tax_rate: 10, // 10%
  },
  isLoading: false,
  isAdmin: false,
  isManager: false,
  isCashier: true,
  hasRole: (role: any) => role === "cashier",
  hasPermission: (perm: string) =>
    ["sales.create", "sales.view_own"].includes(perm),
  formatMoney: (amount: any) => `$${Number(amount || 0).toFixed(2)}`,
  login: vi.fn(),
  logout: vi.fn(),
  updateSettings: vi.fn(),
};

const renderPos = (authOverride = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <AuthContext.Provider value={{ ...mockAuthValue, ...authOverride }}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Pos />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
};

describe("POS Checkout Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (productApi.posSearch as any).mockResolvedValue(mockProducts);
  });

  it("renders products and allows adding an item to the cart only via (+) button", async () => {
    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Standard Widget A")).toBeInTheDocument();
      expect(screen.getByText("Premium Widget B")).toBeInTheDocument();
    });

    // Clicking the product name or card must NOT add to cart
    fireEvent.click(screen.getByText("Standard Widget A"));
    expect(screen.getByText(/Current Sale \(0\)/i)).toBeInTheDocument();

    // Add Widget A to cart via (+) button
    const cards = screen.getAllByTestId("pos-product-card");
    fireEvent.click(
      within(cards[0]).getByRole("button", { name: "Increase quantity" }),
    );

    // Cart shows 1 item with correct subtotal, tax (10%), and total
    await waitFor(() => {
      expect(screen.getByText(/Current Sale \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText("Subtotal:")).toBeInTheDocument();
      // Subtotal 50.00, Tax 5.00, Total 55.00
      expect(screen.getAllByText("$50.00").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("$5.00")).toBeInTheDocument();
      expect(screen.getByText("$55.00")).toBeInTheDocument();
    });
  });

  it("caps quantity stepper at maximum available stock", async () => {
    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Premium Widget B")).toBeInTheDocument();
    });

    // Widget B has stock_qty = 3
    const cards = screen.getAllByTestId("pos-product-card");
    const widgetBCard = cards.find((c) =>
      within(c).queryByText("Premium Widget B"),
    )!;
    fireEvent.click(
      within(widgetBCard).getByRole("button", { name: "Increase quantity" }),
    );

    await waitFor(() => {
      expect(screen.getAllByDisplayValue("1").length).toBeGreaterThanOrEqual(1);
    });

    // Find the "+" button inside cart
    const plusButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg.lucide-plus"));
    const cartPlusBtn = plusButtons[plusButtons.length - 1];

    // Click "+" twice to reach qty = 3
    fireEvent.click(cartPlusBtn);
    fireEvent.click(cartPlusBtn);

    expect(screen.getByDisplayValue("3")).toBeInTheDocument();

    // The "+" button should now be disabled
    expect(cartPlusBtn).toBeDisabled();
  });

  it("calculates cash change due accurately and blocks sale if tender is insufficient", async () => {
    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Standard Widget A")).toBeInTheDocument();
    });

    const cards = screen.getAllByTestId("pos-product-card");
    fireEvent.click(
      within(cards[0]).getByRole("button", { name: "Increase quantity" }),
    ); // Total = $55.00

    await waitFor(() => {
      expect(screen.getByText("$55.00")).toBeInTheDocument();
    });

    const amountPaidInput = screen.getByPlaceholderText("55.00");

    // Enter insufficient amount: $40
    fireEvent.change(amountPaidInput, { target: { value: "40.00" } });

    // Complete sale button is disabled because cash is insufficient
    const checkoutButton = screen.getByRole("button", {
      name: /Complete Sale/i,
    });
    expect(checkoutButton).toBeDisabled();

    // Enter sufficient amount: $100
    fireEvent.change(amountPaidInput, { target: { value: "100.00" } });

    // Change due: 100 - 55 = $45.00
    expect(screen.getByText("$45.00")).toBeInTheDocument();
    expect(checkoutButton).not.toBeDisabled();
  });

  it("successfully completes sale and opens confirmation modal with invoice number", async () => {
    (saleApi.create as any).mockResolvedValue({
      message: "Sale processed successfully",
      data: {
        id: 42,
        total: "55.00",
        payment_method: "cash",
        amount_paid: "60.00",
        change_due: "5.00",
        invoice: {
          id: 10,
          number: "INV-2026-000042",
        },
      },
    });

    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Standard Widget A")).toBeInTheDocument();
    });

    const cards = screen.getAllByTestId("pos-product-card");
    fireEvent.click(
      within(cards[0]).getByRole("button", { name: "Increase quantity" }),
    );

    await waitFor(() => {
      expect(screen.getByText("$55.00")).toBeInTheDocument();
    });

    const amountPaidInput = screen.getByPlaceholderText("55.00");
    fireEvent.change(amountPaidInput, { target: { value: "60.00" } });

    const checkoutButton = screen.getByRole("button", {
      name: /Complete Sale/i,
    });
    fireEvent.click(checkoutButton);

    await waitFor(() => {
      expect(
        screen.getByText("Sale Completed Successfully"),
      ).toBeInTheDocument();
      expect(screen.getByText("Invoice #INV-2026-000042")).toBeInTheDocument();
      expect(screen.getByText("Download PDF")).toBeInTheDocument();
      expect(screen.getByText("Print Receipt")).toBeInTheDocument();
    });
  });
});
