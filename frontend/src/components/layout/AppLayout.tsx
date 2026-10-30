import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Package,
  Layers,
  LayoutDashboard,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  BarChart3,
  Users,
  LogOut,
  Bell,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';

export const AppLayout: React.FC = () => {
  const { user, logout, isAdmin, isManager, isCashier } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Products', to: '/products', icon: Package },
    { label: 'Categories', to: '/categories', icon: Layers },
    { label: 'Purchases', to: '/purchases', icon: Truck, hidden: isCashier },
    { label: 'Sales / POS', to: '/sales', icon: ShoppingCart },
    { label: 'Stock Movements', to: '/movements', icon: ArrowLeftRight, hidden: isCashier },
    { label: 'Reports', to: '/reports', icon: BarChart3, hidden: isCashier },
    { label: 'Users & Roles', to: '/users', icon: Users, hidden: !isAdmin },
  ].filter((item) => !item.hidden);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-slate-900">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4338CA] text-white flex items-center justify-center font-bold text-sm">
            IS
          </div>
          <span className="font-semibold text-slate-900 text-sm">Inventory & Sales</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 border-b border-slate-200 px-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#4338CA] text-white flex items-center justify-center font-bold text-sm shadow-none">
            IS
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Inventory System</h1>
            <p className="text-[11px] text-slate-500 font-medium">Enterprise Management</p>
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
                      ? 'bg-[#4338CA] text-white shadow-none'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
              <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
            </div>
            <Badge variant="primary" size="sm" className="uppercase text-[10px] tracking-wide shrink-0">
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
          <div className="text-sm font-semibold text-slate-700">
            System Status: <span className="font-bold text-slate-900">Operational</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Low stock quick notification button (Amber warning badge) */}
            <button
              onClick={() => navigate('/products?low_stock=true')}
              className="relative p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              title="Notifications"
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
