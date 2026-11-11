import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { AuthContext } from "../context/AuthContext";

vi.mock("../api/notifications", () => ({
  notificationApi: {
    list: vi.fn().mockResolvedValue({ data: [], meta: { unread_count: 0 } }),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const makeAuth = (businessName = "Maison Decor Studio"): any => ({
  user: {
    id: 1,
    name: "Elena Manager",
    email: "manager@maisondecor.test",
    role: "admin",
  },
  token: "token-1",
  permissions: ["*"],
  isAdmin: true,
  isManager: false,
  isCashier: false,
  hasRole: () => true,
  hasPermission: () => true,
  logout: vi.fn(),
  settings: {
    business_name: businessName,
    currency_symbol: "$",
    currency_code: "USD",
    tax_rate: 10,
  },
  formatMoney: (v: any) => `$${Number(v || 0).toFixed(2)}`,
});

const renderLayout = (businessName?: string, initialPath = "/dashboard") =>
  render(
    <QueryClientProvider client={createClient()}>
      <AuthContext.Provider value={makeAuth(businessName)}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route
                path="/dashboard"
                element={<div data-testid="page-body">Dashboard Content</div>}
              />
              <Route
                path="/products"
                element={<div data-testid="page-body">Products Content</div>}
              />
              <Route
                path="/products/low-stock"
                element={<div data-testid="page-body">Low Stock Content</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );

describe("AppLayout fixed sidebar and independent scrolling layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the sidebar fixed full viewport height with internal nav scrolling and theme colors", () => {
    const { container } = renderLayout();

    const shell = container.firstElementChild as HTMLElement;
    expect(shell.className).toContain("h-screen");
    expect(shell.className).toContain("overflow-hidden");
    expect(shell.className).toContain("bg-[#F8F6F2]");

    const aside = screen.getByLabelText("Sidebar Navigation");
    expect(aside.className).toContain("fixed");
    expect(aside.className).toContain("top-0");
    expect(aside.className).toContain("left-0");
    expect(aside.className).toContain("h-screen");
    expect(aside.className).toContain("w-64");
    expect(aside.className).toContain("bg-[#795438]");
    expect(aside.className).not.toContain("md:static");

    const nav = aside.querySelector("nav") as HTMLElement;
    expect(nav.className).toContain("flex-1");
    expect(nav.className).toContain("min-h-0");
    expect(nav.className).toContain("overflow-y-auto");
    expect(nav.className).toContain("sidebar-scroll");
  });

  it("offsets and constrains the right content area and scrolls main independently without horizontal overflow", () => {
    const { container } = renderLayout();

    const main = container.querySelector("main") as HTMLElement;
    expect(main.className).toContain("flex-1");
    expect(main.className).toContain("min-h-0");
    expect(main.className).toContain("overflow-y-auto");
    expect(main.className).toContain("overflow-x-hidden");
    expect(main.className).toContain("bg-[#F8F6F2]");

    const contentWrapper = main.parentElement as HTMLElement;
    expect(contentWrapper.className).toContain("md:ml-64");
    expect(contentWrapper.className).toContain("md:w-[calc(100%-16rem)]");
    expect(contentWrapper.className).toContain("overflow-hidden");
    expect(contentWrapper.className).toContain("min-w-0");

    const header = contentWrapper.querySelector("header") as HTMLElement;
    expect(header.className).toContain("shrink-0");
    expect(header.className).toContain("h-16");
  });

  it("displays Maison Decor Studio and Interior Decor Studio branding at the top of the sidebar", () => {
    renderLayout("Apex Retail Solutions");

    const aside = screen.getByLabelText("Sidebar Navigation");
    expect(aside).toHaveTextContent("Maison Decor Studio");
    expect(aside).toHaveTextContent("Interior Decor Studio");
  });

  it("toggles the mobile sidebar drawer and closes on backdrop, close button, and nav link click", () => {
    const { container } = renderLayout();
    const aside = screen.getByLabelText("Sidebar Navigation");
    const toggleBtn = screen.getByLabelText("Toggle Navigation Menu");

    expect(aside.className).toContain("-translate-x-full");
    fireEvent.click(toggleBtn);
    expect(aside.className).toContain("translate-x-0");

    // Backdrop closes drawer
    const backdrop = container.querySelector(
      'div.fixed.inset-0[aria-hidden="true"]',
    ) as HTMLElement;
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop);
    expect(aside.className).toContain("-translate-x-full");

    // Close button inside mobile drawer closes drawer
    fireEvent.click(toggleBtn);
    expect(aside.className).toContain("translate-x-0");
    fireEvent.click(screen.getByLabelText("Close Navigation Menu"));
    expect(aside.className).toContain("-translate-x-full");

    // Clicking nav item navigates and closes drawer
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getByRole("link", { name: "Products" }));
    expect(aside.className).toContain("-translate-x-full");
    expect(screen.getByTestId("page-body")).toHaveTextContent(
      "Products Content",
    );
  });

  it("highlights Products and Low Stock independently in the left sidebar", () => {
    renderLayout("Maison Decor Studio", "/products/low-stock");

    const productsLink = screen.getByRole("link", { name: "Products" });
    const lowStockLink = screen.getByRole("link", { name: "Low Stock" });

    expect(lowStockLink.className).toContain("bg-[#F8F6F2]");
    expect(productsLink.className).not.toContain("bg-[#F8F6F2]");

    fireEvent.click(productsLink);
    expect(screen.getByTestId("page-body")).toHaveTextContent(
      "Products Content",
    );
    expect(productsLink.className).toContain("bg-[#F8F6F2]");
  });
});
