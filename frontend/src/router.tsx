import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';

// Route protector checking token and authentication state
const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-[#4338CA] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-600">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const PublicOnlyRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) {
    return <Navigate to="/products" replace />;
  }

  return <Outlet />;
};

// Placeholder for future phase routes
const PhasePlaceholder: React.FC<{ phase: string; title: string }> = ({ phase, title }) => (
  <div className="p-8 bg-white border border-slate-200 rounded-lg text-center max-w-xl mx-auto my-12">
    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center mx-auto mb-3 font-bold text-sm">
      {phase}
    </div>
    <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
    <p className="text-xs text-slate-500">
      This module is scheduled for {phase} and will unlock at the next phase gate.
    </p>
  </div>
);

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: <Navigate to="/products" replace />,
          },
          {
            path: '/products',
            element: <Products />,
          },
          {
            path: '/categories',
            element: <Categories />,
          },
          {
            path: '/dashboard',
            element: <PhasePlaceholder phase="Phase 4" title="Sales Analytics Dashboard" />,
          },
          {
            path: '/purchases',
            element: <PhasePlaceholder phase="Phase 2" title="Purchases & Stock-In" />,
          },
          {
            path: '/sales',
            element: <PhasePlaceholder phase="Phase 3" title="Point of Sale & Checkout" />,
          },
          {
            path: '/movements',
            element: <PhasePlaceholder phase="Phase 2" title="Stock Movements & Adjustments" />,
          },
          {
            path: '/reports',
            element: <PhasePlaceholder phase="Phase 4" title="Reports & CSV Export" />,
          },
          {
            path: '/users',
            element: <PhasePlaceholder phase="Phase 1" title="User Management" />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/products" replace />,
  },
]);
