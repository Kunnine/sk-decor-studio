import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Package,
  Plus,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { productApi } from "../api/products";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

export const LowStock: React.FC = () => {
  const [page, setPage] = useState(1);
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["products", "low-stock", page],
    queryFn: () => productApi.lowStock({ page, per_page: 15 }),
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  const handleCreatePurchase = (product: {
    id: number;
    reorder_level: number;
    stock_qty: number;
  }) => {
    const suggestedQty = Math.max(
      1,
      product.reorder_level * 2 - product.stock_qty,
    );
    navigate(
      `/purchases?create=true&product_id=${product.id}&suggested_qty=${suggestedQty}`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#292824]">
              Low Stock Products
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F59E0B] text-[#292824]">
              {meta?.total ?? 0} items
            </span>
          </div>
          <p className="text-xs text-[#88847D] mt-1">
            Products currently at or below their reorder threshold level
          </p>
        </div>

        {hasPermission("purchases.manage") && (
          <Button
            variant="primary"
            onClick={() => navigate("/purchases?create=true")}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Purchase Order
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E3DA] rounded-[10px] overflow-hidden shadow-none">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-8 h-8 text-[#A58B6F]" />}
            title="All stock levels healthy"
            description="No products are currently at or below their reorder threshold levels."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8E3DA] bg-[#F8F6F2] text-[#88847D] font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-4 text-center">Reorder Level</th>
                  <th className="py-3 px-4 text-center">Deficit</th>
                  <th className="py-3 px-4 text-center">Suggested Restock</th>
                  <th className="py-3 px-4">Last Purchase</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3DA]">
                {products.map((p) => {
                  const deficit = Math.max(0, p.reorder_level - p.stock_qty);
                  const suggestedQty = Math.max(
                    1,
                    p.reorder_level * 2 - p.stock_qty,
                  );
                  const unitName = p.unit?.short_name || "pcs";
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#FAF8F4] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#F8F7F4] border border-[#E8E3DA] overflow-hidden shrink-0 flex items-center justify-center">
                            {p.thumb_url ? (
                              <img
                                src={p.thumb_url}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-[#C8C1B6]" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-[#292824] block truncate max-w-xs">
                              {p.name}
                            </span>
                            <span className="font-mono text-[11px] text-[#88847D]">
                              {p.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#292824]">
                        <div>
                          {p.parent_category
                            ? `${p.parent_category.name} > `
                            : p.category?.parent
                              ? `${p.category.parent.name} > `
                              : ""}
                          {p.category?.name || "Uncategorized"}
                        </div>
                        {p.has_variants && p.variants && p.variants.length > 0 && (
                          <span className="inline-block text-[10px] text-[#795438] font-medium mt-0.5">
                            {p.variants.length} variations
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-[#292824]">
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-100/60 text-[#292824] font-bold border border-[#F59E0B]/30">
                          {p.stock_qty} {unitName}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-[#88847D] font-medium">
                        {p.reorder_level} {unitName}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-[#292824]">
                          {deficit > 0 ? `-${deficit}` : "0"} {unitName}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-[#795438] bg-[#F3EDE6] px-2 py-0.5 rounded border border-[#E2D9CE]">
                          +{suggestedQty} {unitName}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#88847D] text-[11px]">
                        {p.last_purchase_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#A58B6F]" />
                            <span>
                              {new Date(
                                p.last_purchase_date,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#88847D]">Never</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {hasPermission("purchases.manage") ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreatePurchase(p)}
                            className="text-xs"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                            <span>Create purchase</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-[#88847D] italic">
                            View only
                          </span>
                        )}
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
          <div className="px-4 py-3 border-t border-[#E8E3DA] flex items-center justify-between bg-[#F8F6F2]">
            <span className="text-xs text-[#88847D]">
              Page {meta.current_page} of {meta.last_page} ({meta.total} total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage(page + 1)}
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
