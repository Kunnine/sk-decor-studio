import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Eye,
  Edit2,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  purchaseApi,
  PurchaseFilters,
  PurchasePayload,
} from "../api/purchases";
import { supplierApi } from "../api/suppliers";
import { productApi } from "../api/products";
import { Purchase, PurchaseStatus, Supplier, Product } from "../types";
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

const purchaseItemSchema = z.object({
  product_id: z.number().min(1, "Please select a product"),
  product_variant_id: z.preprocess(
    (v) =>
      v === "" || v === null || v === undefined || Number.isNaN(Number(v))
        ? null
        : Number(v),
    z.number().nullable().optional(),
  ),
  qty: z.number().int().min(1, "Quantity must be at least 1"),
  unit_cost: z.number().min(0, "Cost must be non-negative"),
});

const purchaseSchema = z.object({
  supplier_id: z.number().min(1, "Please select a supplier"),
  ref_no: z.string().min(2, "Reference number is required").max(100),
  notes: z.string().optional().nullable(),
  items: z
    .array(purchaseItemSchema)
    .min(1, "At least one line item is required"),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export const Purchases: React.FC = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole(["admin", "manager"]);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [filters, setFilters] = useState<PurchaseFilters>({
    page: 1,
    per_page: 10,
    search: "",
    status: "",
    supplier_id: "",
  });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [receivingPurchase, setReceivingPurchase] = useState<Purchase | null>(
    null,
  );
  const [deletingPurchase, setDeletingPurchase] = useState<Purchase | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();

  // Queries
  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ["purchases", filters],
    queryFn: () => purchaseApi.list(filters),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-all"],
    queryFn: () => supplierApi.list({ all: true }),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productApi.list({ per_page: 100 }),
  });

  const purchases = purchasesData?.data || [];
  const meta = purchasesData?.meta;
  const suppliers = suppliersData?.data || [];
  const products = productsData?.data || [];

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema) as any,
    defaultValues: {
      supplier_id: "" as any,
      ref_no: "",
      notes: "",
      items: [
        {
          product_id: "" as any,
          product_variant_id: null,
          qty: 1,
          unit_cost: 0,
        },
      ],
    },
  });

  // Handle shortcut from low-stock page to prefill a draft purchase
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      const pid = searchParams.get("product_id");
      const suggestedQty = searchParams.get("suggested_qty");
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);

      const matchedProduct = pid
        ? products.find((p) => p.id === Number(pid))
        : null;
      const cost = matchedProduct
        ? parseFloat(
            String(matchedProduct.avg_cost || matchedProduct.cost_price || 0),
          )
        : 0;

      reset({
        supplier_id: "" as any,
        ref_no: `PO-${year}-${rand}`,
        notes: pid
          ? `Auto-generated restock for ${matchedProduct?.name || "low stock item"}`
          : "",
        items: [
          {
            product_id: pid ? Number(pid) : ("" as any),
            product_variant_id:
              matchedProduct?.variants && matchedProduct.variants.length > 0
                ? (matchedProduct.variants[0].id ?? null)
                : null,
            qty: suggestedQty ? Math.max(1, parseInt(suggestedQty, 10)) : 10,
            unit_cost: cost,
          },
        ],
      });
      setIsFormModalOpen(true);

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("create");
      nextParams.delete("product_id");
      nextParams.delete("suggested_qty");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, products, reset, setSearchParams]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items") || [];
  const liveTotal = watchedItems.reduce((acc, item) => {
    const qty = Number(item.qty) || 0;
    const cost = Number(item.unit_cost) || 0;
    return acc + qty * cost;
  }, 0);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: PurchasePayload) => {
      if (editingPurchase) {
        return purchaseApi.update(editingPurchase.id, payload);
      }
      return purchaseApi.create(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      addToast({
        title: editingPurchase ? "Purchase Updated" : "Purchase Created",
        message: res.message,
        type: "success",
      });
      closeFormModal();
    },
    onError: (err: any) => {
      addToast({
        title: "Error Saving Purchase",
        message:
          err.response?.data?.message || "Could not save purchase order.",
        type: "error",
      });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: (id: number) => purchaseApi.receive(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["posProducts"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      addToast({
        title: "Stock Received",
        message: res.message,
        type: "success",
      });
      setReceivingPurchase(null);
      if (viewingPurchase && viewingPurchase.id === res.data.id) {
        setViewingPurchase(res.data);
      }
    },
    onError: (err: any) => {
      addToast({
        title: "Receive Failed",
        message:
          err.response?.data?.message || "Could not receive purchase stock.",
        type: "error",
      });
      setReceivingPurchase(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchaseApi.delete(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      addToast({
        title: "Purchase Deleted",
        message: res.message,
        type: "success",
      });
      setDeletingPurchase(null);
    },
    onError: (err: any) => {
      addToast({
        title: "Delete Failed",
        message:
          err.response?.data?.message || "Could not delete draft purchase.",
        type: "error",
      });
      setDeletingPurchase(null);
    },
  });

  const generateRefNo = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setValue("ref_no", `PO-${year}-${rand}`);
  };

  const openCreateModal = () => {
    setEditingPurchase(null);
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    reset({
      supplier_id: "" as any,
      ref_no: `PO-${year}-${rand}`,
      notes: "",
      items: [
        {
          product_id: "" as any,
          product_variant_id: null,
          qty: 10,
          unit_cost: 0,
        },
      ],
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (po: Purchase) => {
    setEditingPurchase(po);
    reset({
      supplier_id: po.supplier_id,
      ref_no: po.ref_no,
      notes: po.notes || "",
      items: (po.items || []).map((item) => ({
        product_id: item.product_id,
        product_variant_id: item.product_variant_id ?? null,
        qty: item.qty,
        unit_cost: parseFloat(String(item.unit_cost)),
      })),
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingPurchase(null);
    reset();
  };

  const onFormSubmit = (data: PurchaseFormData) => {
    saveMutation.mutate({
      supplier_id: data.supplier_id,
      ref_no: data.ref_no,
      notes: data.notes || null,
      items: data.items.map((i) => ({
        product_id: i.product_id,
        ...(i.product_variant_id
          ? { product_variant_id: i.product_variant_id }
          : {}),
        qty: i.qty,
        unit_cost: i.unit_cost,
      })),
    });
  };

  const handleProductSelect = (index: number, productId: number) => {
    const prod = products.find((p) => p.id === productId);
    const activeVariants = (prod?.variants || []).filter(
      (v) => v.is_active !== false,
    );
    if (activeVariants.length > 0 && activeVariants[0].id) {
      const firstVariant = activeVariants[0];
      setValue(`items.${index}.product_variant_id`, firstVariant.id ?? null);
      const vCost = firstVariant.cost_price ?? prod?.cost_price;
      if (vCost !== undefined && vCost !== null) {
        setValue(`items.${index}.unit_cost`, parseFloat(String(vCost)));
      }
    } else {
      setValue(`items.${index}.product_variant_id`, null);
      if (prod && prod.cost_price) {
        setValue(`items.${index}.unit_cost`, parseFloat(prod.cost_price));
      }
    }
  };

  const handleVariantSelect = (index: number, variantIdRaw: string) => {
    const prodId = Number(watchedItems[index]?.product_id);
    const prod = products.find((p) => p.id === prodId);
    const vid = variantIdRaw ? Number(variantIdRaw) : null;
    const matchedVar = prod?.variants?.find((v) => v.id === vid);
    if (matchedVar && matchedVar.cost_price !== undefined) {
      setValue(
        `items.${index}.unit_cost`,
        parseFloat(String(matchedVar.cost_price)),
      );
    } else if (prod && prod.cost_price) {
      setValue(`items.${index}.unit_cost`, parseFloat(prod.cost_price));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#292824] tracking-tight">
            Purchases & Stock-In
          </h2>
          <p className="text-xs text-[#88847D] mt-0.5">
            Procure inventory from suppliers, manage purchase orders, and
            receive shipments
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Purchase
          </Button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-[10px] border border-[#E8E3DA]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#88847D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by PO ref number..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value,
                page: 1,
              }))
            }
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F6F2] border border-[#E8E3DA] rounded-lg placeholder-[#88847D] text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438] focus:bg-white"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              status: e.target.value as PurchaseStatus | "",
              page: 1,
            }))
          }
          className="w-full px-3 py-1.5 text-xs bg-[#F8F6F2] border border-[#E8E3DA] rounded-lg text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438] focus:bg-white"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft (Pending Receiving)</option>
          <option value="received">Received (Stock Added)</option>
        </select>

        <select
          value={filters.supplier_id}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              supplier_id: e.target.value ? Number(e.target.value) : "",
              page: 1,
            }))
          }
          className="w-full px-3 py-1.5 text-xs bg-[#F8F6F2] border border-[#E8E3DA] rounded-lg text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438] focus:bg-white"
        >
          <option value="">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-[10px] border border-[#E8E3DA] overflow-hidden shadow-none">
        {isLoading ? (
          <TableSkeleton rows={6} columns={7} />
        ) : purchases.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No purchase orders found"
              description="Create a purchase order to record inbound supplier shipments and increase stock."
              actionLabel={canManage ? "New Purchase" : undefined}
              onAction={openCreateModal}
              icon={<Truck className="w-8 h-8 text-[#A58B6F]" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#292824]">
              <thead className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">PO Reference</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Total ($)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3DA]">
                {purchases.map((po) => {
                  const isReceived = po.status === "received";
                  return (
                    <tr
                      key={po.id}
                      className="hover:bg-[#FAF8F4] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#292824]">
                        {po.ref_no}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#292824]">
                        {po.supplier?.name || "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-[#292824]">
                        {po.items_count ?? (po.items ? po.items.length : 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#292824]">
                        ${po.total}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={isReceived ? "primary" : "neutral"}
                          size="sm"
                          className={
                            isReceived
                              ? "font-bold"
                              : "font-medium text-[#88847D]"
                          }
                        >
                          {isReceived ? "Received" : "Draft"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[#88847D]">
                        {new Date(po.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingPurchase(po)}
                            className="p-1.5 text-[#88847D] hover:text-[#292824] rounded hover:bg-[#F3EDE6]"
                            title="View Purchase Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isReceived && canManage && (
                            <>
                              <button
                                onClick={() => openEditModal(po)}
                                className="p-1.5 text-[#88847D] hover:text-[#292824] rounded hover:bg-[#F3EDE6]"
                                title="Edit Draft Purchase"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setReceivingPurchase(po)}
                                className="p-1.5 text-[#292824] hover:text-[#795438] rounded hover:bg-[#F3EDE6] font-semibold"
                                title="Receive Stock In"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingPurchase(po)}
                                className="p-1.5 text-[#88847D] hover:text-[#292824] rounded hover:bg-[#F3EDE6]"
                                title="Delete Draft"
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
          <div className="border-t border-[#E8E3DA] px-4 py-3 flex items-center justify-between bg-[#F8F6F2] text-xs text-[#88847D]">
            <div>
              Showing{" "}
              <span className="font-semibold text-[#292824]">
                {meta.from || 0}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-[#292824]">
                {meta.to || 0}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#292824]">{meta.total}</span>{" "}
              purchases
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
                className="p-1.5 rounded border border-[#E8E3DA] bg-white text-[#292824] hover:bg-[#F3EDE6] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-[#292824]">
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
                className="p-1.5 rounded border border-[#E8E3DA] bg-white text-[#292824] hover:bg-[#F3EDE6] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New / Edit Purchase Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        title={
          editingPurchase ? "Edit Draft Purchase" : "Create Purchase Order"
        }
        description="Specify supplier, line items, and purchasing costs. Stock is credited upon receiving."
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs font-semibold text-[#88847D]">
              Estimated Total:{" "}
              <span className="font-mono text-base font-bold text-[#292824]">
                ${liveTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={closeFormModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit(onFormSubmit)}
                isLoading={saveMutation.isPending}
              >
                {editingPurchase ? "Update Purchase" : "Save Draft Purchase"}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Supplier"
              placeholder="Select Supplier"
              required
              options={suppliers.map((s) => ({ label: s.name, value: s.id }))}
              error={errors.supplier_id?.message}
              {...register("supplier_id", { valueAsNumber: true })}
            />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="PO Reference Number"
                  placeholder="PO-2026-0001"
                  required
                  error={errors.ref_no?.message}
                  {...register("ref_no")}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={generateRefNo}
                className="mb-[1px]"
              >
                Auto
              </Button>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#292824]">
                Purchase Line Items ({fields.length})
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    product_id: "" as any,
                    product_variant_id: null,
                    qty: 10,
                    unit_cost: 0,
                  })
                }
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Item
              </Button>
            </div>

            {errors.items?.root && (
              <p className="text-xs text-[#292824] font-semibold mb-2">
                {errors.items.root.message}
              </p>
            )}

            <div className="border border-[#E8E3DA] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] font-semibold">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 w-28">Quantity</th>
                    <th className="py-2 px-3 w-32">Unit Cost ($)</th>
                    <th className="py-2 px-3 text-right w-28">Subtotal</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA]">
                  {fields.map((field, idx) => {
                    const rowQty = Number(watchedItems[idx]?.qty) || 0;
                    const rowCost = Number(watchedItems[idx]?.unit_cost) || 0;
                    const subtotal = (rowQty * rowCost).toFixed(2);
                    const rowProduct = products.find(
                      (p) => p.id === Number(watchedItems[idx]?.product_id),
                    );
                    const rowVariants = (rowProduct?.variants || []).filter(
                      (v) => v.is_active !== false,
                    );

                    return (
                      <tr key={field.id} className="bg-white">
                        <td className="py-2 px-3 space-y-1">
                          <select
                            className="w-full px-2 py-1.5 text-xs bg-white text-[#292824] border border-[#DDD6CA] rounded focus:outline-none focus:ring-1 focus:ring-[#795438]"
                            {...register(`items.${idx}.product_id`, {
                              valueAsNumber: true,
                              onChange: (e) =>
                                handleProductSelect(
                                  idx,
                                  Number(e.target.value),
                                ),
                            })}
                          >
                            <option value="">Select a Product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku} — {p.name}
                              </option>
                            ))}
                          </select>
                          {rowVariants.length > 0 && (
                            <select
                              aria-label="Product variation"
                              className="w-full px-2 py-1 text-[11px] bg-[#F8F6F2] text-[#292824] border border-[#DDD6CA] rounded focus:outline-none focus:ring-1 focus:ring-[#795438]"
                              {...register(`items.${idx}.product_variant_id`, {
                                onChange: (e) =>
                                  handleVariantSelect(idx, e.target.value),
                              })}
                            >
                              <option value="">Default / Base Stock</option>
                              {rowVariants.map((v) => {
                                const label =
                                  v.label ||
                                  v.name ||
                                  [v.color, v.size, v.material, v.style]
                                    .filter(Boolean)
                                    .join(" / ") ||
                                  v.sku;
                                return (
                                  <option key={v.id} value={v.id}>
                                    Variation: {label} ({v.sku})
                                  </option>
                                );
                              })}
                            </select>
                          )}
                          {errors.items?.[idx]?.product_id && (
                            <span className="text-[10px] text-[#292824] font-bold block mt-0.5">
                              {errors.items[idx]?.product_id?.message}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="1"
                            className="w-full px-2 py-1.5 text-xs bg-white text-[#292824] border border-[#DDD6CA] rounded focus:outline-none focus:ring-1 focus:ring-[#795438]"
                            {...register(`items.${idx}.qty`, {
                              valueAsNumber: true,
                            })}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full px-2 py-1.5 text-xs bg-white text-[#292824] border border-[#DDD6CA] rounded focus:outline-none focus:ring-1 focus:ring-[#795438]"
                            {...register(`items.${idx}.unit_cost`, {
                              valueAsNumber: true,
                            })}
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-[#292824]">
                          ${subtotal}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(idx)}
                              className="p-1 text-[#88847D] hover:text-[#292824] rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#292824] mb-1.5">
              Internal Procurement Notes
            </label>
            <textarea
              rows={2}
              placeholder="Shipping instructions, invoice references, carrier details..."
              className="w-full px-3 py-2 text-sm bg-white text-[#292824] border border-[#DDD6CA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438]"
              {...register("notes")}
            />
          </div>
        </form>
      </Modal>

      {/* View Purchase Detail Modal */}
      {viewingPurchase && (
        <Modal
          isOpen={Boolean(viewingPurchase)}
          onClose={() => setViewingPurchase(null)}
          title={`Purchase Order: ${viewingPurchase.ref_no}`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-[#88847D]">
                Created: {new Date(viewingPurchase.created_at).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingPurchase(null)}
                >
                  Close
                </Button>
                {viewingPurchase.status === "draft" && canManage && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setReceivingPurchase(viewingPurchase);
                    }}
                    leftIcon={<PackageCheck className="w-4 h-4" />}
                  >
                    Receive Stock
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA] text-xs">
              <div>
                <span className="text-[#88847D] block">Supplier</span>
                <span className="font-semibold text-[#292824]">
                  {viewingPurchase.supplier?.name}
                </span>
              </div>
              <div>
                <span className="text-[#88847D] block">Status</span>
                <span className="font-bold text-[#292824] uppercase">
                  {viewingPurchase.status}
                </span>
              </div>
              <div>
                <span className="text-[#88847D] block">Received At</span>
                <span className="font-medium text-[#292824]">
                  {viewingPurchase.received_at
                    ? new Date(viewingPurchase.received_at).toLocaleDateString()
                    : "Not received"}
                </span>
              </div>
              <div>
                <span className="text-[#88847D] block">Total Amount</span>
                <span className="font-bold font-mono text-[#292824] text-sm">
                  ${viewingPurchase.total}
                </span>
              </div>
            </div>

            {viewingPurchase.notes && (
              <div className="text-xs p-3 bg-[#F8F6F2] rounded border border-[#E8E3DA] text-[#292824]">
                <span className="font-semibold block mb-0.5">Notes:</span>
                {viewingPurchase.notes}
              </div>
            )}

            <div className="border border-[#E8E3DA] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] font-semibold">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Cost</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DA]">
                  {(viewingPurchase.items || []).map((item, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="py-2 px-3 font-medium text-[#292824]">
                        <div>
                          {item.product?.sku} — {item.product?.name}
                        </div>
                        {item.variant_label && (
                          <div className="text-[10px] font-medium text-[#795438] mt-0.5">
                            {item.variant_label}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold text-[#292824]">
                        {item.qty}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#88847D]">
                        ${item.unit_cost}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#292824]">
                        $
                        {item.subtotal ||
                          (Number(item.qty) * Number(item.unit_cost)).toFixed(
                            2,
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Receive Stock Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(receivingPurchase)}
        onClose={() => setReceivingPurchase(null)}
        onConfirm={() =>
          receivingPurchase && receiveMutation.mutate(receivingPurchase.id)
        }
        title="Receive Purchase Shipment"
        message={`Are you sure you want to mark PO "${receivingPurchase?.ref_no}" as received? This will atomically increment stock quantities for all line items and recalculate weighted average costs. This action cannot be reversed.`}
        confirmLabel="Receive Stock"
        isLoading={receiveMutation.isPending}
      />

      {/* Delete Draft Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingPurchase)}
        onClose={() => setDeletingPurchase(null)}
        onConfirm={() =>
          deletingPurchase && deleteMutation.mutate(deletingPurchase.id)
        }
        title="Delete Draft Purchase"
        message={`Delete draft purchase order "${deletingPurchase?.ref_no}"?`}
        confirmLabel="Delete Draft"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
