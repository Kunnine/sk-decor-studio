import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Layers,
  Ruler,
  AlertTriangle,
  ArrowRight,
  Plus,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { productApi } from "../api/products";
import { categoryApi } from "../api/categories";
import { unitApi } from "../api/units";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

export const Dashboard: React.FC = () => {
  const { user, settings, formatMoney, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Queries for metrics
  const { data: totalProductsData, isLoading: loadingTotal } = useQuery({
    queryKey: ["dashboard-total-products"],
    queryFn: () => productApi.list({ per_page: 1 }),
  });

  const { data: activeProductsData, isLoading: loadingActive } = useQuery({
    queryKey: ["dashboard-active-products"],
    queryFn: () => productApi.list({ is_active: "1", per_page: 1 }),
  });

  const { data: lowStockData, isLoading: loadingLowStock } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: () => productApi.list({ low_stock: true, per_page: 5 }),
  });

  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ["dashboard-categories"],
    queryFn: () => categoryApi.list({ all: true }),
  });

  const { data: unitsData, isLoading: loadingUnits } = useQuery({
    queryKey: ["dashboard-units"],
    queryFn: () => unitApi.list({ all: true }),
  });

  const totalProducts = totalProductsData?.meta?.total ?? 0;
  const activeProducts = activeProductsData?.meta?.total ?? 0;
  const lowStockCount = lowStockData?.meta?.total ?? 0;
  const categoriesCount = categoriesData?.data?.length ?? 0;
  const unitsCount = unitsData?.data?.length ?? 0;
  const lowStockItems = lowStockData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {settings?.business_name || "Inventory System"}
              </span>
              <Badge
                variant="primary"
                size="sm"
                className="uppercase font-bold text-[10px]"
              >
                {user?.role}
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              System overview: inventory items, stock levels, and catalog
              structure.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission("products.manage") && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/products?action=new")}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </Button>
            )}
            {hasPermission("categories.view") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/categories")}
                className="gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Categories</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div
          onClick={() => navigate("/products")}
          className="bg-white border border-slate-200 rounded-lg p-5 cursor-pointer hover:border-slate-300 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Products
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4338CA] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {loadingTotal ? "-" : totalProducts.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>{loadingActive ? "..." : `${activeProducts} active`}</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => navigate("/products?low_stock=true")}
          className="bg-white border border-slate-200 rounded-lg p-5 cursor-pointer hover:border-slate-300 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Low Stock Items
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>
              {loadingLowStock ? "-" : lowStockCount.toLocaleString()}
            </span>
            {lowStockCount > 0 && (
              <Badge variant="warning" size="sm" className="text-[10px]">
                Requires Restock
              </Badge>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>At or below reorder level</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Categories */}
        <div
          onClick={() => navigate("/categories")}
          className="bg-white border border-slate-200 rounded-lg p-5 cursor-pointer hover:border-slate-300 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Categories
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {loadingCategories ? "-" : categoriesCount.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Hierarchical catalog tree</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Units */}
        <div
          onClick={() => navigate("/units")}
          className="bg-white border border-slate-200 rounded-lg p-5 cursor-pointer hover:border-slate-300 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Units of Measure
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Ruler className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {loadingUnits ? "-" : unitsCount.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Standardized units</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Low Stock Warning Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Low Stock Monitoring
            </h2>
            {lowStockCount > 0 && (
              <Badge variant="warning" size="sm">
                {lowStockCount} items
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/products?low_stock=true")}
            className="text-xs"
          >
            View all
          </Button>
        </div>

        {loadingLowStock ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading alerts...
          </div>
        ) : lowStockItems.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-indigo-700 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900">
              All stock levels healthy
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              No products are currently at or below their reorder threshold.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">In Stock</th>
                  <th className="py-2.5 px-4 text-right">Reorder Level</th>
                  <th className="py-2.5 px-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map((prod) => (
                  <tr
                    key={prod.id}
                    onClick={() =>
                      navigate(
                        `/products?search=${encodeURIComponent(prod.sku)}`,
                      )
                    }
                    className="hover:bg-slate-50/70 cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                      {prod.thumb_url ? (
                        <img
                          src={prod.thumb_url}
                          alt={prod.name}
                          className="w-7 h-7 rounded object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className="truncate max-w-[200px]">
                        {prod.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {prod.sku}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {prod.category?.name || "-"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        {prod.stock_qty} {prod.unit?.short_name || ""}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      {prod.reorder_level} {prod.unit?.short_name || ""}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-900">
                      {formatMoney(prod.sell_price)}
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
};
