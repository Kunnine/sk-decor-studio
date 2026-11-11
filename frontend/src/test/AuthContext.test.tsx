import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../context/AuthContext";
import api from "../api/client";
import { authApi } from "../api/auth";

vi.mock("../api/auth", () => ({
  authApi: {
    me: vi.fn().mockRejectedValue(new Error("unauthenticated")),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

const TestConsumer: React.FC = () => {
  const { user, isAdmin, isCashier, formatMoney, hasPermission, hasRole } =
    useAuth();
  return (
    <div>
      <span data-testid="money">{formatMoney(45.5)}</span>
      <span data-testid="money-zero">{formatMoney(0)}</span>
      <span data-testid="money-null">{formatMoney(null)}</span>
      <span data-testid="user-role">{user?.role ?? "none"}</span>
      <span data-testid="is-admin">{isAdmin ? "yes" : "no"}</span>
      <span data-testid="is-cashier">{isCashier ? "yes" : "no"}</span>
      <span data-testid="can-manage-role">
        {hasRole(["admin", "manager"]) ? "yes" : "no"}
      </span>
      <span data-testid="perm-check">
        {hasPermission("products.manage") ? "yes" : "no"}
      </span>
    </div>
  );
};

describe("AuthContext Utilities & Cross-Tab Synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

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

  it("synchronizes role and permissions across tabs on storage events and invokes onSessionChange", async () => {
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

    localStorage.setItem("auth_token", "admin-token");
    localStorage.setItem("auth_user", JSON.stringify(adminUser));
    localStorage.setItem(
      "auth_permissions",
      JSON.stringify(["products.view", "products.manage", "suppliers.view"]),
    );

    vi.mocked(authApi.me).mockResolvedValueOnce({
      user: adminUser as any,
      permissions: ["products.view", "products.manage", "suppliers.view"],
      settings: { business_name: "Maison Decor Studio" } as any,
    });

    const onSessionChange = vi.fn();

    render(
      <AuthProvider onSessionChange={onSessionChange}>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("user-role").textContent).toBe("admin");
    expect(screen.getByTestId("can-manage-role").textContent).toBe("yes");
    expect(screen.getByTestId("perm-check").textContent).toBe("yes");

    // Simulate another tab logging in as Cashier
    vi.mocked(authApi.me).mockResolvedValueOnce({
      user: cashierUser as any,
      permissions: ["products.view", "sales.create"],
      settings: { business_name: "Maison Decor Studio" } as any,
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
      expect(screen.getByTestId("user-role").textContent).toBe("cashier");
      expect(screen.getByTestId("is-admin").textContent).toBe("no");
      expect(screen.getByTestId("is-cashier").textContent).toBe("yes");
      expect(screen.getByTestId("can-manage-role").textContent).toBe("no");
      expect(screen.getByTestId("perm-check").textContent).toBe("no");
    });

    expect(onSessionChange).toHaveBeenCalled();

    // Simulate another tab signing out
    act(() => {
      localStorage.removeItem("auth_token");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "auth_token",
          oldValue: "cashier-token",
          newValue: null,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-role").textContent).toBe("none");
      expect(screen.getByTestId("is-cashier").textContent).toBe("no");
      expect(localStorage.getItem("auth_user")).toBeNull();
      expect(localStorage.getItem("auth_permissions")).toBeNull();
    });
  });

  it("clears all auth storage keys on 401 responses", async () => {
    const adminUser = {
      id: 1,
      name: "Admin User",
      email: "admin@inventory.test",
      role: "admin",
    };

    localStorage.setItem("auth_token", "expired-token");
    localStorage.setItem("auth_user", JSON.stringify(adminUser));
    localStorage.setItem("auth_permissions", JSON.stringify(["products.manage"]));
    localStorage.setItem(
      "auth_settings",
      JSON.stringify({ business_name: "Maison Decor Studio" }),
    );

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, pathname: "/login" },
    });

    try {
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");
      const rejectedHandler = (api.interceptors.response as any).handlers[0]
        .rejected;

      await expect(
        rejectedHandler({ response: { status: 401 } }),
      ).rejects.toBeTruthy();

      expect(localStorage.getItem("auth_token")).toBeNull();
      expect(localStorage.getItem("auth_user")).toBeNull();
      expect(localStorage.getItem("auth_permissions")).toBeNull();
      expect(localStorage.getItem("auth_settings")).toBeNull();
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "auth:sync" }),
      );
      dispatchSpy.mockRestore();
    } finally {
      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    }
  });
});
