import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Package,
  Layers,
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  Ruler,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  Receipt,
  UserCheck,
  Truck,
  ArrowLeftRight,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../ui/Badge";
import { NotificationDropdown } from "./NotificationDropdown";

export const AppLayout: React.FC = () => {
  const { user, logout, settings, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const configuredName = settings?.business_name?.trim();
  const businessName =
    configuredName && configuredName !== "Apex Retail Solutions"
      ? configuredName
      : "Maison Decor Studio";
  const logoUrl = settings?.business_logo_url;

  // Navigation items driven strictly by user permissions
  const navItems = [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: LayoutDashboard,
      visible: true,
    },
    {
      label: "POS Checkout",
      to: "/pos",
      icon: ShoppingCart,
      visible: hasPermission("sales.create"),
    },
    {
      label: "Sales Records",
      to: "/sales",
      icon: Receipt,
      visible: hasPermission("sales.view") || hasPermission("sales.view_own"),
    },
    {
      label: "Customers",
      to: "/customers",
      icon: UserCheck,
      visible: hasPermission("customers.view"),
    },
    {
      label: "Products",
      to: "/products",
      icon: Package,
      visible: hasPermission("products.view"),
    },
    {
      label: "Low Stock",
      to: "/products/low-stock",
      icon: AlertTriangle,
      visible: hasPermission("products.view"),
    },
    {
      label: "Purchases",
      to: "/purchases",
      icon: Truck,
      visible: hasPermission("purchases.view"),
    },
    {
      label: "Suppliers",
      to: "/suppliers",
      icon: Users,
      visible: hasPermission("suppliers.view"),
    },
    {
      label: "Stock History",
      to: "/stock-movements",
      icon: ArrowLeftRight,
      visible: hasPermission("stock_movements.view"),
    },
    {
      label: "Reports",
      to: "/reports",
      icon: BarChart3,
      visible: hasPermission("reports.view"),
    },
    {
      label: "Categories",
      to: "/categories",
      icon: Layers,
      visible: hasPermission("categories.view"),
    },
    {
      label: "Units",
      to: "/units",
      icon: Ruler,
      visible: hasPermission("units.view"),
    },
    {
      label: "Staff Users",
      to: "/users",
      icon: Users,
      visible: hasPermission("users.manage"),
    },
    {
      label: "Audit Logs",
      to: "/audit-logs",
      icon: ShieldCheck,
      visible: hasPermission("audit.view"),
    },
    {
      label: "Settings",
      to: "/settings",
      icon: SettingsIcon,
      visible: hasPermission("settings.manage"),
    },
  ].filter((item) => item.visible);

  return (
    <div className="h-screen overflow-hidden bg-[#F8F6F2] flex flex-col text-[#292824] font-sans">
      {/* Mobile Header */}
      <div className="md:hidden shrink-0 relative z-20 bg-[#FFFFFF] border-b border-[#E8E3DA] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="w-8 h-8 rounded-lg object-contain shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#795438] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {businessName.substring(0, 2)}
            </div>
          )}
          <span className="font-semibold text-[#292824] text-sm truncate max-w-[180px]">
            {businessName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasPermission("notifications.view") && <NotificationDropdown />}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg border border-[#E8E3DA] text-[#88847D] hover:bg-[#F8F6F2] hover:text-[#292824]"
            aria-label="Toggle Navigation Menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#292824]/30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — Dark Warm Brown (#795438), Fixed Full Viewport Height */}
      <aside
        aria-label="Sidebar Navigation"
        className={`fixed top-0 left-0 z-40 md:z-30 h-screen w-64 bg-[#795438] text-[#F8F6F2] border-r border-[#67462D] flex flex-col overflow-x-hidden transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 shrink-0 border-b border-white/15 px-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="w-8 h-8 rounded-lg object-contain border border-white/20 bg-white shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#F8F6F2] text-[#795438] flex items-center justify-center font-bold text-xs uppercase shadow-none shrink-0">
                {businessName.substring(0, 2)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-semibold text-white leading-tight truncate tracking-tight">
                {businessName}
              </h1>
              <p className="text-[11px] text-[#E6DDD1] font-normal truncate">
                Interior Decor Studio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1 rounded-md text-[#E6DDD1] hover:text-white hover:bg-white/10 shrink-0"
            aria-label="Close Navigation Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation (Scrolls internally only if menu exceeds viewport height) */}
        <nav className="sidebar-scroll flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/products"}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#F8F6F2] text-[#795438] font-semibold shadow-none"
                      : "text-[#F3EDE6]/90 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Profile / Logout */}
        <div className="shrink-0 p-4 border-t border-white/15 bg-[#6B4A31]">
          <div
            onClick={() => {
              navigate("/profile");
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center justify-between mb-3 cursor-pointer p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Edit Profile & Preferences"
          >
            <div className="truncate mr-2">
              <div className="text-xs font-semibold text-white truncate">
                {user?.name}
              </div>
              <div className="text-[11px] text-[#E6DDD1] truncate">
                {user?.email}
              </div>
            </div>
            <Badge
              variant="outline"
              size="sm"
              className="uppercase text-[10px] tracking-wide shrink-0 border-white/25 text-[#F8F6F2] bg-white/10"
            >
              {user?.role}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigate("/profile");
                setIsMobileMenuOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[#F8F6F2] bg-white/10 border border-white/15 rounded-lg hover:bg-white/20 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[#F8F6F2] bg-white/10 border border-white/15 rounded-lg hover:bg-white/20 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area — Warm Ivory (#F8F6F2) */}
      <div className="flex-1 min-h-0 flex flex-col min-w-0 md:ml-64 md:w-[calc(100%-16rem)] overflow-hidden bg-[#F8F6F2]">
        {/* Top Navbar */}
        <header className="h-16 shrink-0 relative z-20 bg-[#F8F6F2] border-b border-[#E8E3DA] px-6 md:px-8 flex items-center justify-between">
          <div className="text-xs font-medium text-[#88847D] uppercase tracking-widest truncate">
            {businessName}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Real Top Bar Notification Dropdown with 60s Polling */}
            {hasPermission("notifications.view") && <NotificationDropdown />}

            {/* Quick Profile Link */}
            <button
              onClick={() => navigate("/profile")}
              className="p-2 rounded-lg border border-[#E8E3DA] bg-white text-[#88847D] hover:text-[#292824] hover:bg-[#F3EDE6] focus:outline-none focus:ring-2 focus:ring-[#795438] transition-colors"
              title="Account Preferences"
              aria-label="Account Preferences"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 p-6 md:p-8 overflow-y-auto overflow-x-hidden bg-[#F8F6F2]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
