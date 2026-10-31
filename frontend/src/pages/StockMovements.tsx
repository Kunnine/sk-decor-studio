import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { movementApi, MovementFilters } from "../api/movements";
import { productApi } from "../api/products";
import { MovementType } from "../types";
import { TableSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Badge } from "../components/ui/Badge";
import { useAuth } from "../context/AuthContext";

export const StockMovements: React.FC = () => {
  const { settings } = useAuth();
  const currencySymbol = settings?.currency_symbol || "$";

  const [filters, setFilters] = useState<MovementFilters>({
    page: 1,
    per_page: 15,
    product_id: "",
    type: "",
    date_from: "",
    date_to: "",
  });

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ["stock-movements", filters],
    queryFn: () => movementApi.list(filters),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-select-list"],
    queryFn: () => productApi.list({ per_page: 100 }),
  });

  const movements = movementsData?.data || [];
  const meta = movementsData?.meta;
  const products = productsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Stock Movement History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable, append-only audit trail of all inventory receipts, sales,
            and manual adjustments
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <select
          value={filters.product_id}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              product_id: e.target.value ? Number(e.target.value) : "",
              page: 1,
            }))
          }
          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:bg-white"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              type: e.target.value as MovementType | "",
              page: 1,
            }))
          }
          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:bg-white"
        >
          <option value="">All Movement Types</option>
          <option value="purchase">Purchase (Stock In)</option>
          <option value="sale">Sale (Stock Out)</option>
          <option value="adjustment">Manual Adjustment</option>
          <option value="void">Sale Void Reversal</option>
        </select>

        <input
          type="date"
          value={filters.date_from || ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              date_from: e.target.value,
              page: 1,
            }))
          }
          placeholder="From Date"
          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:bg-white"
        />

        <input
          type="date"
          value={filters.date_to || ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              date_to: e.target.value,
              page: 1,
            }))
          }
          placeholder="To Date"
          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:bg-white"
        />
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-none">
        {isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : movements.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No stock movements recorded"
              description="Inventory movements will automatically appear here as purchases are received, sales occur, or manual adjustments are made."
              icon={<ArrowLeftRight className="w-8 h-8 text-slate-400" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Type</th>
                  <th className="py-3 px-4 text-right">Qty Change</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4">Reference / Reason</th>
                  <th className="py-3 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {movements.map((m) => {
                  const isPositive = m.qty_change > 0;
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(m.created_at).toLocaleString([], {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                        <span className="font-mono font-semibold mr-1.5">
                          {m.product?.sku}
                        </span>
                        <span>{m.product?.name}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            m.type === "purchase"
                              ? "primary"
                              : m.type === "void"
                                ? "warning"
                                : "neutral"
                          }
                          size="sm"
                          className="uppercase font-semibold text-[10px]"
                        >
                          {m.type}
                        </Badge>
                      </td>
                      {/* Positive / Negative quantity change: strict two-color design rules: No red/green! Show +/- with arrow icon & font weight */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-900">
                          {isPositive ? (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5 text-[#4338CA]" />
                              <span>+{m.qty_change}</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-3.5 h-3.5 text-slate-600" />
                              <span>{m.qty_change}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {m.unit_cost !== null && m.unit_cost !== undefined ? (
                          <>
                            {currencySymbol}
                            {m.unit_cost}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                        <span>{m.reason || "—"}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {m.user?.name || "System"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between bg-slate-50 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{meta.from || 0}</span> to{" "}
              <span className="font-semibold">{meta.to || 0}</span> of{" "}
              <span className="font-semibold">{meta.total}</span> movements
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={meta.current_page <= 1}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: (prev.page || 1) - 1,
                  }))
                }
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Page {meta.current_page} of {meta.last_page}
              </span>
              <button
                disabled={meta.current_page >= meta.last_page}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: (prev.page || 1) + 1,
                  }))
                }
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
