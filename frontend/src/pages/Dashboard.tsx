import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  BarChart3,
  Package,
  Receipt,
  ShoppingCart,
  ChevronRight,
  RefreshCw,
  Layers,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { analyticsApi } from "../api/analytics";
import { productApi } from "../api/products";
import { saleApi } from "../api/sales";
import { useDateRange } from "../hooks/useDateRange";
import { DateRangePicker } from "../components/ui/DateRangePicker";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  SalesTrendPoint,
  TopProductAnalytics,
  CategorySalesAnalytics,
  PaymentMethodAnalytics,
  Sale,
  Product,
} from "../types";

export const Dashboard: React.FC = () => {
  const { user, settings, formatMoney, isCashier } = useAuth();
  const navigate = useNavigate();
  const { from, to, preset, setRange } = useDateRange();

  // Top products toggle: "qty" or "revenue"
  const [topProductsBy, setTopProductsBy] = useState<"qty" | "revenue">("qty");

  // Chart table view toggles
  const [showTrendTable, setShowTrendTable] = useState(false);
  const [showTopProductsTable, setShowTopProductsTable] = useState(false);
  const [showCategoryTable, setShowCategoryTable] = useState(false);
  const [showPaymentTable, setShowPaymentTable] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // --------------------------------------------------------------------------
  // Cashier queries: only their own sales today, no cost, no profit
  // --------------------------------------------------------------------------
  const {
    data: cashierSalesData,
    isLoading: cashierLoading,
    refetch: cashierRefetch,
  } = useQuery({
    queryKey: ["cashier-sales-today", todayStr],
    queryFn: () =>
      saleApi.list({
        date_from: todayStr,
        date_to: todayStr,
        status: "completed",
        per_page: 50,
      }),
    enabled: isCashier,
  });

  const cashierSales: Sale[] = cashierSalesData?.data ?? [];
  const cashierTotalRevenue = cashierSales.reduce(
    (sum, s) => sum + parseFloat(s.total || "0"),
    0,
  );
  const cashierTotalOrders = cashierSales.length;
  const cashierAvgOrder =
    cashierTotalOrders > 0 ? cashierTotalRevenue / cashierTotalOrders : 0;

  // --------------------------------------------------------------------------
  // Admin & Manager Analytics queries
  // --------------------------------------------------------------------------
  const {
    data: summaryData,
    isLoading: summaryLoading,
    refetch: summaryRefetch,
  } = useQuery({
    queryKey: ["analytics-summary", from, to],
    queryFn: () => analyticsApi.summary({ from, to }),
    enabled: !isCashier,
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["analytics-sales-trend", from, to],
    queryFn: () => analyticsApi.salesTrend({ from, to }),
    enabled: !isCashier,
  });

  const { data: topProductsData, isLoading: topProductsLoading } = useQuery({
    queryKey: ["analytics-top-products", from, to, topProductsBy],
    queryFn: () => analyticsApi.topProducts({ from, to, by: topProductsBy }),
    enabled: !isCashier,
  });

  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ["analytics-sales-by-category", from, to],
    queryFn: () => analyticsApi.salesByCategory({ from, to }),
    enabled: !isCashier,
  });

  const { data: paymentData, isLoading: paymentLoading } = useQuery({
    queryKey: ["analytics-payment-methods", from, to],
    queryFn: () => analyticsApi.paymentMethods({ from, to }),
    enabled: !isCashier,
  });

  // Top 5 low-stock items
  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: () => productApi.lowStock({ per_page: 5 }),
    enabled: !isCashier,
  });

  // Latest 5 completed sales
  const { data: recentSalesData, isLoading: recentSalesLoading } = useQuery({
    queryKey: ["dashboard-recent-sales"],
    queryFn: () => saleApi.list({ per_page: 5, status: "completed" }),
    enabled: !isCashier,
  });

  const lowStockItems: Product[] = lowStockData?.data ?? [];
  const recentSales: Sale[] = recentSalesData?.data ?? [];

  // Helper for trend change formatting (Strict: neutral warm text, no red or green)
  const renderTrendChange = (
    pct: number | null | undefined,
    diff: number | null | undefined,
    isMoney: boolean = false,
  ) => {
    if (pct === null || pct === undefined || isNaN(pct)) {
      return (
        <span className="text-[11px] font-medium text-[#88847D]">
          No prior period
        </span>
      );
    }
    const isPositive = pct > 0;
    const isNeutral = pct === 0;

    return (
      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#292824]">
        {!isNeutral &&
          (isPositive ? (
            <ArrowUp className="w-3.5 h-3.5 text-[#795438]" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-[#88847D]" />
          ))}
        <span>
          {isPositive ? "+" : ""}
          {pct.toFixed(1)}% ({isPositive ? "+" : ""}
          {isMoney ? formatMoney(diff ?? 0) : (diff ?? 0).toLocaleString()})
        </span>
        <span className="text-[#88847D] font-normal">vs prev</span>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // REDUCED VIEW FOR CASHIERS
  // --------------------------------------------------------------------------
  if (isCashier) {
    return (
      <div className="space-y-6">
        {/* Cashier Header */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-6 shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#88847D]">
                  {settings?.business_name || "Maison Decor Studio"}
                </span>
                <Badge
                  variant="primary"
                  size="sm"
                  className="uppercase font-bold text-[10px]"
                >
                  Cashier
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-[#292824]">
                Welcome, {user?.name}
              </h1>
              <p className="text-xs text-[#88847D] mt-1">
                Your point of sale station and today&apos;s registered
                transactions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => cashierRefetch()}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/pos")}
                className="gap-1.5"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Open POS Terminal</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Cashier KPI Cards (No cost, no profit) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#88847D]">
                Today&apos;s Revenue
              </span>
              <DollarSign className="w-4 h-4 text-[#795438]" />
            </div>
            <div className="mt-3">
              {cashierLoading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <div className="text-2xl font-bold text-[#292824]">
                  {formatMoney(cashierTotalRevenue)}
                </div>
              )}
              <div className="text-[11px] text-[#88847D] mt-1">
                Completed transactions today
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#88847D]">
                Transactions Today
              </span>
              <ShoppingBag className="w-4 h-4 text-[#795438]" />
            </div>
            <div className="mt-3">
              {cashierLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-[#292824]">
                  {cashierTotalOrders}
                </div>
              )}
              <div className="text-[11px] text-[#88847D] mt-1">
                Orders rung up by you
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#88847D]">
                Average Transaction
              </span>
              <TrendingUp className="w-4 h-4 text-[#795438]" />
            </div>
            <div className="mt-3">
              {cashierLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-2xl font-bold text-[#292824]">
                  {formatMoney(cashierAvgOrder)}
                </div>
              )}
              <div className="text-[11px] text-[#88847D] mt-1">
                Revenue per order today
              </div>
            </div>
          </div>
        </div>

        {/* Cashier Recent Transactions Table */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8E3DA] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#292824]">
                Your Sales Today
              </h2>
              <p className="text-xs text-[#88847D]">
                Recent orders completed at your terminal
              </p>
            </div>
            <Link
              to="/sales"
              className="text-xs font-semibold text-[#795438] hover:underline flex items-center gap-1"
            >
              <span>View all sales</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {cashierLoading ? (
            <div className="p-5 space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : cashierSales.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Receipt className="w-8 h-8 text-[#A58B6F]" />}
                title="No sales yet today"
                description="Start ringing up customer orders through the POS terminal."
                actionLabel="Open POS"
                onAction={() => navigate("/pos")}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] font-semibold">
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Payment</th>
                    <th className="py-2.5 px-4 text-right">Items</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA] text-[#292824]">
                  {cashierSales.slice(0, 10).map((sale) => (
                    <tr key={sale.id} className="hover:bg-[#FAF8F4]">
                      <td className="py-2.5 px-4 font-semibold text-[#292824]">
                        {sale.invoice?.number || `#${sale.id}`}
                      </td>
                      <td className="py-2.5 px-4 text-[#88847D]">
                        {sale.sold_at
                          ? new Date(sale.sold_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="py-2.5 px-4">
                        {sale.customer?.name || "Walk-in Customer"}
                      </td>
                      <td className="py-2.5 px-4 capitalize">
                        {sale.payment_method.replace("_", " ")}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {sale.items?.length ?? 0}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#292824]">
                        {formatMoney(sale.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ADMIN & MANAGER FULL DASHBOARD
  // --------------------------------------------------------------------------
  const summary = summaryData;

  return (
    <div className="space-y-6">
      {/* Top Header & Date Range Control */}
      <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#88847D]">
              {settings?.business_name || "Maison Decor Studio"}
            </span>
            <Badge
              variant="primary"
              size="sm"
              className="uppercase font-bold text-[10px]"
            >
              {user?.role}
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-[#292824]">
            Performance Overview
          </h1>
          <p className="text-xs text-[#88847D] mt-0.5">
            Real-time interior decor sales, stock valuation, and catalog health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            preset={preset}
            from={from}
            to={to}
            onChange={setRange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => summaryRefetch()}
            className="p-2"
            title="Refresh metrics"
            aria-label="Refresh metrics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#88847D]" />
          </Button>
        </div>
      </div>

      {/* KPI Cards (Revenue, Orders, Gross Profit, Low-Stock Count) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#88847D]">
              Revenue
            </span>
            <DollarSign className="w-4 h-4 text-[#795438]" />
          </div>
          <div className="mt-3">
            {summaryLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold text-[#292824]">
                {formatMoney(summary?.revenue?.current ?? 0)}
              </div>
            )}
            <div className="mt-2">
              {summaryLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                renderTrendChange(
                  summary?.revenue?.change_pct,
                  summary?.revenue?.change,
                  true,
                )
              )}
            </div>
          </div>
        </div>

        {/* Orders Card */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#88847D]">
              Orders
            </span>
            <ShoppingBag className="w-4 h-4 text-[#795438]" />
          </div>
          <div className="mt-3">
            {summaryLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold text-[#292824]">
                {(summary?.orders?.current ?? 0).toLocaleString()}
              </div>
            )}
            <div className="mt-2">
              {summaryLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                renderTrendChange(
                  summary?.orders?.change_pct,
                  summary?.orders?.change,
                  false,
                )
              )}
            </div>
          </div>
        </div>

        {/* Gross Profit Card */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#88847D]">
              Gross Profit
            </span>
            <TrendingUp className="w-4 h-4 text-[#795438]" />
          </div>
          <div className="mt-3">
            {summaryLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold text-[#292824]">
                {formatMoney(summary?.gross_profit?.current ?? 0)}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              {summaryLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <>
                  {renderTrendChange(
                    summary?.gross_profit?.change_pct,
                    summary?.gross_profit?.change,
                    true,
                  )}
                  <span className="text-[11px] font-bold text-[#795438]">
                    {(summary?.gross_margin_pct?.current ?? 0).toFixed(1)}%
                    margin
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Count Card (Amber Accent Warning strictly for alerts) */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#88847D]">
              Low-Stock Items
            </span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="mt-3">
            {summaryLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-[#292824]">
                  {summary?.low_stock_count?.current ?? 0}
                </div>
                {(summary?.low_stock_count?.current ?? 0) > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B] text-[#292824]">
                    Needs Restock
                  </span>
                )}
              </div>
            )}
            <div className="mt-2">
              <Link
                to="/products/low-stock"
                className="text-[11px] font-semibold text-[#795438] hover:underline flex items-center gap-1"
              >
                <span>View restock list</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog & Inventory Overview Cards (Total Products, Total Categories, Total Stock Value) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Products */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-4 shadow-none flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#88847D] block">
              Total Products
            </span>
            {summaryLoading ? (
              <Skeleton className="h-7 w-16 mt-2" />
            ) : (
              <div className="text-xl font-bold text-[#292824] mt-1">
                {(summary?.total_products ?? 0).toLocaleString()}
              </div>
            )}
            <Link
              to="/products"
              className="text-[11px] font-semibold text-[#795438] hover:underline inline-flex items-center gap-1 mt-1"
            >
              <span>Browse catalog</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#F8F6F2] border border-[#E8E3DA] flex items-center justify-center text-[#795438]">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Total Categories */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-4 shadow-none flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#88847D] block">
              Total Categories
            </span>
            {summaryLoading ? (
              <Skeleton className="h-7 w-16 mt-2" />
            ) : (
              <div className="text-xl font-bold text-[#292824] mt-1">
                {(summary?.total_categories ?? 0).toLocaleString()}
              </div>
            )}
            <Link
              to="/categories"
              className="text-[11px] font-semibold text-[#795438] hover:underline inline-flex items-center gap-1 mt-1"
            >
              <span>Manage hierarchy</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#F8F6F2] border border-[#E8E3DA] flex items-center justify-center text-[#795438]">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Total Stock Value (Cost Valuation) */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-4 shadow-none flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#88847D] block">
              Total Stock Value
            </span>
            {summaryLoading ? (
              <Skeleton className="h-7 w-28 mt-2" />
            ) : (
              <div className="text-xl font-bold text-[#292824] mt-1">
                {formatMoney(summary?.total_stock_value ?? 0)}
              </div>
            )}
            <span className="text-[11px] text-[#88847D] block mt-1">
              Active inventory valuation at cost
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#F8F6F2] border border-[#E8E3DA] flex items-center justify-center text-[#795438]">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Revenue & Profit Trend (Line chart) */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA] mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#292824]">
                Sales & Profit Trend
              </h2>
              <p className="text-xs text-[#88847D]">
                Daily revenue and gross profit over period
              </p>
            </div>
            <button
              onClick={() => setShowTrendTable(!showTrendTable)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#88847D] border border-[#E8E3DA] rounded hover:bg-[#F8F6F2] hover:text-[#292824]"
              title={showTrendTable ? "View as chart" : "View as table"}
            >
              {showTrendTable ? (
                <>
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Chart</span>
                </>
              ) : (
                <>
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table</span>
                </>
              )}
            </button>
          </div>

          {trendLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-56 w-full" />
            </div>
          ) : !trendData || trendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <EmptyState
                icon={<BarChart3 className="w-8 h-8 text-[#A58B6F]" />}
                title="No sales data"
                description="No sales recorded for the selected period."
              />
            </div>
          ) : showTrendTable ? (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <caption className="sr-only">
                  Sales & Profit Trend Table
                </caption>
                <thead>
                  <tr className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] font-semibold sticky top-0">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Orders</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                    <th className="py-2 px-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA] text-[#292824]">
                  {trendData.map((pt: SalesTrendPoint) => (
                    <tr key={pt.date} className="hover:bg-[#FAF8F4]">
                      <td className="py-1.5 px-3 font-medium">{pt.date}</td>
                      <td className="py-1.5 px-3 text-right">{pt.orders}</td>
                      <td className="py-1.5 px-3 text-right font-semibold text-[#292824]">
                        {formatMoney(pt.revenue)}
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        {formatMoney(pt.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#88847D" }}
                    stroke="#DDD6CA"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#88847D" }}
                    stroke="#DDD6CA"
                    tickFormatter={(val) =>
                      `${settings?.currency_symbol || "$"}${val}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#292824",
                      border: "1px solid #4A3828",
                      borderRadius: "8px",
                      color: "#F8F6F2",
                      fontSize: "12px",
                    }}
                    formatter={(val: unknown) => [
                      formatMoney(Number(val ?? 0)),
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                  />
                  {/* Primary series: Dark warm brown #795438 */}
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#795438"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#795438" }}
                  />
                  {/* Secondary series: Warm taupe #A58B6F */}
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Gross Profit"
                    stroke="#A58B6F"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4, fill: "#A58B6F" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Top 10 Products (Horizontal Bar chart) */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA] mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#292824]">
                Top 10 Products
              </h2>
              <p className="text-xs text-[#88847D]">
                Ranked by{" "}
                {topProductsBy === "qty"
                  ? "quantity sold"
                  : "revenue generated"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-[#E8E3DA] p-0.5 bg-[#F8F6F2]">
                <button
                  onClick={() => setTopProductsBy("qty")}
                  className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    topProductsBy === "qty"
                      ? "bg-[#795438] text-white"
                      : "text-[#88847D] hover:text-[#292824]"
                  }`}
                >
                  Qty
                </button>
                <button
                  onClick={() => setTopProductsBy("revenue")}
                  className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    topProductsBy === "revenue"
                      ? "bg-[#795438] text-white"
                      : "text-[#88847D] hover:text-[#292824]"
                  }`}
                >
                  Revenue
                </button>
              </div>

              <button
                onClick={() => setShowTopProductsTable(!showTopProductsTable)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#88847D] border border-[#E8E3DA] rounded hover:bg-[#F8F6F2] hover:text-[#292824]"
                title={showTopProductsTable ? "View as chart" : "View as table"}
              >
                {showTopProductsTable ? (
                  <>
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Chart</span>
                  </>
                ) : (
                  <>
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {topProductsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-56 w-full" />
            </div>
          ) : !topProductsData || topProductsData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <EmptyState
                icon={<Package className="w-8 h-8 text-[#A58B6F]" />}
                title="No product sales"
                description="No products sold in this period."
              />
            </div>
          ) : showTopProductsTable ? (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <caption className="sr-only">Top 10 Products Table</caption>
                <thead>
                  <tr className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] font-semibold sticky top-0">
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA] text-[#292824]">
                  {topProductsData.map((prod: TopProductAnalytics) => (
                    <tr key={prod.id} className="hover:bg-[#FAF8F4]">
                      <td className="py-1.5 px-3 font-medium text-[#292824]">
                        {prod.name}
                      </td>
                      <td className="py-1.5 px-3 text-[#88847D]">{prod.sku}</td>
                      <td className="py-1.5 px-3 text-right font-semibold">
                        {prod.quantity.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-[#292824]">
                        {formatMoney(prod.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProductsData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#88847D" }}
                    stroke="#DDD6CA"
                    tickFormatter={(val) =>
                      topProductsBy === "revenue"
                        ? `${settings?.currency_symbol || "$"}${val}`
                        : String(val)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#292824" }}
                    stroke="#DDD6CA"
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#292824",
                      border: "1px solid #4A3828",
                      borderRadius: "8px",
                      color: "#F8F6F2",
                      fontSize: "12px",
                    }}
                    formatter={(val: unknown) => [
                      topProductsBy === "revenue"
                        ? formatMoney(Number(val ?? 0))
                        : Number(val ?? 0).toLocaleString(),
                      topProductsBy === "revenue" ? "Revenue" : "Quantity Sold",
                    ]}
                  />
                  <Bar
                    dataKey={
                      topProductsBy === "revenue" ? "revenue" : "quantity"
                    }
                    fill="#795438"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 3: Sales by Category (Bar chart, sorted) */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA] mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#292824]">
                Sales by Top Category
              </h2>
              <p className="text-xs text-[#88847D]">
                Revenue rolled up from category descendants
              </p>
            </div>
            <button
              onClick={() => setShowCategoryTable(!showCategoryTable)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#88847D] border border-[#E8E3DA] rounded hover:bg-[#F8F6F2] hover:text-[#292824]"
              title={showCategoryTable ? "View as chart" : "View as table"}
            >
              {showCategoryTable ? (
                <>
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Chart</span>
                </>
              ) : (
                <>
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table</span>
                </>
              )}
            </button>
          </div>

          {categoryLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-56 w-full" />
            </div>
          ) : !categoryData || categoryData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <EmptyState
                icon={<BarChart3 className="w-8 h-8 text-[#A58B6F]" />}
                title="No category sales"
                description="No sales categorized for this period."
              />
            </div>
          ) : showCategoryTable ? (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <caption className="sr-only">Sales by Category Table</caption>
                <thead>
                  <tr className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] font-semibold sticky top-0">
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                    <th className="py-2 px-3 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA] text-[#292824]">
                  {categoryData.map((cat: CategorySalesAnalytics) => (
                    <tr key={cat.category_id} className="hover:bg-[#FAF8F4]">
                      <td className="py-1.5 px-3 font-medium text-[#292824]">
                        {cat.category_name}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-[#292824]">
                        {formatMoney(cat.revenue)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-[#88847D] font-medium">
                        {cat.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
                  <XAxis
                    dataKey="category_name"
                    tick={{ fontSize: 11, fill: "#88847D" }}
                    stroke="#DDD6CA"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#88847D" }}
                    stroke="#DDD6CA"
                    tickFormatter={(val) =>
                      `${settings?.currency_symbol || "$"}${val}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#292824",
                      border: "1px solid #4A3828",
                      borderRadius: "8px",
                      color: "#F8F6F2",
                      fontSize: "12px",
                    }}
                    formatter={(val: unknown) => [
                      formatMoney(Number(val ?? 0)),
                      "Revenue",
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="#A58B6F"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 4: Payment Methods (Bar chart) */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA] mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#292824]">
                Payment Methods
              </h2>
              <p className="text-xs text-[#88847D]">
                Distribution of order payment tenders
              </p>
            </div>
            <button
              onClick={() => setShowPaymentTable(!showPaymentTable)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#88847D] border border-[#E8E3DA] rounded hover:bg-[#F8F6F2] hover:text-[#292824]"
              title={showPaymentTable ? "View as chart" : "View as table"}
            >
              {showPaymentTable ? (
                <>
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Chart</span>
                </>
              ) : (
                <>
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table</span>
                </>
              )}
            </button>
          </div>

          {paymentLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-56 w-full" />
            </div>
          ) : !paymentData || paymentData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <EmptyState
                icon={<BarChart3 className="w-8 h-8 text-[#A58B6F]" />}
                title="No payment records"
                description="No payments recorded in this period."
              />
            </div>
          ) : showPaymentTable ? (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <caption className="sr-only">Payment Methods Table</caption>
                <thead>
                  <tr className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] font-semibold sticky top-0">
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3 text-right">Orders</th>
                    <th className="py-2 px-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA] text-[#292824]">
                  {paymentData.map((pm: PaymentMethodAnalytics) => (
                    <tr
                      key={pm.payment_method}
                      className="hover:bg-[#FAF8F4]"
                    >
                      <td className="py-1.5 px-3 font-medium capitalize text-[#292824]">
                        {pm.payment_method.replace("_", " ")}
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        {pm.orders_count}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-[#292824]">
                        {formatMoney(pm.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={paymentData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
                  <XAxis
                    dataKey="payment_method"
                    tick={{ fontSize: 11, fill: "#88847D" }}
                    stroke="#DDD6CA"
                    tickFormatter={(val) => val.replace("_", " ").toUpperCase()}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#88847D" }}
                    stroke="#DDD6CA"
                    tickFormatter={(val) =>
                      `${settings?.currency_symbol || "$"}${val}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#292824",
                      border: "1px solid #4A3828",
                      borderRadius: "8px",
                      color: "#F8F6F2",
                      fontSize: "12px",
                    }}
                    formatter={(val: unknown) => [
                      formatMoney(Number(val ?? 0)),
                      "Total Revenue",
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Total Revenue"
                    fill="#795438"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Low-stock List (Top 5) & Recent Sales (Latest 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Low-stock Items */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA] mb-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  <h2 className="text-sm font-bold text-[#292824]">
                    Low-Stock Alerts
                  </h2>
                </div>
                <p className="text-xs text-[#88847D]">
                  Products at or below their reorder threshold
                </p>
              </div>
              <Link
                to="/products/low-stock"
                className="text-xs font-semibold text-[#795438] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {lowStockLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<Package className="w-8 h-8 text-[#A58B6F]" />}
                  title="Inventory is healthy"
                  description="All active products are currently above their reorder level."
                />
              </div>
            ) : (
              <div className="divide-y divide-[#E8E3DA]">
                {lowStockItems.slice(0, 5).map((prod) => {
                  const deficit = Math.max(
                    0,
                    prod.reorder_level - prod.stock_qty,
                  );
                  return (
                    <div
                      key={prod.id}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#FAF8F4] rounded px-1"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {prod.thumb_url || prod.image_url ? (
                          <img
                            src={prod.thumb_url || prod.image_url || ""}
                            alt={prod.name}
                            className="w-9 h-9 rounded object-cover border border-[#E8E3DA] shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-[#F8F6F2] border border-[#E8E3DA] flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-[#A58B6F]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#292824] truncate">
                            {prod.name}
                          </p>
                          <p className="text-[11px] text-[#88847D]">
                            SKU: {prod.sku} &bull; {prod.unit?.name || "units"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B] text-[#292824]">
                            {prod.stock_qty} / {prod.reorder_level}
                          </span>
                          <p className="text-[10px] text-[#88847D] mt-0.5">
                            Deficit: -{deficit}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/purchases?create=true&product_id=${prod.id}&suggested_qty=${Math.max(
                                1,
                                prod.reorder_level * 2 - prod.stock_qty,
                              )}`,
                            )
                          }
                          className="h-7 px-2 text-[11px]"
                          title="Create purchase order"
                        >
                          Restock
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#E8E3DA] mt-3 text-right">
            <Link
              to="/products/low-stock"
              className="text-xs font-semibold text-[#795438] hover:underline"
            >
              Go to Full Low-Stock Management &rarr;
            </Link>
          </div>
        </div>

        {/* Latest 5 Completed Sales */}
        <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA] mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#292824]">
                  Recent Sales
                </h2>
                <p className="text-xs text-[#88847D]">
                  Latest completed checkout transactions
                </p>
              </div>
              <Link
                to="/sales"
                className="text-xs font-semibold text-[#795438] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentSalesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recentSales.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<Receipt className="w-8 h-8 text-[#A58B6F]" />}
                  title="No sales yet"
                  description="Completed customer transactions will appear here."
                />
              </div>
            ) : (
              <div className="divide-y divide-[#E8E3DA]">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#FAF8F4] rounded px-1"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#292824]">
                          {sale.invoice?.number || `#${sale.id}`}
                        </span>
                        <Badge
                          variant="primary"
                          size="sm"
                          className="text-[10px]"
                        >
                          {sale.payment_method.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#88847D] mt-0.5">
                        {sale.customer?.name || "Walk-in"} &bull; Cashier:{" "}
                        {sale.cashier?.name || "Staff"}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-[#292824]">
                        {formatMoney(sale.total)}
                      </div>
                      <p className="text-[10px] text-[#88847D] mt-0.5">
                        {sale.sold_at
                          ? new Date(sale.sold_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#E8E3DA] mt-3 text-right">
            <Link
              to="/sales"
              className="text-xs font-semibold text-[#795438] hover:underline"
            >
              Open Sales Registry &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
