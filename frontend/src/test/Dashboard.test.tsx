import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../pages/Dashboard";
import { AuthContext } from "../context/AuthContext";
import { analyticsApi } from "../api/analytics";
import { productApi } from "../api/products";
import { saleApi } from "../api/sales";

// Mock recharts ResponsiveContainer to avoid 0x0 size in JSDOM
vi.mock("recharts", async () => {
  const original = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }} data-testid="recharts-container">
        {children}
      </div>
    ),
  };
});

vi.mock("../api/analytics", () => ({
  analyticsApi: {
    summary: vi.fn(),
    salesTrend: vi.fn(),
    topProducts: vi.fn(),
    salesByCategory: vi.fn(),
    paymentMethods: vi.fn(),
  },
}));

vi.mock("../api/products", () => ({
  productApi: {
    lowStock: vi.fn(),
  },
}));

vi.mock("../api/sales", () => ({
  saleApi: {
    list: vi.fn(),
  },
}));

const mockSummary = {
  revenue: {
    current: 15450.5,
    previous: 12000.0,
    change: 3450.5,
    change_pct: 28.75,
  },
  orders: { current: 120, previous: 100, change: 20, change_pct: 20.0 },
  average_order_value: {
    current: 128.75,
    previous: 120.0,
    change: 8.75,
    change_pct: 7.29,
  },
  units_sold: { current: 350, previous: 280, change: 70, change_pct: 25.0 },
  gross_profit: {
    current: 6200.0,
    previous: 4800.0,
    change: 1400.0,
    change_pct: 29.17,
  },
  gross_margin_pct: {
    current: 40.1,
    previous: 40.0,
    change: 0.1,
    change_pct: 0.25,
  },
  low_stock_count: { current: 4, previous: 4, change: 0, change_pct: 0.0 },
  period: {
    from: "2026-10-01",
    to: "2026-10-31",
    prev_from: "2026-09-01",
    prev_to: "2026-09-30",
  },
};

const mockTrend = [
  { date: "2026-10-01", orders: 4, revenue: 500, profit: 200 },
  { date: "2026-10-02", orders: 6, revenue: 800, profit: 320 },
];

const mockTopProducts = [
  {
    id: 1,
    sku: "WIDGET-01",
    name: "Premium Widget",
    quantity: 50,
    revenue: 2500,
  },
];

const mockCategories = [
  {
    category_id: 1,
    category_name: "Electronics",
    revenue: 8000,
    units_sold: 120,
    percentage: 51.8,
  },
];

const mockPayment = [
  {
    payment_method: "cash",
    orders_count: 80,
    revenue: 10000,
    percentage: 64.7,
  },
];

const mockLowStock = {
  data: [
    {
      id: 5,
      sku: "LOW-01",
      name: "Low Item",
      stock_qty: 2,
      reorder_level: 10,
      unit: { name: "box" },
    },
  ],
  meta: { total: 1 },
};

const mockRecentSales = {
  data: [
    {
      id: 101,
      invoice: { number: "INV-2026-001" },
      sold_at: "2026-10-31T10:00:00Z",
      customer: { name: "Acme Corp" },
      cashier: { name: "Alice" },
      total: "250.00",
      payment_method: "card",
      status: "completed",
    },
  ],
};

const adminAuth: any = {
  user: {
    id: 1,
    name: "Admin Manager",
    email: "admin@test.local",
    role: "admin",
  },
  isAdmin: true,
  isManager: false,
  isCashier: false,
  hasRole: () => true,
  hasPermission: () => true,
  settings: { business_name: "Test Corp", currency_symbol: "$" },
  formatMoney: (val: any) => `$${Number(val).toFixed(2)}`,
};

const cashierAuth: any = {
  user: {
    id: 2,
    name: "Cashier Bob",
    email: "bob@test.local",
    role: "cashier",
  },
  isAdmin: false,
  isManager: false,
  isCashier: true,
  hasRole: (r: any) => r === "cashier",
  hasPermission: (p: any) => p === "sales.create" || p === "sales.view_own",
  settings: { business_name: "Test Corp", currency_symbol: "$" },
  formatMoney: (val: any) => `$${Number(val).toFixed(2)}`,
};

describe("Dashboard Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it("renders manager/admin performance overview with KPI cards and previous period comparison", async () => {
    vi.mocked(analyticsApi.summary).mockResolvedValue(mockSummary as any);
    vi.mocked(analyticsApi.salesTrend).mockResolvedValue(mockTrend as any);
    vi.mocked(analyticsApi.topProducts).mockResolvedValue(
      mockTopProducts as any,
    );
    vi.mocked(analyticsApi.salesByCategory).mockResolvedValue(
      mockCategories as any,
    );
    vi.mocked(analyticsApi.paymentMethods).mockResolvedValue(
      mockPayment as any,
    );
    vi.mocked(productApi.lowStock).mockResolvedValue(mockLowStock as any);
    vi.mocked(saleApi.list).mockResolvedValue(mockRecentSales as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={adminAuth}>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Dashboard />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    // Verify Title & Business Name
    expect(screen.getByText("Performance Overview")).toBeInTheDocument();

    // Verify KPI Values
    await waitFor(() => {
      expect(screen.getByText("$15450.50")).toBeInTheDocument();
      expect(screen.getByText("120")).toBeInTheDocument();
      expect(screen.getByText("$6200.00")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    // Verify Previous Period Percentage Labels (no green/red, just + and %)
    expect(screen.getByText(/28\.8%/)).toBeInTheDocument();
    expect(screen.getByText(/40\.1% margin/)).toBeInTheDocument();
  });

  it("allows toggling accessible table view for charts", async () => {
    vi.mocked(analyticsApi.summary).mockResolvedValue(mockSummary as any);
    vi.mocked(analyticsApi.salesTrend).mockResolvedValue(mockTrend as any);
    vi.mocked(analyticsApi.topProducts).mockResolvedValue(
      mockTopProducts as any,
    );
    vi.mocked(analyticsApi.salesByCategory).mockResolvedValue(
      mockCategories as any,
    );
    vi.mocked(analyticsApi.paymentMethods).mockResolvedValue(
      mockPayment as any,
    );
    vi.mocked(productApi.lowStock).mockResolvedValue(mockLowStock as any);
    vi.mocked(saleApi.list).mockResolvedValue(mockRecentSales as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={adminAuth}>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Dashboard />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Sales & Profit Trend")).toBeInTheDocument();
    });

    // Find and click the "Table" toggle button for the trend chart
    const tableButtons = screen.getAllByRole("button", { name: /Table/i });
    expect(tableButtons.length).toBeGreaterThan(0);
    fireEvent.click(tableButtons[0]);

    // Check that table captions or cells are revealed
    await waitFor(() => {
      expect(
        screen.getByText("Sales & Profit Trend Table"),
      ).toBeInTheDocument();
      expect(screen.getByText("2026-10-01")).toBeInTheDocument();
    });
  });

  it("renders reduced dashboard for cashier role without gross profit or cost prices", async () => {
    vi.mocked(saleApi.list).mockResolvedValue({
      data: [
        {
          id: 201,
          invoice: { number: "INV-CASHIER-1" },
          sold_at: new Date().toISOString(),
          customer: { name: "Walk-in Customer" },
          total: "85.00",
          payment_method: "cash",
          status: "completed",
          items: [{ id: 1, qty: 2 }],
        },
      ],
      meta: { total: 1 },
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={cashierAuth}>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Dashboard />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    // Verify Cashier specific headers
    expect(screen.getByText("Welcome, Cashier Bob")).toBeInTheDocument();
    expect(screen.getByText("Today's Revenue")).toBeInTheDocument();
    expect(screen.getByText("Transactions Today")).toBeInTheDocument();

    // Verify that NO cost or gross profit headers exist
    expect(screen.queryByText("Gross Profit")).not.toBeInTheDocument();
    expect(screen.queryByText("COGS")).not.toBeInTheDocument();
    expect(screen.queryByText("Performance Overview")).not.toBeInTheDocument();

    // Verify Open POS Terminal button
    expect(
      screen.getByRole("button", { name: /Open POS Terminal/i }),
    ).toBeInTheDocument();
  });
});
