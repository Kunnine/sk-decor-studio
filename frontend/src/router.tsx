import React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Products } from "./pages/Products";
import { Categories } from "./pages/Categories";
import { Units } from "./pages/Units";
import { Users } from "./pages/Users";
import { Settings } from "./pages/Settings";

// Route protector checking token and authentication state
const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-[#4338CA] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-600">
            Loading session...
          </span>
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
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Permission Guard Route
const PermissionRoute: React.FC<{ permission: string }> = ({ permission }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: "/login",
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
            path: "/",
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "/dashboard",
            element: <Dashboard />,
          },
          {
            path: "/products",
            element: <Products />,
          },
          {
            path: "/categories",
            element: <Categories />,
          },
          {
            path: "/units",
            element: <Units />,
          },
          {
            element: <PermissionRoute permission="users.manage" />,
            children: [
              {
                path: "/users",
                element: <Users />,
              },
            ],
          },
          {
            element: <PermissionRoute permission="settings.manage" />,
            children: [
              {
                path: "/settings",
                element: <Settings />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
