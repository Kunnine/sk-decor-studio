import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AuthProvider, useAuth } from "../context/AuthContext";

vi.mock("../api/auth", () => ({
  authApi: {
    me: vi.fn().mockRejectedValue(new Error("unauthenticated")),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

const TestConsumer: React.FC = () => {
  const { formatMoney, hasPermission } = useAuth();
  return (
    <div>
      <span data-testid="money">{formatMoney(45.5)}</span>
      <span data-testid="money-zero">{formatMoney(0)}</span>
      <span data-testid="money-null">{formatMoney(null)}</span>
      <span data-testid="perm-check">
        {hasPermission("products.manage") ? "yes" : "no"}
      </span>
    </div>
  );
};

describe("AuthContext Utilities", () => {
  it("formats money with default currency symbol correctly", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("money").textContent).toBe("$45.50");
    expect(screen.getByTestId("money-zero").textContent).toBe("$0.00");
    expect(screen.getByTestId("money-null").textContent).toBe("-");
  });

  it("evaluates permissions accurately", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("perm-check").textContent).toBe("no");
  });
});
