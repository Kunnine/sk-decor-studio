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
import { Purchases } from "../pages/Purchases";
import { ToastProvider } from "../context/ToastContext";
import { AuthContext } from "../context/AuthContext";

// Mock APIs
vi.mock("../api/purchases", () => ({
  purchaseApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          supplier_id: 1,
          supplier: { id: 1, name: "Acme Hardware Inc" },
          ref_no: "PO-2026-001",
          status: "draft",
          total: "500.00",
          notes: "Test draft purchase",
          created_by: 1,
          creator: { id: 1, name: "Admin User" },
          items: [
            {
              id: 1,
              purchase_id: 1,
              product_id: 1,
              product: { id: 1, sku: "LAP-001", name: "Workstation Laptop" },
              qty: 5,
              unit_cost: "100.00",
              subtotal: "500.00",
            },
          ],
          created_at: "2026-10-30T10:00:00Z",
        },
        {
          id: 2,
          supplier_id: 1,
          supplier: { id: 1, name: "Acme Hardware Inc" },
          ref_no: "PO-2026-002",
          status: "received",
          total: "1200.00",
          notes: "Received shipment",
          created_by: 1,
          creator: { id: 1, name: "Admin User" },
          received_at: "2026-10-30T12:00:00Z",
          items: [
            {
              id: 2,
              purchase_id: 2,
              product_id: 2,
              product: { id: 2, sku: "MON-001", name: "Ultra Monitor" },
              qty: 6,
              unit_cost: "200.00",
              subtotal: "1200.00",
            },
          ],
          created_at: "2026-10-30T11:00:00Z",
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 10, total: 2 },
    }),
    create: vi
      .fn()
      .mockResolvedValue({ message: "Purchase created successfully" }),
    receive: vi
      .fn()
      .mockResolvedValue({ message: "Stock received and inventory updated" }),
    delete: vi.fn().mockResolvedValue({ message: "Purchase draft deleted" }),
  },
}));

vi.mock("../api/suppliers", () => ({
  supplierApi: {
    list: vi.fn().mockResolvedValue({
      data: [{ id: 1, name: "Acme Hardware Inc" }],
    }),
  },
}));

vi.mock("../api/products", () => ({
  productApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          sku: "LAP-001",
          name: "Workstation Laptop",
          cost_price: "100.00",
        },
        { id: 2, sku: "MON-001", name: "Ultra Monitor", cost_price: "200.00" },
      ],
    }),
  },
}));

const mockAuthContextValue: any = {
  user: {
    id: 1,
    name: "Manager User",
    email: "manager@inventory.test",
    role: "manager" as const,
  },
  token: "mock-token",
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasRole: vi.fn().mockReturnValue(true),
  isAdmin: false,
  isManager: true,
  isCashier: false,
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

describe("Purchases Component", () => {
  it("renders purchase orders list with draft and received status badges", async () => {
    renderWithProviders(<Purchases />);

    expect(screen.getByText(/Purchases & Stock-In/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("PO-2026-001")).toBeInTheDocument();
      expect(screen.getByText("PO-2026-002")).toBeInTheDocument();
    });

    const table = screen.getByRole("table");
    expect(within(table).getByText(/^draft$/i)).toBeInTheDocument();
    expect(within(table).getByText(/^received$/i)).toBeInTheDocument();
  });

  it("opens purchase order creation modal and allows adding line items", async () => {
    renderWithProviders(<Purchases />);

    const newBtn = await screen.findByRole("button", { name: /New Purchase/i });
    fireEvent.click(newBtn);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Create Purchase Order"),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Supplier/i)).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText(/PO Reference Number/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Purchase Line Items/i),
    ).toBeInTheDocument();

    // Check add item button
    const addItemBtn = within(dialog).getByRole("button", {
      name: /Add Item/i,
    });
    expect(addItemBtn).toBeInTheDocument();
  });
});
