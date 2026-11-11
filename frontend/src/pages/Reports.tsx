import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Package,
  Truck,
  ArrowLeftRight,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { reportsApi, ReportResponse } from "../api/reports";
import { useDateRange } from "../hooks/useDateRange";
import { DateRangePicker } from "../components/ui/DateRangePicker";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Badge } from "../components/ui/Badge";

type ReportType =
  | "sales-summary"
  | "sales-by-product"
  | "sales-by-category"
  | "purchases-by-supplier"
  | "stock-movements"
  | "inventory-valuation"
  | "low-stock";

interface ReportTabConfig {
  id: ReportType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  supportsPdf: boolean;
}

const REPORT_TABS: ReportTabConfig[] = [
  {
    id: "sales-summary",
    label: "Sales Summary",
    icon: FileText,
    supportsPdf: true,
  },
  {
    id: "sales-by-product",
    label: "Sales by Product",
    icon: Package,
    supportsPdf: false,
  },
  {
    id: "sales-by-category",
    label: "Sales by Category",
    icon: Layers,
    supportsPdf: false,
  },
  {
    id: "purchases-by-supplier",
    label: "Purchases by Supplier",
    icon: Truck,
    supportsPdf: false,
  },
  {
    id: "stock-movements",
    label: "Stock Movements",
    icon: ArrowLeftRight,
    supportsPdf: false,
  },
  {
    id: "inventory-valuation",
    label: "Inventory Valuation",
    icon: DollarSign,
    supportsPdf: true,
  },
  {
    id: "low-stock",
    label: "Low-Stock List",
    icon: AlertTriangle,
    supportsPdf: false,
  },
];

export const Reports: React.FC = () => {
  const { formatMoney, settings } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { from, to, preset, setRange } = useDateRange();

  // Active report tab stored in URL
  const activeTab =
    (searchParams.get("report") as ReportType) || "sales-summary";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const sort = searchParams.get("sort") || "";
  const direction = (searchParams.get("direction") as "asc" | "desc") || "desc";

  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleTabChange = (tabId: ReportType) => {
    const next = new URLSearchParams(searchParams);
    next.set("report", tabId);
    next.set("page", "1");
    next.delete("sort");
    next.delete("direction");
    setSearchParams(next, { replace: true });
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  };

  const handleSort = (field: string) => {
    const next = new URLSearchParams(searchParams);
    if (sort === field) {
      next.set("direction", direction === "asc" ? "desc" : "asc");
    } else {
      next.set("sort", field);
      next.set("direction", "desc");
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  // Query report data
  const { data: reportData, isLoading } = useQuery<
    ReportResponse<Record<string, unknown>, Record<string, unknown>>
  >({
    queryKey: ["report", activeTab, from, to, page, sort, direction],
    queryFn: async () => {
      const params = {
        from,
        to,
        page,
        per_page: 15,
        sort: sort || undefined,
        direction: sort ? direction : undefined,
      };

      switch (activeTab) {
        case "sales-summary":
          return (await reportsApi.salesSummary(params)) as ReportResponse<
            Record<string, unknown>,
            Record<string, unknown>
          >;
        case "sales-by-product":
          return (await reportsApi.salesByProduct(params)) as ReportResponse<
            Record<string, unknown>,
            Record<string, unknown>
          >;
        case "sales-by-category":
          return (await reportsApi.salesByCategory(params)) as ReportResponse<
            Record<string, unknown>,
            Record<string, unknown>
          >;
        case "purchases-by-supplier":
          return (await reportsApi.purchasesBySupplier(
            params,
          )) as ReportResponse<
            Record<string, unknown>,
            Record<string, unknown>
          >;
        case "stock-movements":
          return (await reportsApi.stockMovements(params)) as ReportResponse<
            Record<string, unknown>,
            Record<string, unknown>
          >;
        case "inventory-valuation":
          return (await reportsApi.inventoryValuation(
            params,
          )) as ReportResponse<
            Record<string, unknown>,
            Record<string, unknown>
          >;
        case "low-stock":
          return (await reportsApi.lowStock(params)) as ReportResponse<
            Record<string, unknown>,
            Record<string, unknown>
          >;
        default:
          return (await reportsApi.salesSummary(params)) as ReportResponse<
            Record<string, unknown>,
            Record<string, unknown>
          >;
      }
    },
  });

  // Streamed CSV Export
  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      await reportsApi.downloadCsv(
        activeTab,
        {
          from,
          to,
          sort: sort || undefined,
          direction: sort ? direction : undefined,
        },
        `${activeTab}_${from}_${to}.csv`,
      );
    } catch (err) {
      console.error("CSV Export failed", err);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Signed PDF Export
  const handleExportPdf = async () => {
    if (activeTab !== "sales-summary" && activeTab !== "inventory-valuation")
      return;
    try {
      setIsExportingPdf(true);
      const res = await reportsApi.getSignedPdfUrl({
        report: activeTab,
        from,
        to,
      });
      window.open(res.url, "_blank");
    } catch (err) {
      console.error("PDF Export failed", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const rows = (reportData?.data ?? []) as Record<string, unknown>[];
  const meta = reportData?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  };
  const totals = reportData?.totals ?? {};

  const currentTabConfig =
    REPORT_TABS.find((t) => t.id === activeTab) || REPORT_TABS[0];

  const renderSortHeader = (
    label: string,
    field: string,
    align: "left" | "right" = "left",
  ) => {
    const isSorted = sort === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-2.5 px-3 cursor-pointer hover:bg-[#F3EDE6] select-none ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        <div
          className={`inline-flex items-center gap-1 font-semibold text-[#292824] ${
            align === "right" ? "justify-end" : ""
          }`}
        >
          <span>{label}</span>
          {isSorted ? (
            direction === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5 text-[#795438]" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-[#795438]" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-[#A58B6F]" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Date Range Controls */}
      <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#88847D]">
              {settings?.business_name || "Inventory System"}
            </span>
            <Badge
              variant="primary"
              size="sm"
              className="uppercase font-bold text-[10px]"
            >
              Reports & Auditing
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-[#292824]">
            Business Intelligence Reports
          </h1>
          <p className="text-xs text-[#88847D] mt-0.5">
            Filter, sort, and export financial and operational summaries with
            live totals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab !== "inventory-valuation" && activeTab !== "low-stock" && (
            <DateRangePicker
              preset={preset}
              from={from}
              to={to}
              onChange={setRange}
            />
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExportingCsv || isLoading}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#795438]" />
              <span>{isExportingCsv ? "Exporting..." : "CSV Export"}</span>
            </Button>

            {currentTabConfig.supportsPdf && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExportingPdf || isLoading}
                className="gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isExportingPdf ? "Generating..." : "PDF Report"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex border-b border-[#E8E3DA] overflow-x-auto bg-white rounded-[10px] p-1.5 gap-1 border">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-[#795438] text-white shadow-none"
                  : "text-[#88847D] hover:bg-[#F3EDE6] hover:text-[#292824]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Report Table Container */}
      <div className="bg-white border border-[#E8E3DA] rounded-[10px] shadow-none overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={
                <currentTabConfig.icon className="w-8 h-8 text-[#A58B6F]" />
              }
              title="No records found"
              description="There is no recorded activity matching this criteria and time range."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D]">
                  {/* SALES SUMMARY COLUMNS */}
                  {activeTab === "sales-summary" && (
                    <>
                      {renderSortHeader("Invoice #", "invoice_number")}
                      {renderSortHeader("Date & Time", "sold_at")}
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Cashier</th>
                      <th className="py-2.5 px-3">Payment</th>
                      <th className="py-2.5 px-3 text-right">Items</th>
                      {renderSortHeader("Subtotal", "subtotal", "right")}
                      {renderSortHeader("Discount", "discount", "right")}
                      {renderSortHeader("Tax", "tax", "right")}
                      {renderSortHeader("Total", "total", "right")}
                    </>
                  )}

                  {/* SALES BY PRODUCT COLUMNS */}
                  {activeTab === "sales-by-product" && (
                    <>
                      {renderSortHeader("SKU", "sku")}
                      {renderSortHeader("Product Name", "name")}
                      <th className="py-2.5 px-3">Category</th>
                      {renderSortHeader("Units Sold", "units_sold", "right")}
                      <th className="py-2.5 px-3 text-right">Avg Price</th>
                      {renderSortHeader("Revenue", "revenue", "right")}
                      <th className="py-2.5 px-3 text-right">COGS</th>
                      {renderSortHeader("Gross Profit", "profit", "right")}
                      <th className="py-2.5 px-3 text-right">Margin %</th>
                    </>
                  )}

                  {/* SALES BY CATEGORY COLUMNS */}
                  {activeTab === "sales-by-category" && (
                    <>
                      {renderSortHeader("Category Name", "category_name")}
                      <th className="py-2.5 px-3 text-right">Products Count</th>
                      {renderSortHeader("Units Sold", "units_sold", "right")}
                      {renderSortHeader("Revenue", "revenue", "right")}
                      <th className="py-2.5 px-3 text-right">Revenue Share</th>
                    </>
                  )}

                  {/* PURCHASES BY SUPPLIER COLUMNS */}
                  {activeTab === "purchases-by-supplier" && (
                    <>
                      {renderSortHeader("Supplier Name", "supplier_name")}
                      <th className="py-2.5 px-3">Contact Person</th>
                      <th className="py-2.5 px-3 text-right">Orders Placed</th>
                      <th className="py-2.5 px-3 text-right">
                        Items Purchased
                      </th>
                      {renderSortHeader("Total Spend", "total_spent", "right")}
                    </>
                  )}

                  {/* STOCK MOVEMENTS COLUMNS */}
                  {activeTab === "stock-movements" && (
                    <>
                      {renderSortHeader("Timestamp", "created_at")}
                      {renderSortHeader("SKU", "sku")}
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Change Qty</th>
                      <th className="py-2.5 px-3 text-right">
                        Before &rarr; After
                      </th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Total Value</th>
                      <th className="py-2.5 px-3">User</th>
                    </>
                  )}

                  {/* INVENTORY VALUATION COLUMNS */}
                  {activeTab === "inventory-valuation" && (
                    <>
                      {renderSortHeader("SKU", "sku")}
                      {renderSortHeader("Product Name", "name")}
                      <th className="py-2.5 px-3">Category</th>
                      {renderSortHeader("In Stock", "stock_qty", "right")}
                      <th className="py-2.5 px-3 text-right">Unit Avg Cost</th>
                      <th className="py-2.5 px-3 text-right">Sell Price</th>
                      {renderSortHeader(
                        "Inventory Value",
                        "inventory_value",
                        "right",
                      )}
                      <th className="py-2.5 px-3 text-right">
                        Potential Retail
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        Potential Profit
                      </th>
                    </>
                  )}

                  {/* LOW STOCK LIST COLUMNS */}
                  {activeTab === "low-stock" && (
                    <>
                      {renderSortHeader("SKU", "sku")}
                      {renderSortHeader("Product Name", "name")}
                      <th className="py-2.5 px-3">Category</th>
                      {renderSortHeader("Current Stock", "stock_qty", "right")}
                      {renderSortHeader(
                        "Reorder Level",
                        "reorder_level",
                        "right",
                      )}
                      {renderSortHeader("Deficit", "deficit", "right")}
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">
                        Est Restock Cost
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        Suggested Order
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E8E3DA] text-[#292824]">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF8F4]">
                    {/* SALES SUMMARY ROWS */}
                    {activeTab === "sales-summary" && (
                      <>
                        <td className="py-2.5 px-3 font-semibold text-[#292824]">
                          {String(row.invoice_number || "-")}
                        </td>
                        <td className="py-2.5 px-3 text-[#88847D] whitespace-nowrap">
                          {String(row.sold_at || "-")}
                        </td>
                        <td className="py-2.5 px-3">
                          {String(row.customer_name || "Walk-in")}
                        </td>
                        <td className="py-2.5 px-3">
                          {String(row.cashier_name || "-")}
                        </td>
                        <td className="py-2.5 px-3 capitalize">
                          {String(row.payment_method || "-").replace("_", " ")}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {String(row.items_count || "0")}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(Number(row.subtotal ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(Number(row.discount ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(Number(row.tax ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#292824]">
                          {formatMoney(Number(row.total ?? 0))}
                        </td>
                      </>
                    )}

                    {/* SALES BY PRODUCT ROWS */}
                    {activeTab === "sales-by-product" && (
                      <>
                        <td className="py-2.5 px-3 font-mono text-[#88847D]">
                          {String(row.sku || "-")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#292824]">
                          {String(row.product_name || "-")}
                        </td>
                        <td className="py-2.5 px-3">
                          {String(row.category_name || "-")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {Number(row.units_sold ?? 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(Number(row.avg_selling_price ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#292824]">
                          {formatMoney(Number(row.revenue ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(Number(row.cogs ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#292824]">
                          {formatMoney(Number(row.profit ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#795438]">
                          {Number(row.margin_pct ?? 0).toFixed(1)}%
                        </td>
                      </>
                    )}

                    {/* SALES BY CATEGORY ROWS */}
                    {activeTab === "sales-by-category" && (
                      <>
                        <td className="py-2.5 px-3 font-bold text-[#292824]">
                          {String(row.category_name || "-")}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {Number(row.products_count ?? 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {Number(row.units_sold ?? 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#292824]">
                          {formatMoney(Number(row.revenue ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#88847D] font-medium">
                          {Number(row.percentage ?? 0).toFixed(1)}%
                        </td>
                      </>
                    )}

                    {/* PURCHASES BY SUPPLIER ROWS */}
                    {activeTab === "purchases-by-supplier" && (
                      <>
                        <td className="py-2.5 px-3 font-bold text-[#292824]">
                          {String(row.supplier_name || "-")}
                        </td>
                        <td className="py-2.5 px-3 text-[#88847D]">
                          {String(row.contact_person || "-")}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {Number(row.purchases_count ?? 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {Number(row.items_purchased ?? 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#292824]">
                          {formatMoney(Number(row.total_spent ?? 0))}
                        </td>
                      </>
                    )}

                    {/* STOCK MOVEMENTS ROWS */}
                    {activeTab === "stock-movements" && (
                      <>
                        <td className="py-2.5 px-3 text-[#88847D] whitespace-nowrap">
                          {String(row.created_at || "-")}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#88847D]">
                          {String(row.sku || "-")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#292824]">
                          {String(row.product_name || "-")}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="capitalize px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#F3EDE6] text-[#795438]">
                            {String(row.type || "-")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#292824]">
                          {Number(row.qty ?? 0) > 0
                            ? `+${row.qty}`
                            : String(row.qty ?? 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#88847D]">
                          {String(row.stock_before ?? 0)} &rarr;{" "}
                          {String(row.stock_after ?? 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(Number(row.unit_cost ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#292824]">
                          {formatMoney(Number(row.total_cost ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-[#88847D]">
                          {String(row.user_name || "-")}
                        </td>
                      </>
                    )}

                    {/* INVENTORY VALUATION ROWS */}
                    {activeTab === "inventory-valuation" && (
                      <>
                        <td className="py-2.5 px-3 font-mono text-[#88847D]">
                          {String(row.sku || "-")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#292824]">
                          {String(row.product_name || "-")}
                        </td>
                        <td className="py-2.5 px-3">
                          {String(row.category_name || "-")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {Number(row.stock_qty ?? 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(Number(row.unit_cost ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(Number(row.sell_price ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#292824]">
                          {formatMoney(Number(row.inventory_value ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(Number(row.potential_revenue ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#795438]">
                          {formatMoney(Number(row.potential_profit ?? 0))}
                        </td>
                      </>
                    )}

                    {/* LOW STOCK LIST ROWS (Amber warning styling for deficit) */}
                    {activeTab === "low-stock" && (
                      <>
                        <td className="py-2.5 px-3 font-mono text-[#88847D]">
                          {String(row.sku || "-")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#292824]">
                          {String(row.product_name || "-")}
                        </td>
                        <td className="py-2.5 px-3">
                          {String(row.category_name || "-")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#292824]">
                          {String(row.stock_qty ?? 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#88847D]">
                          {String(row.reorder_level ?? 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B] text-[#292824]">
                            -{String(row.deficit ?? 0)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatMoney(Number(row.unit_cost ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#292824]">
                          {formatMoney(Number(row.estimated_restock_cost ?? 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#795438]">
                          {String(row.suggested_qty ?? 0)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>

              {/* TOTALS ROW (Mandatory Requirement) */}
              <tfoot>
                <tr className="bg-[#F8F6F2] border-t-2 border-[#DDD6CA] font-bold text-[#292824] text-xs">
                  {/* SALES SUMMARY TOTALS */}
                  {activeTab === "sales-summary" && (
                    <>
                      <td
                        colSpan={5}
                        className="py-3 px-3 uppercase tracking-wider text-[11px]"
                      >
                        Period Totals (
                        {Number(totals.orders ?? 0).toLocaleString()} Orders)
                      </td>
                      <td className="py-3 px-3 text-right">-</td>
                      <td className="py-3 px-3 text-right">
                        {formatMoney(Number(totals.subtotal ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {formatMoney(Number(totals.discount ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {formatMoney(Number(totals.tax ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-right text-[#795438]">
                        {formatMoney(Number(totals.total ?? 0))}
                      </td>
                    </>
                  )}

                  {/* SALES BY PRODUCT TOTALS */}
                  {activeTab === "sales-by-product" && (
                    <>
                      <td
                        colSpan={3}
                        className="py-3 px-3 uppercase tracking-wider text-[11px]"
                      >
                        Overall Product Totals
                      </td>
                      <td className="py-3 px-3 text-right">
                        {Number(totals.units_sold ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">-</td>
                      <td className="py-3 px-3 text-right text-[#795438]">
                        {formatMoney(Number(totals.revenue ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {formatMoney(Number(totals.cogs ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {formatMoney(Number(totals.profit ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {Number(totals.margin_pct ?? 0).toFixed(1)}%
                      </td>
                    </>
                  )}

                  {/* SALES BY CATEGORY TOTALS */}
                  {activeTab === "sales-by-category" && (
                    <>
                      <td
                        colSpan={2}
                        className="py-3 px-3 uppercase tracking-wider text-[11px]"
                      >
                        Category Totals
                      </td>
                      <td className="py-3 px-3 text-right">
                        {Number(totals.units_sold ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-[#795438]">
                        {formatMoney(Number(totals.revenue ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {Number(totals.percentage ?? 100).toFixed(1)}%
                      </td>
                    </>
                  )}

                  {/* PURCHASES BY SUPPLIER TOTALS */}
                  {activeTab === "purchases-by-supplier" && (
                    <>
                      <td
                        colSpan={2}
                        className="py-3 px-3 uppercase tracking-wider text-[11px]"
                      >
                        Supplier Purchasing Totals
                      </td>
                      <td className="py-3 px-3 text-right">
                        {Number(totals.purchases_count ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {Number(totals.items_purchased ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-[#795438]">
                        {formatMoney(Number(totals.total_spent ?? 0))}
                      </td>
                    </>
                  )}

                  {/* STOCK MOVEMENTS TOTALS */}
                  {activeTab === "stock-movements" && (
                    <>
                      <td
                        colSpan={4}
                        className="py-3 px-3 uppercase tracking-wider text-[11px]"
                      >
                        Net Movement Totals (
                        {Number(totals.movements_count ?? 0).toLocaleString()}{" "}
                        records)
                      </td>
                      <td className="py-3 px-3 text-right">
                        {Number(totals.net_qty ?? 0) > 0
                          ? `+${totals.net_qty}`
                          : String(totals.net_qty ?? 0)}
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-right">
                        -
                      </td>
                      <td className="py-3 px-3 text-right text-[#795438]">
                        {formatMoney(Number(totals.net_value ?? 0))}
                      </td>
                      <td className="py-3 px-3">-</td>
                    </>
                  )}

                  {/* INVENTORY VALUATION TOTALS */}
                  {activeTab === "inventory-valuation" && (
                    <>
                      <td
                        colSpan={3}
                        className="py-3 px-3 uppercase tracking-wider text-[11px]"
                      >
                        Total Inventory Valuation (
                        {Number(totals.products_count ?? 0).toLocaleString()}{" "}
                        items)
                      </td>
                      <td className="py-3 px-3 text-right">
                        {Number(totals.total_units ?? 0).toLocaleString()}
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-right">
                        -
                      </td>
                      <td className="py-3 px-3 text-right text-[#795438]">
                        {formatMoney(Number(totals.total_inventory_value ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {formatMoney(Number(totals.total_retail_value ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {formatMoney(
                          Number(totals.total_potential_profit ?? 0),
                        )}
                      </td>
                    </>
                  )}

                  {/* LOW STOCK LIST TOTALS */}
                  {activeTab === "low-stock" && (
                    <>
                      <td
                        colSpan={3}
                        className="py-3 px-3 uppercase tracking-wider text-[11px]"
                      >
                        Low Stock Totals (
                        {Number(totals.products_count ?? 0).toLocaleString()}{" "}
                        items)
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-right">
                        -
                      </td>
                      <td className="py-3 px-3 text-right text-[#F59E0B]">
                        -{Number(totals.total_deficit ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">-</td>
                      <td className="py-3 px-3 text-right text-[#795438]">
                        {formatMoney(Number(totals.total_restock_cost ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-right">-</td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {meta.last_page > 1 && (
          <div className="px-5 py-3 border-t border-[#E8E3DA] bg-[#F8F6F2] flex items-center justify-between">
            <span className="text-xs text-[#88847D]">
              Showing page{" "}
              <span className="font-semibold text-[#292824]">
                {meta.current_page}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#292824]">
                {meta.last_page}
              </span>{" "}
              ({meta.total} records total)
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= meta.last_page}
                className="p-1.5"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
