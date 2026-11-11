import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { Login } from "../pages/Login";
import { AuthProvider } from "../context/AuthContext";
import { authApi } from "../api/auth";

// Mock auth api
vi.mock("../api/auth", () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({
      token: "fake-token",
      user: {
        id: 1,
        name: "Admin",
        email: "admin@inventory.test",
        role: "admin",
      },
    }),
    me: vi.fn().mockRejectedValue(new Error("unauthenticated")),
  },
}));

describe("Login Component", () => {
  it("renders login form with email and password fields without demo credentials", () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>,
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();

    // Verify demo buttons are not present
    expect(
      screen.queryByRole("button", { name: /^admin$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^manager$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^cashier$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/one-click demo credentials/i),
    ).not.toBeInTheDocument();
  });

  it("allows user to manually input email and password and submit", async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);

    fireEvent.change(emailInput, {
      target: { value: "user@customdomain.com" },
    });
    fireEvent.change(passwordInput, { target: { value: "MySecretPass!23" } });

    expect((emailInput as HTMLInputElement).value).toBe(
      "user@customdomain.com",
    );
    expect((passwordInput as HTMLInputElement).value).toBe("MySecretPass!23");

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: "user@customdomain.com",
        password: "MySecretPass!23",
      });
    });
  });

  it("toggles password visibility when clicking the eye icon button", async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>,
    );

    const passwordInput = (await screen.findByLabelText(
      /^password/i,
    )) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByRole("button", { name: /show password/i });
    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe("text");
    expect(
      screen.getByRole("button", { name: /hide password/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput.type).toBe("password");
  });

  it("shows validation error when email is invalid", async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.submit(submitBtn.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });
});
