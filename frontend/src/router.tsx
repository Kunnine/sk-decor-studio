import React, { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";

// Branded loading spinner fallback for lazy loaded routes
const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <div className="w-8 h-8 border-2 border-[#795438] border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-semibold text-[#88847D] mt-2.5">
      Loading view...
    </span>
  </div>
);

// Route protector checking token and authentication state
const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-[#795438] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-[#88847D]">
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
const PermissionRoute: React.FC<{ permission: string | string[] }> = ({
  permission,
}) => {
  const { hasPermission } = useAuth();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const isAllowed = permissions.some((p) => hasPermission(p));

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Lazy loaded page components for optimal bundle splitting
const Login = lazy(() =>
  import("./pages/Login").then((m) => ({ default: m.Login })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Pos = lazy(() => import("./pages/Pos").then((m) => ({ default: m.Pos })));
const Sales = lazy(() =>
  import("./pages/Sales").then((m) => ({ default: m.Sales })),
);
const Customers = lazy(() =>
  import("./pages/Customers").then((m) => ({ default: m.Customers })),
);
const Products = lazy(() =>
  import("./pages/Products").then((m) => ({ default: m.Products })),
);
const LowStock = lazy(() =>
  import("./pages/LowStock").then((m) => ({ default: m.LowStock })),
);
const Purchases = lazy(() =>
  import("./pages/Purchases").then((m) => ({ default: m.Purchases })),
);
const Suppliers = lazy(() =>
  import("./pages/Suppliers").then((m) => ({ default: m.Suppliers })),
);
const StockMovements = lazy(() =>
  import("./pages/StockMovements").then((m) => ({ default: m.StockMovements })),
);
const Reports = lazy(() =>
  import("./pages/Reports").then((m) => ({ default: m.Reports })),
);
const Categories = lazy(() =>
  import("./pages/Categories").then((m) => ({ default: m.Categories })),
);
const Units = lazy(() =>
  import("./pages/Units").then((m) => ({ default: m.Units })),
);
const Users = lazy(() =>
  import("./pages/Users").then((m) => ({ default: m.Users })),
);
const AuditLogs = lazy(() =>
  import("./pages/AuditLogs").then((m) => ({ default: m.AuditLogs })),
);
const Settings = lazy(() =>
  import("./pages/Settings").then((m) => ({ default: m.Settings })),
);
const Notifications = lazy(() =>
  import("./pages/Notifications").then((m) => ({ default: m.Notifications })),
);
const Profile = lazy(() =>
  import("./pages/Profile").then((m) => ({ default: m.Profile })),
);

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: "/login",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        ),
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
            element: (
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            ),
          },
          {
            path: "/pos",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Pos />
              </Suspense>
            ),
          },
          {
            path: "/sales",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Sales />
              </Suspense>
            ),
          },
          {
            path: "/customers",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Customers />
              </Suspense>
            ),
          },
          {
            path: "/products",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Products />
              </Suspense>
            ),
          },
          {
            path: "/products/low-stock",
            element: (
              <Suspense fallback={<PageLoader />}>
                <LowStock />
              </Suspense>
            ),
          },
          {
            element: <PermissionRoute permission="purchases.view" />,
            children: [
              {
                path: "/purchases",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Purchases />
                  </Suspense>
                ),
              },
            ],
          },
          {
            element: <PermissionRoute permission="suppliers.view" />,
            children: [
              {
                path: "/suppliers",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Suppliers />
                  </Suspense>
                ),
              },
            ],
          },
          {
            element: <PermissionRoute permission="stock_movements.view" />,
            children: [
              {
                path: "/stock-movements",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <StockMovements />
                  </Suspense>
                ),
              },
            ],
          },
          {
            element: <PermissionRoute permission="reports.view" />,
            children: [
              {
                path: "/reports",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Reports />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: "/categories",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Categories />
              </Suspense>
            ),
          },
          {
            path: "/units",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Units />
              </Suspense>
            ),
          },
          {
            element: <PermissionRoute permission="users.manage" />,
            children: [
              {
                path: "/users",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Users />
                  </Suspense>
                ),
              },
            ],
          },
          {
            element: <PermissionRoute permission="audit.view" />,
            children: [
              {
                path: "/audit-logs",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <AuditLogs />
                  </Suspense>
                ),
              },
            ],
          },
          {
            element: <PermissionRoute permission="settings.manage" />,
            children: [
              {
                path: "/settings",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Settings />
                  </Suspense>
                ),
              },
            ],
          },
          {
            element: <PermissionRoute permission="notifications.view" />,
            children: [
              {
                path: "/notifications",
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Notifications />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: "/profile",
            element: (
              <Suspense fallback={<PageLoader />}>
                <Profile />
              </Suspense>
            ),
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
