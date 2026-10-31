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
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../ui/Badge";

export const AppLayout: React.FC = () => {
  const { user, logout, settings, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const businessName = settings?.business_name || "Inventory System";
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
      label: "Products",
      to: "/products",
      icon: Package,
      visible: hasPermission("products.view"),
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
      label: "Users",
      to: "/users",
      icon: Users,
      visible: hasPermission("users.manage"),
    },
    {
      label: "Settings",
      to: "/settings",
      icon: SettingsIcon,
      visible: hasPermission("settings.manage"),
    },
  ].filter((item) => item.visible);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="w-8 h-8 rounded-lg object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#4338CA] text-white flex items-center justify-center font-bold text-xs uppercase">
              {businessName.substring(0, 2)}
            </div>
          )}
          <span className="font-semibold text-slate-900 text-sm truncate max-w-[180px]">
            {businessName}
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 border-b border-slate-200 px-6 flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="w-8 h-8 rounded-lg object-contain border border-slate-200 bg-white"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#4338CA] text-white flex items-center justify-center font-bold text-xs uppercase shadow-none">
              {businessName.substring(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
              {businessName}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              Inventory & Sales
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-[#4338CA] text-white shadow-none"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="truncate mr-2">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.name}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {user?.email}
              </div>
            </div>
            <Badge
              variant="primary"
              size="sm"
              className="uppercase text-[10px] tracking-wide shrink-0"
            >
              {user?.role}
            </Badge>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {businessName}
          </div>

          <div className="flex items-center gap-3">
            {/* Low stock quick notification button (Amber warning badge) */}
            <button
              onClick={() => navigate("/products?low_stock=true")}
              className="relative p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              title="Low stock alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F59E0B] text-slate-900 font-bold text-[9px] flex items-center justify-center">
                !
              </span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
