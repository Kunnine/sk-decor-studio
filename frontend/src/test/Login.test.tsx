import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Login } from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';

// Mock auth context or api
vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({
      token: 'fake-token',
      user: { id: 1, name: 'Admin', email: 'admin@inventory.test', role: 'admin' },
    }),
    me: vi.fn().mockRejectedValue(new Error('unauthenticated')),
  },
}));

describe('Login Component', () => {
  it('renders login form and demo fill buttons', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manager/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cashier/i })).toBeInTheDocument();
  });

  it('populates credentials when clicking demo buttons', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const adminBtn = screen.getByRole('button', { name: /admin/i });
    fireEvent.click(adminBtn);

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(emailInput.value).toBe('admin@inventory.test');
  });

  it('shows validation error when email is invalid', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });
});
