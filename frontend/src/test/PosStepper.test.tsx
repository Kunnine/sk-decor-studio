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
import { customerApi } from "../api/customers";
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
    image_url: "http://localhost:8000/storage/products/widget_a.webp",
    thumb_url: "http://localhost:8000/storage/products/widget_a_thumb.webp",
  },
  {
    id: 2,
    sku: "WIDGET-ZERO",
    name: "Out of Stock Widget",
    sell_price: "25.00",
    stock_qty: 0,
    reorder_level: 5,
    is_active: true,
  },
  {
    id: 3,
    sku: "WIDGET-SMALL",
    name: "Limited Stock Widget",
    sell_price: "15.00",
    stock_qty: 3,
    reorder_level: 2,
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
    tax_rate: 10,
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

const renderPos = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <AuthContext.Provider value={mockAuthValue}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Pos />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
};

describe("POS Quantity Stepper & Stock Preservation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (productApi.posSearch as any).mockResolvedValue(mockProducts);
  });

  it("+ and - on the card increment and decrement cart quantity up to available stock", async () => {
    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Standard Widget A")).toBeInTheDocument();
    });

    const cards = screen.getAllByTestId("pos-product-card");
    const card = cards[0];
    const decBtn = within(card).getByRole("button", {
      name: "Decrease quantity",
    });
    const incBtn = within(card).getByRole("button", {
      name: "Increase quantity",
    });
    const qtyDisplay = within(card).getByTestId("card-cart-qty");

    // Initial state: 0 in cart, decrease is disabled
    expect(qtyDisplay).toHaveTextContent("0");
    expect(decBtn).toBeDisabled();
    expect(incBtn).not.toBeDisabled();

    // Click increment (+) -> cart quantity becomes 1
    fireEvent.click(incBtn);
    expect(qtyDisplay).toHaveTextContent("1");
    expect(decBtn).not.toBeDisabled();

    // Click increment (+) again -> cart quantity becomes 2
    fireEvent.click(incBtn);
    expect(qtyDisplay).toHaveTextContent("2");

    // Click decrement (-) -> cart quantity goes back to 1
    fireEvent.click(decBtn);
    expect(qtyDisplay).toHaveTextContent("1");

    // Click decrement (-) down to 0 -> decrease is disabled again
    fireEvent.click(decBtn);
    expect(qtyDisplay).toHaveTextContent("0");
    expect(decBtn).toBeDisabled();
  });

  it("stock at 0 disables stepper controls and displays Out of stock", async () => {
    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Out of Stock Widget")).toBeInTheDocument();
    });

    const cards = screen.getAllByTestId("pos-product-card");
    const zeroStockCard = cards.find((c) =>
      within(c).queryByText("Out of Stock Widget"),
    )!;

    expect(zeroStockCard).toBeDefined();
    expect(within(zeroStockCard).getByTestId("stock-status")).toHaveTextContent(
      "Out of stock",
    );

    const decBtn = within(zeroStockCard).getByRole("button", {
      name: "Decrease quantity",
    });
    const incBtn = within(zeroStockCard).getByRole("button", {
      name: "Increase quantity",
    });
    const qtyDisplay = within(zeroStockCard).getByTestId("card-cart-qty");

    expect(decBtn).toBeDisabled();
    expect(incBtn).toBeDisabled();
    expect(qtyDisplay).toHaveTextContent("0");
  });

  it("displayed stock figure on the card does not change after any stepper action", async () => {
    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Standard Widget A")).toBeInTheDocument();
    });

    const card = screen.getAllByTestId("pos-product-card")[0];
    const stockDisplay = within(card).getByTestId("product-stock");
    const incBtn = within(card).getByRole("button", {
      name: "Increase quantity",
    });
    const qtyDisplay = within(card).getByTestId("card-cart-qty");

    // Initial server stock is 10
    expect(stockDisplay).toHaveTextContent("In stock: 10");
    expect(within(card).getByTestId("remaining-stock")).toHaveTextContent(
      "Remaining after this sale: 10",
    );

    // Click + multiple times
    fireEvent.click(incBtn);
    fireEvent.click(incBtn);
    fireEvent.click(incBtn);

    // Quantity display is now 3
    expect(qtyDisplay).toHaveTextContent("3");

    // Displayed server stock MUST STAY 10!
    expect(stockDisplay).toHaveTextContent("In stock: 10");
    // Only the local projected remaining figure changes (10 - 3 = 7)
    expect(within(card).getByTestId("remaining-stock")).toHaveTextContent(
      "Remaining after this sale: 7",
    );
  });

  it("stepping quantity never exceeds available stock", async () => {
    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Limited Stock Widget")).toBeInTheDocument();
    });

    // Limited Stock Widget has stock_qty = 3
    const cards = screen.getAllByTestId("pos-product-card");
    const limitedCard = cards.find((c) =>
      within(c).queryByText("Limited Stock Widget"),
    )!;

    const incBtn = within(limitedCard).getByRole("button", {
      name: "Increase quantity",
    });
    const qtyDisplay = within(limitedCard).getByTestId("card-cart-qty");

    // Add 1, 2, 3 items to cart
    fireEvent.click(incBtn);
    fireEvent.click(incBtn);
    fireEvent.click(incBtn);

    expect(qtyDisplay).toHaveTextContent("3");
    // Now stock is at max (3 of 3), + button is disabled
    expect(incBtn).toBeDisabled();
    expect(within(limitedCard).getByTestId("stock-status")).toHaveTextContent(
      "Only 3 available",
    );
  });

  it("opens product detail modal, shows stepper and unchanged stock, and adds to cart", async () => {
    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Standard Widget A")).toBeInTheDocument();
    });

    const card = screen.getAllByTestId("pos-product-card")[0];
    const detailsBtn = within(card).getByRole("button", {
      name: /View details for Standard Widget A/i,
    });
    fireEvent.click(detailsBtn);

    // Modal is open
    const modal = screen.getByTestId("pos-product-detail-card");
    expect(within(modal).getByText("Standard Widget A")).toBeInTheDocument();

    const detailStock = within(modal).getByTestId("detail-product-stock");
    expect(detailStock).toHaveTextContent("10");

    const modalIncBtn = within(modal).getByRole("button", {
      name: "Increase quantity",
    });
    const modalInput = within(modal).getByRole("textbox", { name: "Quantity" });

    // Press + twice -> qty becomes 3
    fireEvent.click(modalIncBtn);
    fireEvent.click(modalIncBtn);
    expect(modalInput).toHaveValue("3");

    // Server stock in detail modal remains unchanged!
    expect(detailStock).toHaveTextContent("10");
    expect(
      within(modal).getByTestId("detail-remaining-stock"),
    ).toHaveTextContent("Remaining after this sale: 7");

    // Click Add to cart inside modal
    const modalAddBtn = within(modal).getByRole("button", {
      name: /Add to cart/i,
    });
    fireEvent.click(modalAddBtn);

    // Cart now has 3 items
    await waitFor(() => {
      expect(screen.getByText(/Current Sale \(3\)/i)).toBeInTheDocument();
    });

    // Modal closed
    expect(
      screen.queryByTestId("pos-product-detail-card"),
    ).not.toBeInTheDocument();
  });

  it("does NOT add product or change quantity when clicking card background, image, name, price, or stock text", async () => {
    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Standard Widget A")).toBeInTheDocument();
    });

    const card = screen.getAllByTestId("pos-product-card")[0];
    expect(card).not.toHaveClass("cursor-pointer");
    expect(
      within(card).queryByTestId("add-to-cart-button"),
    ).not.toBeInTheDocument();

    // Click card background, image, name, price, and stock display
    fireEvent.click(card);
    fireEvent.click(within(card).getByAltText("Standard Widget A"));
    fireEvent.click(within(card).getByText("Standard Widget A"));
    fireEvent.click(within(card).getByText("$50.00"));
    fireEvent.click(within(card).getByTestId("product-stock"));

    expect(screen.getByText(/Current Sale \(0\)/i)).toBeInTheDocument();
    expect(screen.getByText("Cart is empty")).toBeInTheDocument();
    expect(screen.queryByTestId("cart-item")).not.toBeInTheDocument();
    expect(within(card).getByTestId("card-cart-qty")).toHaveTextContent("0");
  });

  it("synchronizes (+) and (-) on product card with Current Sale items, image, subtotal, total, and removes item at 0 without duplicates", async () => {
    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Standard Widget A")).toBeInTheDocument();
    });

    const card = screen.getAllByTestId("pos-product-card")[0];
    const incBtn = within(card).getByRole("button", {
      name: "Increase quantity",
    });
    const decBtn = within(card).getByRole("button", {
      name: "Decrease quantity",
    });
    const qtyDisplay = within(card).getByTestId("card-cart-qty");

    // Initially not in Current Sale
    expect(screen.queryByTestId("cart-item")).not.toBeInTheDocument();
    expect(decBtn).toBeDisabled();

    // Click (+) at qty 0 -> adds to Current Sale with qty 1
    fireEvent.click(incBtn);

    const cartItemsAfterAdd = await screen.findAllByTestId("cart-item");
    expect(cartItemsAfterAdd).toHaveLength(1);
    const cartItem = cartItemsAfterAdd[0];
    expect(within(cartItem).getByText("Standard Widget A")).toBeInTheDocument();
    expect(within(cartItem).getByAltText("Standard Widget A")).toHaveAttribute(
      "src",
      "http://localhost:8000/storage/products/widget_a_thumb.webp",
    );
    expect(within(cartItem).getByText("$50.00 each")).toBeInTheDocument();
    expect(
      within(cartItem).getByLabelText("Quantity for Standard Widget A"),
    ).toHaveValue(1);
    expect(screen.getByText(/Current Sale \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("$55.00")).toBeInTheDocument(); // $50 + 10% tax

    // Click (+) two more times -> qty 3, still only 1 cart line (no duplicates)
    fireEvent.click(incBtn);
    fireEvent.click(incBtn);
    expect(screen.getAllByTestId("cart-item")).toHaveLength(1);
    expect(qtyDisplay).toHaveTextContent("3");
    expect(
      within(cartItem).getByLabelText("Quantity for Standard Widget A"),
    ).toHaveValue(3);
    expect(screen.getByText(/Current Sale \(3\)/i)).toBeInTheDocument();
    expect(screen.getAllByText("$150.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("$165.00")).toBeInTheDocument();

    // Click (-) when qty > 1 -> decreases qty to 2
    fireEvent.click(decBtn);
    expect(qtyDisplay).toHaveTextContent("2");
    expect(
      within(cartItem).getByLabelText("Quantity for Standard Widget A"),
    ).toHaveValue(2);
    expect(screen.getByText(/Current Sale \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText("$110.00")).toBeInTheDocument();

    // Click (-) to 1, then (-) again -> removes product from Current Sale
    fireEvent.click(decBtn);
    expect(qtyDisplay).toHaveTextContent("1");
    expect(screen.getByTestId("cart-item")).toBeInTheDocument();

    fireEvent.click(decBtn);
    expect(qtyDisplay).toHaveTextContent("0");
    expect(decBtn).toBeDisabled();
    expect(screen.queryByTestId("cart-item")).not.toBeInTheDocument();
    expect(screen.getByText(/Current Sale \(0\)/i)).toBeInTheDocument();
    expect(screen.getByText("Cart is empty")).toBeInTheDocument();
  });

  it("keeps quantity synchronized from Current Sale controls, prevents negative/over-stock values, and resets after checkout", async () => {
    (saleApi.create as any).mockResolvedValue({
      message: "Sale completed",
      data: {
        id: 101,
        total: "55.00",
        payment_method: "card",
        invoice: { id: 101, number: "MDS-2026-000101" },
      },
    });

    renderPos();

    await waitFor(() => {
      expect(screen.getByText("Standard Widget A")).toBeInTheDocument();
    });

    const card = screen.getAllByTestId("pos-product-card")[0];
    const cardInc = within(card).getByRole("button", {
      name: "Increase quantity",
    });
    const cardQty = within(card).getByTestId("card-cart-qty");

    fireEvent.click(cardInc);
    fireEvent.click(cardInc);
    expect(cardQty).toHaveTextContent("2");

    // Update from Current Sale panel buttons & input
    const cartPlus = screen.getByRole("button", {
      name: "Increase quantity for Standard Widget A",
    });
    const cartMinus = screen.getByRole("button", {
      name: "Decrease quantity for Standard Widget A",
    });
    const cartInput = screen.getByLabelText("Quantity for Standard Widget A");

    fireEvent.click(cartPlus);
    expect(cardQty).toHaveTextContent("3");
    expect(cartInput).toHaveValue(3);

    fireEvent.click(cartMinus);
    expect(cardQty).toHaveTextContent("2");
    expect(cartInput).toHaveValue(2);

    // Negative value is rejected
    fireEvent.change(cartInput, { target: { value: "-4" } });
    expect(cardQty).toHaveTextContent("2");
    expect(cartInput).toHaveValue(2);

    // Value exceeding stock (10) is capped at 10 and card (+) disables
    fireEvent.change(cartInput, { target: { value: "99" } });
    expect(cardQty).toHaveTextContent("10");
    expect(cartInput).toHaveValue(10);
    expect(cardInc).toBeDisabled();

    // Setting 0 removes from Current Sale and resets card qty to 0
    fireEvent.change(cartInput, { target: { value: "0" } });
    expect(cardQty).toHaveTextContent("0");
    expect(screen.queryByTestId("cart-item")).not.toBeInTheDocument();
    expect(cardInc).not.toBeDisabled();

    // Add 1 and complete checkout via Card
    fireEvent.click(cardInc);
    expect(cardQty).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: /card/i }));
    fireEvent.click(screen.getByRole("button", { name: /complete sale/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Sale Completed Successfully"),
      ).toBeInTheDocument();
      expect(cardQty).toHaveTextContent("0");
    });
  });
});
