import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  UploadCloud,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ToggleLeft,
  ToggleRight,
  FileSpreadsheet,
} from "lucide-react";
import { productApi, ProductPayload } from "../api/products";
import { categoryApi } from "../api/categories";
import { unitApi } from "../api/units";
import { Product, CsvImportPreview } from "../types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Badge } from "../components/ui/Badge";
import { ImageUploader } from "../components/ui/ImageUploader";

const productSchema = z.object({
  sku: z.string().min(2, "SKU must be at least 2 characters").max(64),
  name: z.string().min(2, "Product name is required").max(255),
  description: z.string().optional().nullable(),
  category_id: z.number().min(1, "Please select a valid category"),
  unit_id: z.number().nullable().optional(),
  cost_price: z.number().min(0, "Cost price cannot be negative"),
  sell_price: z.number().min(0, "Sell price cannot be negative"),
  stock_qty: z.number().int().min(0, "Stock cannot be negative"),
  reorder_level: z.number().int().min(0, "Reorder level cannot be negative"),
  is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

export const Products: React.FC = () => {
  const { settings, formatMoney, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = hasPermission("products.manage");
  const canImport = hasPermission("products.import");
  const canViewCost = hasPermission("products.cost_view");

  // URL state synchronization
  const search = searchParams.get("search") || "";
  const categoryFilter = searchParams.get("category_id") || "";
  const unitFilter = searchParams.get("unit_id") || "";
  const statusFilter = searchParams.get("is_active") || "";
  const lowStockFilter = searchParams.get("low_stock") === "true";
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder =
    (searchParams.get("sort_order") as "asc" | "desc") || "desc";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = 10;

  const updateFilters = (newParams: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "") {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    setSearchParams(next);
  };

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  // CSV Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] =
    useState<CsvImportPreview | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "update">(
    "skip",
  );
  const [createMissingCats, setCreateMissingCats] = useState(true);
  const [createMissingUnits, setCreateMissingUnits] = useState(true);

  // Queries
  const { data: categoriesData } = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => categoryApi.list({ all: true }),
  });

  const { data: unitsData } = useQuery({
    queryKey: ["units-all"],
    queryFn: () => unitApi.list({ all: true }),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "products",
      {
        page,
        per_page: perPage,
        search,
        category_id: categoryFilter,
        unit_id: unitFilter,
        is_active: statusFilter,
        low_stock: lowStockFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      },
    ],
    queryFn: () =>
      productApi.list({
        page,
        per_page: perPage,
        search: search || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        unit_id: unitFilter ? Number(unitFilter) : undefined,
        is_active: statusFilter !== "" ? statusFilter : undefined,
        low_stock: lowStockFilter ? true : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  const allCategories = (categoriesData as any)?.data || [];
  const allUnits = (unitsData as any)?.data || [];
  const products = data?.data || [];
  const meta = data?.meta;

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setSelectedImageFile(null);
    setRemoveExistingImage(false);
    reset({
      sku: "",
      name: "",
      description: "",
      category_id: allCategories[0]?.id || 1,
      unit_id: allUnits[0]?.id || null,
      cost_price: 0,
      sell_price: 0,
      stock_qty: 0,
      reorder_level: Number(settings?.default_reorder_level ?? 10),
      is_active: true,
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setSelectedImageFile(null);
    setRemoveExistingImage(false);
    reset({
      sku: p.sku,
      name: p.name,
      description: p.description || "",
      category_id: p.category_id,
      unit_id: p.unit_id ?? null,
      cost_price: p.cost_price ? Number(p.cost_price) : 0,
      sell_price: Number(p.sell_price),
      stock_qty: p.stock_qty,
      reorder_level: p.reorder_level,
      is_active: p.is_active,
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingProduct(null);
    setSelectedImageFile(null);
    setRemoveExistingImage(false);
    reset();
  };

  // Mutations
  const invalidateProductQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-total-products"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-active-products"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-low-stock"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: ProductFormData) => {
      const payload: ProductPayload = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id,
        unit_id: formData.unit_id ? Number(formData.unit_id) : null,
        cost_price: formData.cost_price,
        sell_price: formData.sell_price,
        stock_qty: formData.stock_qty,
        reorder_level: formData.reorder_level,
        is_active: formData.is_active,
        image: selectedImageFile,
      };

      if (editingProduct) {
        if (
          removeExistingImage &&
          editingProduct.image_url &&
          !selectedImageFile
        ) {
          await productApi.deleteImage(editingProduct.id);
        }
        return productApi.update(editingProduct.id, payload);
      }
      return productApi.create(payload);
    },
    onSuccess: (res) => {
      invalidateProductQueries();
      addToast({
        title: editingProduct ? "Product Updated" : "Product Created",
        message: res.message,
        type: "success",
      });
      closeFormModal();
    },
    onError: (err: any) => {
      addToast({
        title: "Error Saving Product",
        message:
          err.response?.data?.message || "Failed to save product details.",
        type: "error",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) => productApi.toggleActive(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });
      const previous = queryClient.getQueryData(["products"]);
      queryClient.setQueriesData({ queryKey: ["products"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((p: Product) =>
            p.id === id ? { ...p, is_active: !p.is_active } : p,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["products"], context.previous);
      }
      addToast({
        title: "Update Failed",
        message: "Could not toggle product status.",
        type: "error",
      });
    },
    onSettled: () => {
      invalidateProductQueries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productApi.delete(id),
    onSuccess: (res) => {
      invalidateProductQueries();
      addToast({
        title: "Product Deleted",
        message: res.message,
        type: "success",
      });
      setDeletingProduct(null);
    },
    onError: (err: any) => {
      addToast({
        title: "Delete Failed",
        message: err.response?.data?.message || "Failed to delete product.",
        type: "error",
      });
      setDeletingProduct(null);
    },
  });

  // CSV Import Mutations
  const previewMutation = useMutation({
    mutationFn: (file: File) => productApi.importPreview(file),
    onSuccess: (preview) => {
      setImportPreviewData(preview);
    },
    onError: (err: any) => {
      addToast({
        title: "Import Preview Failed",
        message: err.response?.data?.message || "Could not parse CSV file.",
        type: "error",
      });
    },
  });

  const commitMutation = useMutation({
    mutationFn: () => {
      if (!importPreviewData) throw new Error("No preview token");
      return productApi.importCommit({
        preview_token: importPreviewData.preview_token,
        duplicate_sku_action: duplicateAction,
        create_missing_categories: createMissingCats,
        create_missing_units: createMissingUnits,
      });
    },
    onSuccess: (res) => {
      invalidateProductQueries();
      queryClient.invalidateQueries({ queryKey: ["categories-all"] });
      queryClient.invalidateQueries({ queryKey: ["units-all"] });
      addToast({
        title: "Import Complete",
        message: `Successfully imported ${res.imported_count} new and updated ${res.updated_count} products (${res.skipped_count} skipped).`,
        type: "success",
      });
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreviewData(null);
    },
    onError: (err: any) => {
      addToast({
        title: "Import Failed",
        message: err.response?.data?.message || "Failed to commit CSV import.",
        type: "error",
      });
    },
  });

  const handleDownloadTemplate = async () => {
    try {
      const blob = await productApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products_import_template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      addToast({
        title: "Download Failed",
        message: "Could not download template CSV.",
        type: "error",
      });
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      updateFilters({
        sort_order: sortOrder === "asc" ? "desc" : "asc",
        page: "1",
      });
    } else {
      updateFilters({ sort_by: column, sort_order: "asc", page: "1" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Products Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage product inventory items, SKUs, pricing, stock levels, and
            WebP product images.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canImport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportFile(null);
                setImportPreviewData(null);
                setIsImportModalOpen(true);
              }}
              className="gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </Button>
          )}

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) =>
                updateFilters({ search: e.target.value, page: "1" })
              }
              placeholder="Search by SKU, product name, or description..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category */}
            <Select
              value={categoryFilter}
              onChange={(e) =>
                updateFilters({ category_id: e.target.value, page: "1" })
              }
              className="text-xs w-40"
              options={[
                { label: "All Categories", value: "" },
                ...allCategories.map((c: any) => ({
                  label: c.name,
                  value: String(c.id),
                })),
              ]}
            />

            {/* Unit */}
            <Select
              value={unitFilter}
              onChange={(e) =>
                updateFilters({ unit_id: e.target.value, page: "1" })
              }
              className="text-xs w-32"
              options={[
                { label: "All Units", value: "" },
                ...allUnits.map((u: any) => ({
                  label: `${u.name} (${u.short_name})`,
                  value: String(u.id),
                })),
              ]}
            />

            {/* Active Status */}
            <Select
              value={statusFilter}
              onChange={(e) =>
                updateFilters({ is_active: e.target.value, page: "1" })
              }
              className="text-xs w-32"
              options={[
                { label: "All Statuses", value: "" },
                { label: "Active", value: "1" },
                { label: "Inactive", value: "0" },
              ]}
            />

            {/* Low stock toggle */}
            <button
              onClick={() =>
                updateFilters({
                  low_stock: lowStockFilter ? null : "true",
                  page: "1",
                })
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                lowStockFilter
                  ? "border-amber-400 bg-amber-50 text-amber-900 font-bold"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <AlertTriangle
                className={`w-3.5 h-3.5 ${lowStockFilter ? "text-amber-600" : "text-slate-400"}`}
              />
              <span>Low Stock Only</span>
            </button>
          </div>
        </div>

        {/* Clear filters shortcut */}
        {(search ||
          categoryFilter ||
          unitFilter ||
          statusFilter ||
          lowStockFilter) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Filtered results</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                updateFilters({
                  search: null,
                  category_id: null,
                  unit_id: null,
                  is_active: null,
                  low_stock: null,
                  page: "1",
                })
              }
              className="text-xs text-slate-600"
            >
              Reset all filters
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} columns={7} />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-8 h-8 text-slate-500" />}
            title="No products found"
            description={
              search ||
              categoryFilter ||
              unitFilter ||
              statusFilter ||
              lowStockFilter
                ? "No inventory items match the current filter selection."
                : "Get started by creating your first product or importing a CSV catalog."
            }
            actionLabel={canManage ? "Create Product" : undefined}
            onAction={canManage ? openCreateModal : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-12">Image</th>
                  <th
                    onClick={() => handleSort("sku")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>SKU</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("name")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Product Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit</th>
                  {canViewCost && (
                    <th className="py-3 px-4 text-right">Cost Price</th>
                  )}
                  <th
                    onClick={() => handleSort("sell_price")}
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Sell Price</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("stock_qty")}
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Stock Qty</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isLow =
                    p.is_low_stock || p.stock_qty <= p.reorder_level;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* 40x40 lazy thumbnail */}
                      <td className="py-2.5 px-4">
                        <div
                          onClick={() => setDetailProduct(p)}
                          className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {p.thumb_url ? (
                            <img
                              src={p.thumb_url}
                              alt={p.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                        {p.sku}
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-4">
                        <div
                          onClick={() => setDetailProduct(p)}
                          className="font-semibold text-slate-900 hover:text-indigo-700 cursor-pointer truncate max-w-[220px]"
                          title={p.name}
                        >
                          {p.name}
                        </div>
                        {p.description && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-4">
                        <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {p.category?.name || "-"}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                        {p.unit?.short_name || "-"}
                      </td>

                      {/* Cost price (if authorized) */}
                      {canViewCost && (
                        <td className="py-2.5 px-4 text-right text-slate-500 font-mono">
                          {p.cost_price ? formatMoney(p.cost_price) : "-"}
                        </td>
                      )}

                      {/* Sell price */}
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatMoney(p.sell_price)}
                      </td>

                      {/* Stock qty */}
                      <td className="py-2.5 px-4 text-right">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 text-[11px]">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{p.stock_qty}</span>
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-800">
                            {p.stock_qty}
                          </span>
                        )}
                      </td>

                      {/* Active toggle */}
                      <td className="py-2.5 px-4 text-center">
                        {canManage ? (
                          <button
                            onClick={() => toggleActiveMutation.mutate(p.id)}
                            className="p-1 rounded text-slate-600 hover:text-slate-900 transition-colors"
                            title={
                              p.is_active
                                ? "Click to deactivate"
                                : "Click to activate"
                            }
                          >
                            {p.is_active ? (
                              <ToggleRight className="w-5 h-5 text-indigo-700" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500">
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailProduct(p)}
                            className="p-1.5 rounded text-slate-500 hover:text-indigo-700 hover:bg-slate-100 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-1.5 rounded text-slate-500 hover:text-indigo-700 hover:bg-slate-100 transition-colors"
                                title="Edit Product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingProduct(p)}
                                className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
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
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900">{meta.from}</span>{" "}
              to <span className="font-semibold text-slate-900">{meta.to}</span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">{meta.total}</span>{" "}
              products
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateFilters({ page: (page - 1).toString() })}
                className="p-1.5"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 font-medium">
                Page {meta.current_page} of {meta.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => updateFilters({ page: (page + 1).toString() })}
                className="p-1.5"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <Modal
        isOpen={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        title="Product Details"
        maxWidth="lg"
      >
        {detailProduct && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Large Image Preview */}
              <div className="w-full sm:w-48 h-48 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {detailProduct.image_url ? (
                  <img
                    src={detailProduct.image_url}
                    alt={detailProduct.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <Package className="w-12 h-12 stroke-[1.5]" />
                    <span className="text-[11px] mt-1">No image attached</span>
                  </div>
                )}
              </div>

              {/* Information */}
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {detailProduct.sku}
                    </span>
                    <Badge
                      variant={detailProduct.is_active ? "primary" : "neutral"}
                      size="sm"
                    >
                      {detailProduct.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {detailProduct.is_low_stock && (
                      <Badge variant="warning" size="sm">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    {detailProduct.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {detailProduct.description || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Category
                    </span>
                    <span className="font-semibold text-slate-900">
                      {detailProduct.category?.name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Unit of Measure
                    </span>
                    <span className="font-semibold text-slate-900">
                      {detailProduct.unit?.name} (
                      {detailProduct.unit?.short_name})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Sell Price
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatMoney(detailProduct.sell_price)}
                    </span>
                  </div>
                  {canViewCost && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        Cost Price
                      </span>
                      <span className="font-medium text-slate-600 font-mono">
                        {detailProduct.cost_price
                          ? formatMoney(detailProduct.cost_price)
                          : "-"}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Current Stock
                    </span>
                    <span
                      className={`font-bold ${
                        detailProduct.is_low_stock
                          ? "text-amber-900"
                          : "text-slate-900"
                      }`}
                    >
                      {detailProduct.stock_qty} {detailProduct.unit?.short_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">
                      Reorder Threshold
                    </span>
                    <span className="font-medium text-slate-700">
                      {detailProduct.reorder_level}{" "}
                      {detailProduct.unit?.short_name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailProduct(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Drawer Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        title={
          editingProduct
            ? `Edit Product: ${editingProduct.sku}`
            : "Create New Product"
        }
        maxWidth="lg"
      >
        <form
          onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
          className="space-y-4"
        >
          {/* Image Uploader */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Image
            </label>
            <ImageUploader
              currentImageUrl={editingProduct?.image_url}
              onFileSelect={(file) => {
                setSelectedImageFile(file);
                setRemoveExistingImage(false);
              }}
              onRemoveExisting={() => {
                setSelectedImageFile(null);
                setRemoveExistingImage(true);
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU (Stock Keeping Unit) *
              </label>
              <Input
                {...register("sku")}
                placeholder="e.g. LAP-001"
                error={errors.sku?.message}
                disabled={!!editingProduct}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name *
              </label>
              <Input
                {...register("name")}
                placeholder="e.g. Ultra Slim Laptop 14"
                error={errors.name?.message}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Product specifications and details..."
              className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-[#4338CA] focus:border-[#4338CA] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <Select
                {...register("category_id", { valueAsNumber: true })}
                error={errors.category_id?.message}
                options={allCategories.map((c: any) => ({
                  label: c.name,
                  value: String(c.id),
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit of Measure
              </label>
              <Select
                {...register("unit_id", {
                  setValueAs: (v) =>
                    v === "" || v === null ? null : Number(v),
                })}
                error={errors.unit_id?.message}
                options={[
                  { label: "(None / Not specified)", value: "" },
                  ...allUnits.map((u: any) => ({
                    label: `${u.name} (${u.short_name})`,
                    value: String(u.id),
                  })),
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {canViewCost && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Price ({settings?.currency_symbol}) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("cost_price", { valueAsNumber: true })}
                  placeholder="0.00"
                  error={errors.cost_price?.message}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price ({settings?.currency_symbol}) *
              </label>
              <Input
                type="number"
                step="0.01"
                {...register("sell_price", { valueAsNumber: true })}
                placeholder="0.00"
                error={errors.sell_price?.message}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Stock Quantity *
              </label>
              <Input
                type="number"
                {...register("stock_qty", { valueAsNumber: true })}
                disabled={!!editingProduct}
                error={errors.stock_qty?.message}
              />
              {editingProduct && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Stock adjustments are audited in movements log.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reorder Warning Threshold *
              </label>
              <Input
                type="number"
                {...register("reorder_level", { valueAsNumber: true })}
                placeholder="10"
                error={errors.reorder_level?.message}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="product_is_active"
              {...register("is_active")}
              className="rounded border-slate-300 text-[#4338CA] focus:ring-[#4338CA]"
            />
            <label
              htmlFor="product_is_active"
              className="text-xs font-medium text-slate-700"
            >
              Product is active and visible for sales
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeFormModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || saveMutation.isPending}
            >
              {saveMutation.isPending
                ? "Saving..."
                : editingProduct
                  ? "Save Changes"
                  : "Create Product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Wizard Modal (Two-step) */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
          setImportPreviewData(null);
        }}
        title="Import Products from CSV"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {!importPreviewData ? (
            /* Step 1: Upload and Preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <p className="font-semibold text-slate-800">
                    Need the CSV template?
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Download the pre-formatted structure with example column
                    headers.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </Button>
              </div>

              {/* Drop area */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-white">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800">
                  Select a CSV file to validate and preview
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Required columns: sku, name, category, cost_price, sell_price,
                  stock_qty, reorder_level
                </p>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4338CA] bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
                  <UploadCloud className="w-4 h-4" />
                  <span>Browse CSV File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {importFile && (
                  <p className="text-xs font-bold text-slate-900 mt-3">
                    Selected: {importFile.name} (
                    {(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!importFile || previewMutation.isPending}
                  onClick={() =>
                    importFile && previewMutation.mutate(importFile)
                  }
                >
                  {previewMutation.isPending
                    ? "Validating CSV..."
                    : "Validate & Preview"}
                </Button>
              </div>
            </div>
          ) : (
            /* Step 2: Confirm Options & Review */
            <div className="space-y-4">
              {/* Summary Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <span className="text-[11px] text-slate-500 block font-semibold">
                    Total Rows
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {importPreviewData.total_rows}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <span className="text-[11px] text-slate-500 block font-semibold">
                    Valid Rows
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {importPreviewData.valid_rows_count}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <span className="text-[11px] text-slate-500 block font-semibold">
                    Errors Found
                  </span>
                  <span
                    className={`text-lg font-bold ${importPreviewData.error_count > 0 ? "text-amber-600" : "text-slate-900"}`}
                  >
                    {importPreviewData.error_count}
                  </span>
                </div>
              </div>

              {/* Error report table if any */}
              {importPreviewData.error_count > 0 && (
                <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>
                      Errors detected ({importPreviewData.error_count} rows will
                      be skipped):
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto text-xs divide-y divide-amber-200/60">
                    {importPreviewData.errors.map((err, i) => (
                      <div
                        key={i}
                        className="py-1 text-slate-700 flex items-center justify-between"
                      >
                        <span>
                          <strong className="font-semibold text-slate-900">
                            Row {err.row}
                          </strong>
                          {err.sku ? ` (SKU: ${err.sku})` : ""}: {err.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected new relations */}
              {(importPreviewData.new_categories.length > 0 ||
                importPreviewData.new_units.length > 0) && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                  <span className="font-semibold text-slate-900 block">
                    Detected New Catalog Entities:
                  </span>
                  {importPreviewData.new_categories.length > 0 && (
                    <div>
                      <span className="text-slate-500">New Categories: </span>
                      <span className="font-medium text-slate-800">
                        {importPreviewData.new_categories.join(", ")}
                      </span>
                    </div>
                  )}
                  {importPreviewData.new_units.length > 0 && (
                    <div>
                      <span className="text-slate-500">New Units: </span>
                      <span className="font-medium text-slate-800">
                        {importPreviewData.new_units.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Options */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3 text-xs">
                <span className="font-bold text-slate-900 block">
                  Import Configuration:
                </span>

                <div>
                  <span className="font-semibold text-slate-700 block mb-1">
                    When SKU already exists in database (
                    {importPreviewData.duplicate_skus.length} matches):
                  </span>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dup_action"
                        value="skip"
                        checked={duplicateAction === "skip"}
                        onChange={() => setDuplicateAction("skip")}
                        className="text-[#4338CA] focus:ring-[#4338CA]"
                      />
                      <span>
                        Skip existing SKUs (preserve existing records)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dup_action"
                        value="update"
                        checked={duplicateAction === "update"}
                        onChange={() => setDuplicateAction("update")}
                        className="text-[#4338CA] focus:ring-[#4338CA]"
                      />
                      <span>
                        Update existing SKUs (overwrite name, prices, reorder
                        levels)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createMissingCats}
                      onChange={(e) => setCreateMissingCats(e.target.checked)}
                      className="rounded border-slate-300 text-[#4338CA] focus:ring-[#4338CA]"
                    />
                    <span>Automatically create missing categories</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createMissingUnits}
                      onChange={(e) => setCreateMissingUnits(e.target.checked)}
                      className="rounded border-slate-300 text-[#4338CA] focus:ring-[#4338CA]"
                    />
                    <span>Automatically create missing units of measure</span>
                  </label>
                </div>
              </div>

              {/* Sample preview table */}
              {importPreviewData.sample_rows.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1">
                    First {importPreviewData.sample_rows.length} rows preview:
                  </span>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="p-2">SKU</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Category</th>
                          <th className="p-2">Unit</th>
                          <th className="p-2 text-right">Sell Price</th>
                          <th className="p-2 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreviewData.sample_rows.map((row, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono font-bold text-slate-700">
                              {row.sku}
                            </td>
                            <td className="p-2 font-medium text-slate-900">
                              {row.name}
                            </td>
                            <td className="p-2 text-slate-600">
                              {row.category_name}
                            </td>
                            <td className="p-2 text-slate-600">
                              {row.unit_name || "-"}
                            </td>
                            <td className="p-2 text-right font-mono">
                              {formatMoney(row.sell_price)}
                            </td>
                            <td className="p-2 text-right font-semibold">
                              {row.stock_qty}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Submit / back */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportPreviewData(null)}
                >
                  Back to File
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={
                      commitMutation.isPending ||
                      importPreviewData.valid_rows_count === 0
                    }
                    onClick={() => commitMutation.mutate()}
                  >
                    {commitMutation.isPending
                      ? "Importing Products..."
                      : `Confirm & Import (${importPreviewData.valid_rows_count} Valid Rows)`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}" (SKU: ${deletingProduct?.sku})? This product will be soft-deleted.`}
        confirmLabel="Delete Product"
        isLoading={deleteMutation.isPending}
        onConfirm={() =>
          deletingProduct && deleteMutation.mutate(deletingProduct.id)
        }
        onClose={() => setDeletingProduct(null)}
      />
    </div>
  );
};
