import React, { useState, useMemo, useEffect } from "react";
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
  UploadCloud,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  FileSpreadsheet,
  Eye,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  AlertCircle,
  Image as ImageIcon,
  Layers,
  X,
  LayoutGrid,
  List,
  MoreVertical,
  Ban,
} from "lucide-react";
import { productApi, ProductFilters, ProductPayload } from "../api/products";
import { categoryApi } from "../api/categories";
import { supplierApi } from "../api/suppliers";
import { adjustmentApi } from "../api/adjustments";
import { movementApi } from "../api/movements";
import {
  Product,
  ProductVariant,
  CsvImportResult,
  StockMovement,
  Category,
  Supplier,
} from "../types";
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

const DECOR_COLOR_SUGGESTIONS = [
  "White",
  "Black",
  "Beige",
  "Brown",
  "Grey",
  "Gold",
  "Warm Brass",
  "Natural",
  "Sage Green",
  "Emerald",
  "Clear",
  "Cream",
];

const DECOR_SIZE_SUGGESTIONS = [
  "Small",
  "Medium",
  "Large",
  "Compact",
  "Standard",
  "Oversized",
  "45x45 cm",
  "120x180 cm",
];

const DECOR_MATERIAL_SUGGESTIONS = [
  "Ceramic",
  "Glass",
  "Metal",
  "Wood",
  "Brass",
  "Marble",
  "Fabric",
  "Linen",
  "Velvet",
  "Woven Rattan",
  "Soy Wax",
];

const DECOR_STYLE_SUGGESTIONS = [
  "Modern",
  "Minimalist",
  "Nordic",
  "Luxury",
  "Vintage",
  "Boho",
  "Contemporary",
];

const productSchema = z.object({
  sku: z.string().min(2, "SKU must be at least 2 characters").max(64),
  name: z.string().min(2, "Product name is required").max(255),
  description: z.string().optional().nullable(),
  category_id: z.number().min(1, "Please select a valid category"),
  supplier_id: z.preprocess(
    (v) =>
      v === "" || v === null || v === undefined || Number.isNaN(Number(v))
        ? null
        : Number(v),
    z.number().nullable().optional(),
  ),
  cost_price: z.number().min(0, "Cost price cannot be negative"),
  sell_price: z.number().min(0, "Sell price cannot be negative"),
  stock_qty: z.number().int().min(0, "Stock cannot be negative"),
  reorder_level: z.number().int().min(0, "Reorder level cannot be negative"),
  color: z.string().max(64).optional().nullable(),
  size: z.string().max(64).optional().nullable(),
  material: z.string().max(64).optional().nullable(),
  style: z.string().max(64).optional().nullable(),
  is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface VariantDraftRow {
  id?: number;
  sku: string;
  name: string;
  color: string;
  size: string;
  material: string;
  style: string;
  cost_price: string;
  sell_price: string;
  stock_qty: string;
  reorder_level: string;
  is_active: boolean;
}

export const Products: React.FC = () => {
  const { user, settings, hasRole } = useAuth();
  const canManage = hasRole(["admin", "manager"]);
  const currencySymbol = settings?.currency_symbol || "$";
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // View mode (Grid boutique showcase by default, optional List view)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filters state
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    per_page: 12,
    search: "",
    parent_category_id: "",
    category_id: "",
    supplier_id: "",
    min_price: "",
    max_price: "",
    stock_status: "",
    is_active: "",
    low_stock: false,
    sort_by: "created_at",
    sort_order: "desc",
  });

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalParentCategoryFilter, setModalParentCategoryFilter] =
    useState<string>("");
  const [hasVariantsToggle, setHasVariantsToggle] = useState<boolean>(false);
  const [variantRows, setVariantRows] = useState<VariantDraftRow[]>([]);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [removeExistingImage, setRemoveExistingImage] =
    useState<boolean>(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [imageModalProduct, setImageModalProduct] = useState<Product | null>(
    null,
  );
  const [modalImageFile, setModalImageFile] = useState<File | null>(null);
  const [modalRemoveExisting, setModalRemoveExisting] =
    useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(
    null,
  );

  // Stock Adjustment state
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(
    null,
  );
  const [adjustVariantId, setAdjustVariantId] = useState<number | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  // Detail & Stock History state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailTab, setDetailTab] = useState<"details" | "history">("details");
  const [openCardMenuId, setOpenCardMenuId] = useState<number | null>(null);

  // Close management-only modals/menus immediately if active role loses management access
  useEffect(() => {
    if (!canManage) {
      setIsFormModalOpen(false);
      setEditingProduct(null);
      setAdjustingProduct(null);
      setAdjustVariantId(null);
      setDeletingProduct(null);
      setImageModalProduct(null);
      setIsImportModalOpen(false);
      setOpenCardMenuId(null);
      setDetailTab("details");
    }
  }, [canManage]);

  useEffect(() => {
    if (openCardMenuId === null) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-card-action-menu="true"]')) return;
      setOpenCardMenuId(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenCardMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openCardMenuId]);

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => categoryApi.list({ all: true }),
    retry: false,
  });

  // Fetch suppliers only for roles permitted to manage products / view suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-all"],
    queryFn: async () => {
      try {
        if (typeof supplierApi?.list !== "function") {
          return { data: [] as Supplier[] };
        }
        return await supplierApi.list({ all: true });
      } catch {
        return { data: [] as Supplier[] };
      }
    },
    enabled: canManage,
    retry: false,
  });

  // Fetch products
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["products", filters, user?.role ?? null],
    queryFn: () => productApi.list(filters),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Fetch movements for selected detail product when history tab is active
  const { data: detailMovementsData, isLoading: isDetailMovementsLoading } =
    useQuery({
      queryKey: ["product-movements", detailProduct?.id],
      queryFn: () =>
        movementApi.list({ product_id: detailProduct!.id, per_page: 50 }),
      enabled: canManage && Boolean(detailProduct && detailTab === "history"),
    });

  const products = data?.data || [];
  const meta = data?.meta;
  const allCategories: Category[] = categoriesData?.data || [];
  const allSuppliers: Supplier[] = suppliersData?.data || [];

  const parentCategories = useMemo(
    () => allCategories.filter((cat) => !cat.parent_id),
    [allCategories],
  );

  const standaloneCategories = useMemo(
    () =>
      allCategories.filter(
        (cat) => !cat.parent_id && (!cat.children || cat.children.length === 0),
      ),
    [allCategories],
  );

  const selectedCategoryFilterValue = filters.category_id
    ? String(filters.category_id)
    : filters.parent_category_id
      ? `p:${filters.parent_category_id}`
      : "";

  const handleUnifiedCategoryFilterChange = (rawValue: string) => {
    if (!rawValue) {
      setFilters((prev) => ({
        ...prev,
        parent_category_id: "",
        category_id: "",
        page: 1,
      }));
      return;
    }

    if (rawValue.startsWith("p:")) {
      const parentId = Number(rawValue.slice(2));
      setFilters((prev) => ({
        ...prev,
        parent_category_id: parentId || "",
        category_id: "",
        page: 1,
      }));
      return;
    }

    const catId = Number(rawValue);
    setFilters((prev) => ({
      ...prev,
      parent_category_id: "",
      category_id: catId || "",
      page: 1,
    }));
  };

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
  });

  const watchedSku = watch("sku") || "";
  const watchedCostPrice = watch("cost_price") ?? 0;
  const watchedSellPrice = watch("sell_price") ?? 0;
  const watchedReorderLevel = watch("reorder_level") ?? 10;

  const variantTotalStock = useMemo(
    () =>
      variantRows.reduce(
        (sum, row) =>
          sum +
          (row.is_active ? Math.max(0, parseInt(row.stock_qty, 10) || 0) : 0),
        0,
      ),
    [variantRows],
  );

  useEffect(() => {
    if (isFormModalOpen && hasVariantsToggle) {
      setValue("stock_qty", variantTotalStock, { shouldValidate: true });
    }
  }, [isFormModalOpen, hasVariantsToggle, variantTotalStock, setValue]);

  const invalidateSyncedProductQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["posProducts"] });
    queryClient.invalidateQueries({ queryKey: ["products-all"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-low-stock"] });
    queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
  };

  // Save (Create / Update) Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: ProductPayload) => {
      if (editingProduct) {
        return productApi.update(editingProduct.id, payload);
      }
      return productApi.create(payload);
    },
    onSuccess: (res) => {
      invalidateSyncedProductQueries();
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["product-movements"] });
      if (detailProduct && detailProduct.id === res.data.id) {
        setDetailProduct(res.data);
      }
      addToast({
        title: editingProduct ? "Product Updated" : "Product Created",
        message: res.message,
        type: "success",
      });
      closeFormModal();
    },
    onError: (err: any) => {
      const fieldErrors = err.response?.data?.errors as
        Record<string, string[]> | undefined;
      if (fieldErrors) {
        const formFieldMap: Array<keyof ProductFormData> = [
          "sku",
          "name",
          "description",
          "category_id",
          "supplier_id",
          "cost_price",
          "sell_price",
          "stock_qty",
          "reorder_level",
          "color",
          "size",
          "material",
          "style",
        ];
        formFieldMap.forEach((field) => {
          const messages = fieldErrors[field];
          if (Array.isArray(messages) && messages.length > 0) {
            setError(field, { type: "server", message: messages[0] });
          }
        });
      }

      const msg =
        err.response?.status === 403
          ? err.response?.data?.message ||
            "You do not have permission to create or modify products. Please sign in with an Admin or Manager account."
          : err.response?.data?.message || "Failed to save product details.";
      addToast({
        title:
          err.response?.status === 403 ? "Permission Denied" : "Save Failed",
        message: msg,
        type: "error",
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => productApi.delete(id),
    onSuccess: (res, deletedId) => {
      invalidateSyncedProductQueries();
      if (detailProduct && detailProduct.id === deletedId) {
        setDetailProduct(null);
      }
      addToast({
        title: res.has_transaction_history
          ? "Product Archived"
          : "Product Deleted",
        message: res.message,
        type: "success",
      });
      setDeletingProduct(null);
    },
    onError: (err: any) => {
      addToast({
        title: "Delete Failed",
        message: err.response?.data?.message || "Could not delete product.",
        type: "error",
      });
      setDeletingProduct(null);
    },
  });

  // Toggle Active Status Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (id: number) => productApi.toggleActive(id),
    onSuccess: (res) => {
      invalidateSyncedProductQueries();
      if (detailProduct && detailProduct.id === res.data.id) {
        setDetailProduct(res.data);
      }
      addToast({
        title: res.data.is_active ? "Product Activated" : "Product Deactivated",
        message:
          res.message ||
          (res.data.is_active
            ? "Product is now active and available in POS."
            : "Product is now inactive and hidden from POS checkout."),
        type: "success",
      });
    },
    onError: (err: any) => {
      addToast({
        title: "Status Update Failed",
        message:
          err.response?.data?.message || "Could not update product status.",
        type: "error",
      });
    },
  });

  // Import Mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => productApi.importCsv(file),
    onSuccess: (res) => {
      setImportResult(res);
      invalidateSyncedProductQueries();
      queryClient.invalidateQueries({ queryKey: ["categories-all"] });
      addToast({
        title: "Import Completed",
        message: res.message,
        type: "success",
      });
    },
    onError: (err: any) => {
      addToast({
        title: "Import Failed",
        message: err.response?.data?.message || "CSV processing failed.",
        type: "error",
      });
    },
  });

  // Stock Adjustment Mutation
  const adjustmentMutation = useMutation({
    mutationFn: (payload: {
      product_id: number;
      product_variant_id?: number | null;
      delta: number;
      reason: string;
    }) => adjustmentApi.create(payload),
    onSuccess: (res) => {
      invalidateSyncedProductQueries();
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["product-movements"] });
      addToast({
        title: "Stock Adjusted",
        message: res.message || "Product stock updated successfully.",
        type: "success",
      });
      setAdjustingProduct(null);
      setAdjustVariantId(null);
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message || "Failed to adjust product stock.";
      setAdjustmentError(msg);
      addToast({
        title: "Adjustment Failed",
        message: msg,
        type: "error",
      });
    },
  });

  // Dedicated Product Image Upload Mutation
  const uploadImageMutation = useMutation({
    mutationFn: ({ productId, file }: { productId: number; file: File }) =>
      productApi.uploadImage(productId, file),
    onSuccess: (res) => {
      invalidateSyncedProductQueries();
      if (detailProduct && detailProduct.id === res.data.id) {
        setDetailProduct(res.data);
      }
      addToast({
        title: "Image Uploaded",
        message: res.message || "Product image updated successfully.",
        type: "success",
      });
      closeImageModal();
    },
    onError: (err: any) => {
      addToast({
        title: "Upload Failed",
        message:
          err.response?.data?.message || "Failed to upload product image.",
        type: "error",
      });
    },
  });

  // Dedicated Product Image Delete Mutation
  const deleteImageMutation = useMutation({
    mutationFn: (productId: number) => productApi.deleteImage(productId),
    onSuccess: (res) => {
      invalidateSyncedProductQueries();
      if (detailProduct && detailProduct.id === res.data.id) {
        setDetailProduct(res.data);
      }
      addToast({
        title: "Image Removed",
        message: res.message || "Product image removed successfully.",
        type: "success",
      });
      closeImageModal();
    },
    onError: (err: any) => {
      addToast({
        title: "Remove Failed",
        message:
          err.response?.data?.message || "Failed to remove product image.",
        type: "error",
      });
    },
  });

  const openImageModal = (prod: Product) => {
    setImageModalProduct(prod);
    setModalImageFile(null);
    setModalRemoveExisting(false);
  };

  const closeImageModal = () => {
    setImageModalProduct(null);
    setModalImageFile(null);
    setModalRemoveExisting(false);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setModalParentCategoryFilter("");
    setHasVariantsToggle(false);
    setVariantRows([]);
    setSelectedImageFile(null);
    setRemoveExistingImage(false);
    reset({
      sku: "",
      name: "",
      description: "",
      category_id: "" as any,
      supplier_id: null,
      cost_price: 0,
      sell_price: 0,
      stock_qty: 0,
      reorder_level: 10,
      color: "",
      size: "",
      material: "",
      style: "",
      is_active: true,
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    const prodCat = allCategories.find((c) => c.id === prod.category_id);
    const parentId =
      prodCat?.parent_id ??
      prod.category?.parent?.id ??
      prod.parent_category?.id ??
      (prodCat && !prodCat.parent_id ? prodCat.id : null);
    setModalParentCategoryFilter(parentId ? String(parentId) : "");
    const existingVariants = prod.variants || [];
    setHasVariantsToggle(
      Boolean(prod.has_variants && existingVariants.length > 0),
    );
    setVariantRows(
      existingVariants.map((v) => ({
        id: v.id,
        sku: v.sku || "",
        name: v.name || "",
        color: v.color || "",
        size: v.size || "",
        material: v.material || "",
        style: v.style || "",
        cost_price:
          v.cost_price !== undefined
            ? String(v.cost_price)
            : String(prod.cost_price || "0"),
        sell_price: String(v.sell_price ?? prod.sell_price),
        stock_qty: String(v.stock_qty ?? 0),
        reorder_level: String(v.reorder_level ?? prod.reorder_level),
        is_active: v.is_active ?? true,
      })),
    );
    setSelectedImageFile(null);
    setRemoveExistingImage(false);
    reset({
      sku: prod.sku,
      name: prod.name,
      description: prod.description || "",
      category_id: prod.category_id,
      supplier_id: prod.supplier_id ?? null,
      cost_price: prod.cost_price ? parseFloat(prod.cost_price) : 0,
      sell_price: parseFloat(prod.sell_price),
      stock_qty: prod.stock_qty,
      reorder_level: prod.reorder_level,
      color: prod.color || "",
      size: prod.size || "",
      material: prod.material || "",
      style: prod.style || "",
      is_active: prod.is_active,
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingProduct(null);
    setModalParentCategoryFilter("");
    setHasVariantsToggle(false);
    setVariantRows([]);
    setSelectedImageFile(null);
    setRemoveExistingImage(false);
    reset();
  };

  const handleAddVariantRow = () => {
    const nextIdx = variantRows.length + 1;
    const prefix = watchedSku ? watchedSku.trim().toUpperCase() : "VAR";
    setVariantRows((prev) => [
      ...prev,
      {
        sku: `${prefix}-V${nextIdx}`,
        name: "",
        color: "",
        size: "",
        material: "",
        style: "",
        cost_price: String(Number(watchedCostPrice) || 0),
        sell_price: String(Number(watchedSellPrice) || 0),
        stock_qty: "0",
        reorder_level: String(Number(watchedReorderLevel) || 10),
        is_active: true,
      },
    ]);
  };

  const handleUpdateVariantRow = (
    idx: number,
    field: keyof VariantDraftRow,
    val: string | boolean,
  ) => {
    setVariantRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row)),
    );
  };

  const handleRemoveVariantRow = (idx: number) => {
    setVariantRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const onFormSubmit = (formData: ProductFormData) => {
    if (!canManage) {
      addToast({
        title: "Permission Denied",
        message: "Only Admins and Managers can create or update products.",
        type: "error",
      });
      closeFormModal();
      return;
    }

    const cleanVariants: ProductVariant[] = hasVariantsToggle
      ? variantRows
          .filter((r) => r.sku.trim().length > 0)
          .map((r) => ({
            ...(r.id ? { id: r.id } : {}),
            sku: r.sku.trim(),
            name: r.name.trim() || null,
            color: r.color.trim() || null,
            size: r.size.trim() || null,
            material: r.material.trim() || null,
            style: r.style.trim() || null,
            cost_price: Math.max(0, parseFloat(r.cost_price) || 0),
            sell_price: Math.max(0, parseFloat(r.sell_price) || 0),
            stock_qty: Math.max(0, parseInt(r.stock_qty, 10) || 0),
            reorder_level: Math.max(0, parseInt(r.reorder_level, 10) || 0),
            is_active: r.is_active,
          }))
      : [];

    const payload: ProductPayload = {
      sku: formData.sku,
      name: formData.name,
      description: formData.description || "",
      category_id: formData.category_id,
      cost_price: formData.cost_price,
      sell_price: formData.sell_price,
      stock_qty: formData.stock_qty,
      reorder_level: formData.reorder_level,
      is_active: formData.is_active,
      image: selectedImageFile,
      remove_image: Boolean(editingProduct && removeExistingImage),
    };

    if (formData.supplier_id) {
      payload.supplier_id = formData.supplier_id;
    } else if (editingProduct) {
      payload.supplier_id = null;
    }

    if (formData.color?.trim()) {
      payload.color = formData.color.trim();
    } else if (editingProduct) {
      payload.color = null;
    }

    if (formData.size?.trim()) {
      payload.size = formData.size.trim();
    } else if (editingProduct) {
      payload.size = null;
    }

    if (formData.material?.trim()) {
      payload.material = formData.material.trim();
    } else if (editingProduct) {
      payload.material = null;
    }

    if (formData.style?.trim()) {
      payload.style = formData.style.trim();
    } else if (editingProduct) {
      payload.style = null;
    }

    if (hasVariantsToggle && cleanVariants.length > 0) {
      payload.has_variants = true;
      payload.variants = cleanVariants;
    } else if (editingProduct && editingProduct.has_variants) {
      payload.has_variants = false;
      payload.variants = [];
    }

    saveMutation.mutate(payload);
  };

  const openAdjustmentModal = (prod: Product) => {
    setAdjustingProduct(prod);
    const firstVariantId =
      prod.variants && prod.variants.length > 0
        ? (prod.variants[0].id ?? null)
        : null;
    setAdjustVariantId(firstVariantId);
    setAdjustmentDelta(0);
    setAdjustmentReason("");
    setAdjustmentError(null);
  };

  const selectedAdjustmentVariant = adjustingProduct?.variants?.find(
    (v) => v.id === adjustVariantId,
  );
  const currentStock = selectedAdjustmentVariant
    ? selectedAdjustmentVariant.stock_qty
    : (adjustingProduct?.stock_qty ?? 0);
  const activeReorderLevel = selectedAdjustmentVariant
    ? selectedAdjustmentVariant.reorder_level
    : (adjustingProduct?.reorder_level ?? 0);
  const projectedStock = currentStock + adjustmentDelta;
  const isProjectedNegative = projectedStock < 0;
  const isProjectedLow = adjustingProduct
    ? projectedStock <= activeReorderLevel
    : false;

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    if (adjustmentDelta === 0) {
      setAdjustmentError("Delta quantity must be non-zero.");
      return;
    }
    if (isProjectedNegative) {
      setAdjustmentError(
        `Resulting stock cannot be negative. Max reduction is -${currentStock}.`,
      );
      return;
    }
    if (!adjustmentReason.trim() || adjustmentReason.trim().length < 3) {
      setAdjustmentError(
        "A detailed reason is required (minimum 3 characters).",
      );
      return;
    }
    setAdjustmentError(null);
    adjustmentMutation.mutate({
      product_id: adjustingProduct.id,
      ...(adjustVariantId ? { product_variant_id: adjustVariantId } : {}),
      delta: adjustmentDelta,
      reason: adjustmentReason.trim(),
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await productApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "products_import_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      addToast({
        title: "Download Failed",
        message: "Unable to download template at this time.",
        type: "error",
      });
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    importMutation.mutate(importFile);
  };

  const handleModalParentCategoryChange = (nextParentId: string) => {
    setModalParentCategoryFilter(nextParentId);
    if (!nextParentId) return;

    const parentIdNum = Number(nextParentId);
    const children = allCategories.filter((c) => c.parent_id === parentIdNum);

    if (children.length === 0) {
      setValue("category_id", parentIdNum, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      const currentCatId = getValues("category_id");
      const belongsToParent = children.some(
        (c) => c.id === Number(currentCatId),
      );
      if (!belongsToParent) {
        setValue("category_id", "" as any, {
          shouldValidate: false,
          shouldDirty: true,
        });
      }
    }
  };

  const categoryOptions = useMemo(() => {
    const list = categoriesData?.data || [];
    const parentIdNum = modalParentCategoryFilter
      ? Number(modalParentCategoryFilter)
      : null;

    const filtered = parentIdNum
      ? (() => {
          const children = list.filter((cat) => cat.parent_id === parentIdNum);
          if (children.length === 0) {
            const parent = list.find((cat) => cat.id === parentIdNum);
            return parent ? [parent] : [];
          }
          if (editingProduct?.category_id === parentIdNum) {
            const parent = list.find((cat) => cat.id === parentIdNum);
            return parent ? [parent, ...children] : children;
          }
          return children;
        })()
      : list;

    const mapped = filtered.map((cat) => ({
      label:
        parentIdNum && cat.parent_id === parentIdNum
          ? cat.name
          : cat.parent
            ? `${cat.parent.name} > ${cat.name}`
            : cat.name,
      value: cat.id,
    }));

    if (
      editingProduct?.category &&
      !mapped.some((opt) => Number(opt.value) === editingProduct.category_id)
    ) {
      mapped.unshift({
        label: editingProduct.category.parent
          ? `${editingProduct.category.parent.name} > ${editingProduct.category.name}`
          : editingProduct.category.name,
        value: editingProduct.category_id,
      });
    }

    return mapped;
  }, [categoriesData?.data, modalParentCategoryFilter, editingProduct]);

  const supplierOptions = useMemo(() => {
    const opts = allSuppliers.map((sup) => ({
      label: sup.name,
      value: sup.id,
    }));

    if (
      editingProduct?.supplier &&
      !allSuppliers.some((s) => s.id === editingProduct.supplier!.id)
    ) {
      opts.unshift({
        label: editingProduct.supplier.name,
        value: editingProduct.supplier.id,
      });
    }

    return opts;
  }, [allSuppliers, editingProduct]);

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.parent_category_id ||
    filters.category_id ||
    filters.supplier_id ||
    filters.min_price ||
    filters.max_price ||
    filters.stock_status ||
    filters.is_active !== "" ||
    filters.low_stock,
  );

  const resetAllFilters = () => {
    setFilters({
      page: 1,
      per_page: 12,
      search: "",
      parent_category_id: "",
      category_id: "",
      supplier_id: "",
      min_price: "",
      max_price: "",
      stock_status: "",
      is_active: "",
      low_stock: false,
      sort_by: "created_at",
      sort_order: "desc",
    });
  };

  return (
    <div className="space-y-8 bg-[#F8F6F2] rounded-xl p-1 sm:p-2">
      {/* Top Header — Restrained & Editorial */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#292824] tracking-tight">
            Home Decor Catalog
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-[#88847D]">
            <span>{meta?.total ?? products.length} products in catalog</span>
            {canManage && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setImportFile(null);
                    setImportResult(null);
                    setIsImportModalOpen(true);
                  }}
                  className="text-[#88847D] hover:text-[#795438] underline underline-offset-4 transition-colors"
                >
                  Import CSV
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Minimalist Toolbar: Search + Category + Stock + Grid/List + Add Product */}
      <div className="bg-white/90 px-4 py-3 rounded-[10px] border border-[#E8E3DA]/80 flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#88847D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products or SKU..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value,
                page: 1,
              }))
            }
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8F6F2] border border-[#E8E3DA] rounded-lg text-[#292824] placeholder-[#88847D] focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438] focus:bg-white transition-colors"
          />
        </div>

        {/* Single Category Filter (Parents + Subcategories grouped cleanly) */}
        <select
          aria-label="Filter by category"
          value={selectedCategoryFilterValue}
          onChange={(e) => handleUnifiedCategoryFilterChange(e.target.value)}
          className="lg:w-56 px-3 py-2 text-xs bg-[#F8F6F2] border border-[#E8E3DA] rounded-lg text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438] focus:bg-white transition-colors"
        >
          <option value="">All Categories</option>
          {parentCategories.map((parent) => {
            const children = allCategories.filter(
              (c) => c.parent_id === parent.id,
            );
            if (children.length === 0) {
              return (
                <option key={parent.id} value={String(parent.id)}>
                  {parent.name}
                </option>
              );
            }
            return (
              <optgroup key={parent.id} label={parent.name}>
                <option value={`p:${parent.id}`}>All {parent.name}</option>
                {children.map((sub) => (
                  <option key={sub.id} value={String(sub.id)}>
                    {sub.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
          {standaloneCategories.length > 0 &&
            standaloneCategories
              .filter((c) => !parentCategories.some((p) => p.id === c.id))
              .map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
        </select>

        {/* Single Stock Status Filter */}
        <select
          aria-label="Filter by stock status"
          value={filters.stock_status}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              stock_status: e.target.value as ProductFilters["stock_status"],
              page: 1,
            }))
          }
          className="lg:w-44 px-3 py-2 text-xs bg-[#F8F6F2] border border-[#E8E3DA] rounded-lg text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438] focus:bg-white transition-colors"
        >
          <option value="">All Stock</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        {/* Product Status Filter */}
        <select
          aria-label="Filter by product status"
          value={
            filters.is_active === true
              ? "1"
              : filters.is_active === false
                ? "0"
                : String(filters.is_active ?? "")
          }
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              is_active: e.target.value,
              page: 1,
            }))
          }
          className="lg:w-36 px-3 py-2 text-xs bg-[#F8F6F2] border border-[#E8E3DA] rounded-lg text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438] focus:bg-white transition-colors"
        >
          <option value="">All Status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>

        <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
          {/* Grid / List Toggle */}
          <div
            className="inline-flex items-center rounded-lg border border-[#E8E3DA] bg-[#F8F6F2] p-0.5"
            role="group"
            aria-label="View layout"
          >
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-[#795438] text-white"
                  : "text-[#88847D] hover:text-[#292824]"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-[#795438] text-white"
                  : "text-[#88847D] hover:text-[#292824]"
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-2.5 py-2 text-xs font-medium text-[#88847D] hover:text-[#292824] transition-colors"
            >
              Reset
            </button>
          )}

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              leftIcon={<Plus className="w-4 h-4" />}
              className="whitespace-nowrap"
            >
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Catalog Display: Clean Grid Cards (default) or Management Table List */}
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-[10px] overflow-hidden p-0"
              >
                <div className="aspect-[4/5] w-full bg-[#EFECE5] animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-[#EFECE5] rounded animate-pulse w-3/4" />
                  <div className="h-3.5 bg-[#EFECE5] rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[10px] border border-[#E8E3DA] overflow-hidden">
            <TableSkeleton rows={8} columns={canManage ? 10 : 8} />
          </div>
        )
      ) : isError ? (
        <div
          role="alert"
          className="bg-white rounded-[10px] border border-[#E8E3DA] p-10 text-center space-y-3"
        >
          <div className="w-11 h-11 rounded-full bg-[#F8F6F2] border border-[#E8E3DA] flex items-center justify-center mx-auto text-[#795438]">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-[#292824]">
            Unable to load products
          </h3>
          <p className="text-xs text-[#88847D] max-w-md mx-auto">
            {(error as any)?.response?.data?.message ||
              (error as Error)?.message ||
              "A server or network error occurred while fetching your product catalog."}
          </p>
          <div className="pt-1">
            <Button variant="primary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-[10px] border border-[#E8E3DA] p-10">
          <EmptyState
            title="No products found"
            description={
              hasActiveFilters
                ? "No decor items matched your active filters."
                : "Start building your interior home decoration catalog by adding your first product."
            }
            actionLabel={
              hasActiveFilters
                ? "Clear Filters"
                : canManage
                  ? "Add Product"
                  : undefined
            }
            onAction={hasActiveFilters ? resetAllFilters : openCreateModal}
          />
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
          {products.map((prod) => {
            const isOut = prod.stock_qty <= 0;
            const isLow = !isOut && prod.is_low_stock;
            const parentCatName =
              prod.parent_category?.name || prod.category?.parent?.name;
            const subCatName = prod.category?.name;
            const categoryDisplay =
              parentCatName && subCatName
                ? `${parentCatName} › ${subCatName}`
                : subCatName || parentCatName || "Uncategorized";

            return (
              <article
                key={prod.id}
                data-testid="catalog-product-card"
                className={`bg-white rounded-[10px] border flex flex-col relative ${
                  prod.is_active
                    ? "border-[#E8E3DA]/80"
                    : "border-[#DDD6CA] bg-[#FAF8F4]"
                }`}
              >
                {/* Static 4:5 Product Photography (non-clickable) */}
                <div className="aspect-[4/5] w-full bg-[#F8F6F2] rounded-t-[10px] overflow-hidden flex items-center justify-center">
                  {prod.image_url || prod.thumb_url ? (
                    <img
                      src={prod.image_url || prod.thumb_url || ""}
                      alt={prod.name}
                      className={`w-full h-full object-cover ${
                        prod.is_active ? "" : "opacity-75"
                      }`}
                    />
                  ) : (
                    <Package className="w-10 h-10 text-[#C8C1B6] stroke-[1.15]" />
                  )}
                </div>

                {/* Static Card Details: Category, Status, Name, SKU, Selling Price, Stock + Dedicated Actions */}
                <div className="px-4 py-4 flex flex-col gap-2.5 flex-1 justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-[11px] font-medium text-[#88847D] truncate"
                        title={categoryDisplay}
                      >
                        {categoryDisplay}
                      </p>
                      <span
                        data-testid="product-status-badge"
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          prod.is_active
                            ? "bg-[#F8F6F2] text-[#795438] border-[#E8E3DA]"
                            : "bg-[#EFECE5] text-[#88847D] border-[#DDD6CA]"
                        }`}
                      >
                        {prod.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <h3
                      className="text-[15px] font-medium text-[#292824] leading-snug line-clamp-1"
                      title={prod.name}
                    >
                      {prod.name}
                    </h3>
                    <p
                      className="text-[11px] font-mono text-[#88847D] truncate"
                      title={prod.sku}
                    >
                      <span>SKU: </span>
                      <span data-testid="card-product-sku">{prod.sku}</span>
                    </p>
                    <div className="flex items-baseline justify-between gap-3 pt-1">
                      <span className="text-sm font-semibold text-[#292824] tabular-nums">
                        {currencySymbol}
                        {prod.sell_price}
                      </span>
                      <span
                        className={`text-xs ${
                          isOut || isLow
                            ? "text-[#795438] font-medium"
                            : "text-[#88847D]"
                        }`}
                      >
                        {isOut
                          ? "Out of stock"
                          : isLow
                            ? `${prod.stock_qty} in stock · Low`
                            : `${prod.stock_qty} in stock`}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="pt-2.5 border-t border-[#E8E3DA]/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          aria-label={`Edit ${prod.name}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#DDD6CA] bg-[#F8F6F2] text-xs font-medium text-[#795438] hover:bg-[#795438] hover:text-white hover:border-[#795438] transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(prod)}
                          aria-label={`Delete ${prod.name}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[#88847D] hover:text-[#795438] hover:bg-[#F8F6F2] transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>

                      <div
                        className="relative shrink-0"
                        data-card-action-menu="true"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenCardMenuId((prev) =>
                              prev === prod.id ? null : prod.id,
                            )
                          }
                          aria-label={`Product actions for ${prod.name}`}
                          aria-haspopup="menu"
                          aria-expanded={openCardMenuId === prod.id}
                          className="p-1.5 rounded-md text-[#88847D] hover:text-[#292824] hover:bg-[#F3EDE6] focus:outline-none focus:ring-1 focus:ring-[#795438]"
                          title="More actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openCardMenuId === prod.id && (
                          <div
                            role="menu"
                            aria-label={`${prod.name} actions`}
                            className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg border border-[#E8E3DA] shadow-[0_8px_24px_rgba(41,40,36,0.08)] py-1 z-30 text-xs text-[#292824]"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                openEditModal(prod);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#F8F6F2] flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-[#88847D]" />
                              <span>Edit Product</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                openAdjustmentModal(prod);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#F8F6F2] flex items-center gap-2"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 text-[#88847D]" />
                              <span>Adjust Stock</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                openImageModal(prod);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#F8F6F2] flex items-center gap-2"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-[#88847D]" />
                              <span>Manage Product Image</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                setDetailProduct(prod);
                                setDetailTab("details");
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#F8F6F2] flex items-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#88847D]" />
                              <span>View Details</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                toggleActiveMutation.mutate(prod.id);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#F8F6F2] flex items-center gap-2"
                            >
                              {prod.is_active ? (
                                <Ban className="w-3.5 h-3.5 text-[#88847D]" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5 text-[#795438]" />
                              )}
                              <span>
                                {prod.is_active
                                  ? "Deactivate Product"
                                  : "Activate Product"}
                              </span>
                            </button>
                            <div className="my-1 border-t border-[#E8E3DA]" />
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                setDeletingProduct(prod);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#F8F6F2] text-[#795438] font-medium flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Product</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[10px] border border-[#E8E3DA] overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#292824]">
              <thead className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product Name &amp; Style</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Supplier</th>
                  {canManage && (
                    <th className="py-3 px-4 text-right">Cost Price</th>
                  )}
                  {canManage && (
                    <th className="py-3 px-4 text-right">Avg Cost</th>
                  )}
                  <th className="py-3 px-4 text-right">Sell Price</th>
                  <th className="py-3 px-4 text-center">Stock Level</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3DA]">
                {products.map((prod) => {
                  const isLow = prod.is_low_stock;
                  const parentCatName =
                    prod.parent_category?.name || prod.category?.parent?.name;
                  const subCatName = prod.category?.name;
                  const attrSummary = [
                    prod.color,
                    prod.size,
                    prod.material,
                    prod.style,
                  ].filter(Boolean);
                  const variantCount = prod.variants?.length ?? 0;

                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-[#F8F6F2]/70 transition-colors ${
                        isLow ? "bg-[#F8F6F2]/60" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#292824]">
                        {prod.sku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => canManage && openImageModal(prod)}
                            disabled={!canManage}
                            className={`relative w-10 h-12 rounded-md border border-[#E8E3DA] bg-[#F8F6F2] flex items-center justify-center overflow-hidden shrink-0 group ${
                              canManage
                                ? "cursor-pointer hover:border-[#795438] hover:ring-1 hover:ring-[#795438]"
                                : "cursor-default"
                            }`}
                            title={
                              canManage
                                ? "Click to manage product image"
                                : prod.name
                            }
                            aria-label={
                              canManage
                                ? `Manage image for ${prod.name}`
                                : prod.name
                            }
                          >
                            {prod.thumb_url || prod.image_url ? (
                              <img
                                src={prod.thumb_url || prod.image_url || ""}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-[#C8C1B6] stroke-[1.25]" />
                            )}
                            {canManage && (
                              <div className="absolute inset-0 bg-[#292824]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ImageIcon className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-medium text-[#292824] max-w-xs truncate"
                                title={prod.name}
                              >
                                {prod.name}
                              </span>
                              {Boolean(
                                prod.has_variants && variantCount > 0,
                              ) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F3EDE6] text-[#795438] font-semibold text-[10px] border border-[#E2D9CE] shrink-0">
                                  <Layers className="w-2.5 h-2.5" />
                                  {variantCount} variants
                                </span>
                              )}
                            </div>
                            {attrSummary.length > 0 && (
                              <div className="text-[11px] text-[#88847D] mt-0.5 truncate max-w-xs">
                                {attrSummary.join(" · ")}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#88847D]">
                        {parentCatName && subCatName ? (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-[#A58B6F] font-semibold">
                              {parentCatName}
                            </div>
                            <div className="font-medium text-[#292824]">
                              {subCatName}
                            </div>
                          </div>
                        ) : (
                          <span>{subCatName || "—"}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#88847D]">
                        {prod.supplier?.name || "—"}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right font-mono text-[#88847D]">
                          {currencySymbol}
                          {prod.cost_price ?? "—"}
                        </td>
                      )}
                      {canManage && (
                        <td className="py-3 px-4 text-right font-mono text-[#88847D]">
                          {currencySymbol}
                          {prod.avg_cost ?? prod.cost_price ?? "—"}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#292824]">
                        {currencySymbol}
                        {prod.sell_price}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <Badge variant="warning" size="sm">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>
                              {prod.stock_qty} (Min: {prod.reorder_level})
                            </span>
                          </Badge>
                        ) : (
                          <span className="font-semibold text-[#292824] font-mono">
                            {prod.stock_qty}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={prod.is_active ? "neutral" : "outline"}
                          size="sm"
                          className={
                            prod.is_active ? "font-semibold" : "text-[#88847D]"
                          }
                        >
                          {prod.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setDetailProduct(prod);
                              setDetailTab("details");
                            }}
                            className="p-1.5 text-[#88847D] hover:text-[#292824] rounded hover:bg-[#F3EDE6] transition-colors"
                            title={
                              canManage
                                ? "View Details & Stock History"
                                : "View Details"
                            }
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => openImageModal(prod)}
                                className="p-1.5 text-[#88847D] hover:text-[#795438] rounded hover:bg-[#F3EDE6] transition-colors"
                                title="Manage Product Image"
                                aria-label="Manage Product Image"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openAdjustmentModal(prod)}
                                className="p-1.5 text-[#88847D] hover:text-[#292824] rounded hover:bg-[#F3EDE6] transition-colors"
                                title="Stock Adjustment"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  toggleActiveMutation.mutate(prod.id)
                                }
                                className="p-1.5 text-[#88847D] hover:text-[#795438] rounded hover:bg-[#F3EDE6] transition-colors"
                                title={
                                  prod.is_active
                                    ? "Deactivate Product"
                                    : "Activate Product"
                                }
                                aria-label={
                                  prod.is_active
                                    ? `Deactivate ${prod.name}`
                                    : `Activate ${prod.name}`
                                }
                              >
                                {prod.is_active ? (
                                  <Ban className="w-3.5 h-3.5" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5 text-[#795438]" />
                                )}
                              </button>
                              <button
                                onClick={() => openEditModal(prod)}
                                className="p-1.5 text-[#88847D] hover:text-[#292824] rounded hover:bg-[#F3EDE6] transition-colors"
                                title="Edit Product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingProduct(prod)}
                                className="p-1.5 text-[#88847D] hover:text-[#292824] rounded hover:bg-[#F3EDE6] transition-colors"
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
        </div>
      )}

      {/* Pagination & Page Size Footer (works for both Grid & List view) */}
      {meta && meta.total > 0 && (
        <div className="bg-white rounded-[10px] border border-[#E8E3DA] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#88847D]">
          <div className="flex flex-wrap items-center gap-3">
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
              products
            </div>
            <label className="inline-flex items-center gap-1.5">
              <span>Show</span>
              <select
                aria-label="Products per page"
                value={filters.per_page || 12}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    per_page: Number(e.target.value),
                    page: 1,
                  }))
                }
                className="px-2 py-1 text-xs bg-[#F8F6F2] border border-[#E8E3DA] rounded-md text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438]"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={100}>All (100)</option>
              </select>
            </label>
          </div>

          {meta.last_page > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={meta.current_page <= 1}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: (prev.page || 1) - 1,
                  }))
                }
                className="p-1.5 rounded border border-[#E8E3DA] bg-white text-[#292824] hover:bg-[#F8F6F2] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: meta.last_page }, (_, idx) => idx + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === meta.last_page ||
                    Math.abs(p - meta.current_page) <= 1,
                )
                .map((p, index, visiblePages) => {
                  const showEllipsis =
                    index > 0 && visiblePages[index - 1] !== p - 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && (
                        <span className="px-1 text-[#88847D]">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, page: p }))
                        }
                        aria-label={`Page ${p}`}
                        aria-current={
                          p === meta.current_page ? "page" : undefined
                        }
                        className={`min-w-[28px] h-7 px-2 rounded border text-xs font-medium transition-colors ${
                          p === meta.current_page
                            ? "bg-[#795438] text-white border-[#795438]"
                            : "bg-white text-[#292824] border-[#E8E3DA] hover:bg-[#F8F6F2]"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: (prev.page || 1) + 1,
                  }))
                }
                className="p-1.5 rounded border border-[#E8E3DA] bg-white text-[#292824] hover:bg-[#F8F6F2] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        title={editingProduct ? "Edit Product" : "Add New Product"}
        description="Configure interior decor item details, supplier, pricing, flexible attributes, and variations."
        maxWidth="2xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeFormModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit(onFormSubmit)}
              isLoading={saveMutation.isPending}
            >
              {editingProduct ? "Update Product" : "Create Product"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {/* Product Image Upload / Preview Section at Top */}
          <div
            data-testid="product-form-image-section"
            className="p-3.5 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA] space-y-2"
          >
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#292824]">
                Product Image
              </label>
              {editingProduct &&
                removeExistingImage &&
                !selectedImageFile &&
                Boolean(
                  editingProduct.image_url || editingProduct.thumb_url,
                ) && (
                  <button
                    type="button"
                    onClick={() => setRemoveExistingImage(false)}
                    className="text-xs font-medium text-[#795438] hover:underline"
                  >
                    Keep existing image
                  </button>
                )}
            </div>
            <ImageUploader
              key={
                editingProduct
                  ? `form-img-edit-${editingProduct.id}`
                  : "form-img-create"
              }
              currentImageUrl={
                removeExistingImage
                  ? null
                  : editingProduct?.image_url || editingProduct?.thumb_url
              }
              onFileSelect={(file) => {
                setSelectedImageFile(file);
                if (file) {
                  setRemoveExistingImage(false);
                }
              }}
              onRemoveExisting={() => {
                setSelectedImageFile(null);
                setRemoveExistingImage(true);
              }}
            />
            {editingProduct &&
              removeExistingImage &&
              !selectedImageFile &&
              Boolean(editingProduct.image_url || editingProduct.thumb_url) && (
                <p className="text-[11px] text-[#795438]">
                  Existing image will be removed when you save changes.
                </p>
              )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              placeholder="e.g. Modern LED Table Lamp"
              required
              error={errors.name?.message}
              {...register("name")}
            />

            <Input
              label="SKU / Barcode"
              placeholder="e.g. LMP-MOD-TBL"
              required
              error={errors.sku?.message}
              {...register("sku")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {parentCategories.length > 0 && (
              <div>
                <label
                  htmlFor="modal-parent-category"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#292824] mb-1.5"
                >
                  Parent Category
                </label>
                <select
                  id="modal-parent-category"
                  aria-label="Parent Category"
                  value={modalParentCategoryFilter}
                  onChange={(e) =>
                    handleModalParentCategoryChange(e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm bg-white text-[#292824] border border-[#DDD6CA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438]"
                >
                  <option value="">All Categories</option>
                  {parentCategories.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={parentCategories.length > 0 ? "" : "sm:col-span-2"}>
              <Select
                label="Category / Subcategory"
                placeholder="Select Category / Subcategory"
                required
                options={categoryOptions}
                error={errors.category_id?.message}
                {...register("category_id", {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const selectedId = Number(e.target.value);
                    if (!selectedId) return;
                    const picked = allCategories.find(
                      (c) => c.id === selectedId,
                    );
                    if (picked?.parent_id) {
                      setModalParentCategoryFilter(String(picked.parent_id));
                    } else if (picked && !picked.parent_id) {
                      setModalParentCategoryFilter(String(picked.id));
                    }
                  },
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Supplier"
              placeholder="Select Supplier (Optional)"
              options={supplierOptions}
              error={errors.supplier_id?.message}
              {...register("supplier_id")}
            />

            <Input
              label="Reorder Alert Level"
              type="number"
              min="0"
              placeholder="10"
              helperText="Alerts when stock drops at or below this amount."
              error={errors.reorder_level?.message}
              {...register("reorder_level", { valueAsNumber: true })}
            />
          </div>

          <div>
            <label
              htmlFor="product-description"
              className="block text-xs font-semibold uppercase tracking-wider text-[#292824] mb-1.5"
            >
              Description
            </label>
            <textarea
              id="product-description"
              rows={3}
              placeholder="Dimensions, finish details, room styling notes..."
              className="w-full px-3 py-2 text-sm bg-white text-[#292824] border border-[#DDD6CA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438]"
              {...register("description")}
            />
            {errors.description?.message && (
              <p className="mt-1 text-xs text-[#292824] font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={`Cost Price (${currencySymbol})`}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              error={errors.cost_price?.message}
              {...register("cost_price", { valueAsNumber: true })}
            />

            <Input
              label={`Retail Sell Price (${currencySymbol})`}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              error={errors.sell_price?.message}
              {...register("sell_price", { valueAsNumber: true })}
            />

            <Input
              label={editingProduct ? "Stock Quantity" : "Initial Stock Qty"}
              type="number"
              min="0"
              placeholder="0"
              disabled={hasVariantsToggle}
              helperText={
                hasVariantsToggle
                  ? "Auto-calculated from active variations below."
                  : editingProduct
                    ? "Changes record a stock ledger adjustment."
                    : undefined
              }
              error={errors.stock_qty?.message}
              {...register("stock_qty", { valueAsNumber: true })}
            />
          </div>

          {/* Flexible Interior Decor Attributes */}
          <div className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#292824]">
                Decor Attributes (Optional)
              </span>
              <span className="text-[11px] text-[#88847D]">
                Leave blank where not applicable
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Color"
                placeholder="e.g. Warm Brass"
                list="decor-color-list"
                {...register("color")}
              />
              <Input
                label="Size"
                placeholder="e.g. Medium"
                list="decor-size-list"
                {...register("size")}
              />
              <Input
                label="Material"
                placeholder="e.g. Ceramic"
                list="decor-material-list"
                {...register("material")}
              />
              <Input
                label="Style"
                placeholder="e.g. Nordic"
                list="decor-style-list"
                {...register("style")}
              />
            </div>

            <datalist id="decor-color-list">
              {DECOR_COLOR_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="decor-size-list">
              {DECOR_SIZE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <datalist id="decor-material-list">
              {DECOR_MATERIAL_SUGGESTIONS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <datalist id="decor-style-list">
              {DECOR_STYLE_SUGGESTIONS.map((st) => (
                <option key={st} value={st} />
              ))}
            </datalist>
          </div>

          {/* Product Variations Toggle & Builder */}
          <div className="p-3 bg-white rounded-lg border border-[#E8E3DA] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasVariantsToggle}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasVariantsToggle(checked);
                    if (checked && variantRows.length === 0) {
                      handleAddVariantRow();
                    }
                  }}
                  className="rounded border-[#DDD6CA] text-[#795438] focus:ring-[#795438]"
                />
                <span className="text-xs font-semibold text-[#292824]">
                  Enable product variations (multiple colors, sizes, or
                  finishes)
                </span>
              </label>

              {hasVariantsToggle && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddVariantRow}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Variation
                </Button>
              )}
            </div>

            {hasVariantsToggle && (
              <div className="space-y-2.5 pt-1">
                {variantRows.length === 0 ? (
                  <p className="text-xs text-[#88847D]">
                    Click &quot;Add Variation&quot; to define specific variants.
                  </p>
                ) : (
                  variantRows.map((row, idx) => (
                    <div
                      key={row.id || `draft-${idx}`}
                      className="p-2.5 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#292824]">
                          Variation #{idx + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1.5 text-[11px] text-[#88847D] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.is_active}
                              onChange={(e) =>
                                handleUpdateVariantRow(
                                  idx,
                                  "is_active",
                                  e.target.checked,
                                )
                              }
                              className="rounded border-[#DDD6CA] text-[#795438]"
                            />
                            Active
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantRow(idx)}
                            className="text-[#88847D] hover:text-[#292824] p-0.5"
                            title="Remove variation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Variant SKU *"
                          value={row.sku}
                          onChange={(e) =>
                            handleUpdateVariantRow(idx, "sku", e.target.value)
                          }
                          className="px-2 py-1.5 bg-white border border-[#DDD6CA] rounded font-mono text-xs text-[#292824]"
                        />
                        <input
                          type="text"
                          placeholder="Display Label (Opt.)"
                          value={row.name}
                          onChange={(e) =>
                            handleUpdateVariantRow(idx, "name", e.target.value)
                          }
                          className="px-2 py-1.5 bg-white border border-[#DDD6CA] rounded text-xs text-[#292824]"
                        />
                        <input
                          type="text"
                          placeholder="Color"
                          list="decor-color-list"
                          value={row.color}
                          onChange={(e) =>
                            handleUpdateVariantRow(idx, "color", e.target.value)
                          }
                          className="px-2 py-1.5 bg-white border border-[#DDD6CA] rounded text-xs text-[#292824]"
                        />
                        <input
                          type="text"
                          placeholder="Size"
                          list="decor-size-list"
                          value={row.size}
                          onChange={(e) =>
                            handleUpdateVariantRow(idx, "size", e.target.value)
                          }
                          className="px-2 py-1.5 bg-white border border-[#DDD6CA] rounded text-xs text-[#292824]"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <input
                          type="text"
                          placeholder="Material"
                          list="decor-material-list"
                          value={row.material}
                          onChange={(e) =>
                            handleUpdateVariantRow(
                              idx,
                              "material",
                              e.target.value,
                            )
                          }
                          className="px-2 py-1.5 bg-white border border-[#DDD6CA] rounded text-xs text-[#292824]"
                        />
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={`Cost (${currencySymbol})`}
                            title="Variant Cost Price"
                            value={row.cost_price}
                            onChange={(e) =>
                              handleUpdateVariantRow(
                                idx,
                                "cost_price",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-[#DDD6CA] rounded font-mono text-xs text-[#292824]"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={`Sell (${currencySymbol})`}
                            title="Variant Sell Price"
                            value={row.sell_price}
                            onChange={(e) =>
                              handleUpdateVariantRow(
                                idx,
                                "sell_price",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-[#DDD6CA] rounded font-mono text-xs text-[#292824]"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Stock"
                            title="Variant Stock Quantity"
                            value={row.stock_qty}
                            onChange={(e) =>
                              handleUpdateVariantRow(
                                idx,
                                "stock_qty",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-[#DDD6CA] rounded font-mono text-xs text-[#292824]"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Min Stock"
                            title="Variant Reorder Level"
                            value={row.reorder_level}
                            onChange={(e) =>
                              handleUpdateVariantRow(
                                idx,
                                "reorder_level",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-[#DDD6CA] rounded font-mono text-xs text-[#292824]"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active"
              className="rounded border-[#DDD6CA] text-[#795438] focus:ring-[#795438]"
              {...register("is_active")}
            />
            <label
              htmlFor="is_active"
              className="text-xs font-semibold text-[#292824]"
            >
              Active in POS and Sales catalog
            </label>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={Boolean(adjustingProduct)}
        onClose={() => {
          setAdjustingProduct(null);
          setAdjustVariantId(null);
        }}
        title="Manual Stock Adjustment"
        description="Write an immutable audit movement to correct stock quantities."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdjustingProduct(null);
                setAdjustVariantId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdjustmentSubmit}
              disabled={
                adjustmentDelta === 0 ||
                isProjectedNegative ||
                !adjustmentReason.trim()
              }
              isLoading={adjustmentMutation.isPending}
            >
              Apply Adjustment
            </Button>
          </>
        }
      >
        {adjustingProduct && (
          <form
            onSubmit={handleAdjustmentSubmit}
            className="space-y-4 text-xs text-[#292824]"
          >
            {/* Product Summary Box */}
            <div className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA]">
              <div className="font-semibold text-[#292824] text-sm">
                {adjustingProduct.name}
              </div>
              <div className="font-mono text-[#88847D] mt-0.5">
                SKU:{" "}
                {selectedAdjustmentVariant
                  ? selectedAdjustmentVariant.sku
                  : adjustingProduct.sku}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-[#E8E3DA] text-[#88847D]">
                <div>
                  Current Stock:{" "}
                  <span className="font-mono font-bold text-[#292824]">
                    {currentStock}
                  </span>
                </div>
                <div>
                  Reorder Level:{" "}
                  <span className="font-mono font-medium text-[#292824]">
                    {activeReorderLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Target Variant Selector (if product has variants) */}
            {adjustingProduct.variants &&
              adjustingProduct.variants.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#292824] mb-1.5">
                    Target Variation <span className="text-[#795438]">*</span>
                  </label>
                  <select
                    value={adjustVariantId ?? ""}
                    onChange={(e) =>
                      setAdjustVariantId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="w-full px-3 py-2 text-xs bg-white text-[#292824] border border-[#DDD6CA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#795438]"
                  >
                    {adjustingProduct.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label || v.name || v.sku} — Stock: {v.stock_qty} (
                        {v.sku})
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* Delta Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#292824] mb-1.5">
                Adjustment Quantity Change (Delta){" "}
                <span className="text-[#795438]">*</span>
              </label>
              <input
                type="number"
                step="1"
                value={adjustmentDelta === 0 ? "" : adjustmentDelta}
                onChange={(e) =>
                  setAdjustmentDelta(
                    e.target.value === ""
                      ? 0
                      : parseInt(e.target.value, 10) || 0,
                  )
                }
                placeholder="e.g. +5 or -3"
                className="w-full px-3 py-2 text-sm bg-white text-[#292824] border border-[#DDD6CA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#795438] font-mono"
                required
              />
              <p className="text-[11px] text-[#88847D] mt-1">
                Enter a positive integer to increment stock, or a negative
                integer to write off inventory.
              </p>
            </div>

            {/* Projected Stock Preview */}
            <div className="p-3 bg-white rounded-lg border border-[#E8E3DA] flex items-center justify-between">
              <div>
                <span className="text-[#88847D] block text-[11px]">
                  Resulting Stock Quantity
                </span>
                <span className="font-bold text-base text-[#292824] font-mono">
                  {projectedStock} units
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#88847D] block text-[11px]">
                  Net Change
                </span>
                <span className="font-mono font-semibold text-[#292824]">
                  {adjustmentDelta > 0
                    ? `+${adjustmentDelta}`
                    : adjustmentDelta}
                </span>
              </div>
            </div>

            {/* Warning or Error messages */}
            {isProjectedNegative && (
              <div className="p-2.5 bg-[#F8F6F2] border border-[#DDD6CA] rounded-lg text-[#292824] font-medium text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#795438]" />
                <span>
                  Cannot adjust stock below 0. Maximum reduction is -
                  {currentStock}.
                </span>
              </div>
            )}

            {!isProjectedNegative && isProjectedLow && (
              <div className="p-2.5 bg-[#FEF3C7] border border-amber-300 rounded-lg text-amber-900 font-medium text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#F59E0B]" />
                <span>
                  Warning: Resulting stock ({projectedStock}) will reach or fall
                  below reorder alert level ({activeReorderLevel}).
                </span>
              </div>
            )}

            {/* Adjustment Reason */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#292824] mb-1.5">
                Adjustment Reason <span className="text-[#795438]">*</span>
              </label>
              <textarea
                rows={3}
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Explain the reason for this inventory correction (e.g. annual cycle count discrepancy, broken display unit, damaged ceramic shipment)..."
                className="w-full px-3 py-2 text-xs bg-white text-[#292824] border border-[#DDD6CA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#795438]"
                required
              />
            </div>

            {adjustmentError && (
              <div className="p-2 bg-[#F8F6F2] border border-[#DDD6CA] rounded text-[#292824] text-xs">
                {adjustmentError}
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Product Detail & Stock History Modal */}
      <Modal
        isOpen={Boolean(detailProduct)}
        onClose={() => setDetailProduct(null)}
        title={detailProduct?.name || "Product Details"}
        description={`SKU: ${detailProduct?.sku || ""} • ${
          detailProduct?.parent_category?.name ||
          detailProduct?.category?.parent?.name
            ? `${
                detailProduct?.parent_category?.name ||
                detailProduct?.category?.parent?.name
              } > `
            : ""
        }${detailProduct?.category?.name || "Uncategorized"}`}
        maxWidth="2xl"
        footer={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            {canManage && detailProduct ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = detailProduct;
                    setDetailProduct(null);
                    openEditModal(target);
                  }}
                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = detailProduct;
                    setDetailProduct(null);
                    openAdjustmentModal(target);
                  }}
                  leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                >
                  Adjust Stock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = detailProduct;
                    setDetailProduct(null);
                    setDeletingProduct(target);
                  }}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete
                </Button>
              </div>
            ) : (
              <span />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailProduct(null)}
            >
              Close
            </Button>
          </div>
        }
      >
        {detailProduct && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-[#E8E3DA]">
              <button
                onClick={() => setDetailTab("details")}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  detailTab === "details"
                    ? "border-[#795438] text-[#795438]"
                    : "border-transparent text-[#88847D] hover:text-[#292824]"
                }`}
              >
                Overview &amp; Specifications
              </button>
              {canManage && (
                <button
                  onClick={() => setDetailTab("history")}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    detailTab === "history"
                      ? "border-[#795438] text-[#795438]"
                      : "border-transparent text-[#88847D] hover:text-[#292824]"
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Stock History</span>
                </button>
              )}
            </div>

            {/* Tab 1: Details */}
            {detailTab === "details" && (
              <div className="space-y-4 text-xs text-[#292824]">
                {/* Product Image & Basic Info Card */}
                <div className="flex flex-col sm:flex-row gap-4 p-3.5 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA] items-center sm:items-start">
                  <div className="w-24 h-28 rounded-lg border border-[#E8E3DA] bg-[#F8F7F4] flex items-center justify-center overflow-hidden shrink-0">
                    {detailProduct.image_url || detailProduct.thumb_url ? (
                      <img
                        src={
                          detailProduct.image_url ||
                          detailProduct.thumb_url ||
                          ""
                        }
                        alt={detailProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-[#C5BCB0] stroke-[1.5]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4
                          className="text-sm font-bold text-[#292824] truncate"
                          title={detailProduct.name}
                        >
                          {detailProduct.name}
                        </h4>
                        <p className="text-xs font-mono text-[#88847D] mt-0.5">
                          SKU: {detailProduct.sku}
                        </p>
                      </div>
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const target = detailProduct;
                            setDetailProduct(null);
                            openImageModal(target);
                          }}
                          leftIcon={<ImageIcon className="w-3.5 h-3.5" />}
                        >
                          {detailProduct.image_url || detailProduct.thumb_url
                            ? "Change Image"
                            : "Upload Image"}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-[#88847D] mt-2 line-clamp-2">
                      {detailProduct.description || "No description provided."}
                    </p>
                    {(detailProduct.supplier?.name ||
                      detailProduct.color ||
                      detailProduct.size ||
                      detailProduct.material ||
                      detailProduct.style) && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 justify-center sm:justify-start">
                        {detailProduct.supplier?.name && (
                          <span className="px-2 py-0.5 bg-white border border-[#E8E3DA] rounded text-[11px] font-medium text-[#292824]">
                            Supplier: {detailProduct.supplier.name}
                          </span>
                        )}
                        {detailProduct.color && (
                          <span className="px-2 py-0.5 bg-white border border-[#E8E3DA] rounded text-[11px] text-[#88847D]">
                            Color: {detailProduct.color}
                          </span>
                        )}
                        {detailProduct.size && (
                          <span className="px-2 py-0.5 bg-white border border-[#E8E3DA] rounded text-[11px] text-[#88847D]">
                            Size: {detailProduct.size}
                          </span>
                        )}
                        {detailProduct.material && (
                          <span className="px-2 py-0.5 bg-white border border-[#E8E3DA] rounded text-[11px] text-[#88847D]">
                            Material: {detailProduct.material}
                          </span>
                        )}
                        {detailProduct.style && (
                          <span className="px-2 py-0.5 bg-white border border-[#E8E3DA] rounded text-[11px] text-[#88847D]">
                            Style: {detailProduct.style}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA]">
                    <span className="text-[11px] text-[#88847D] block">
                      Retail Sell Price
                    </span>
                    <span className="text-base font-bold text-[#292824] font-mono">
                      {currencySymbol}
                      {detailProduct.sell_price}
                    </span>
                  </div>
                  {canManage && (
                    <>
                      <div className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA]">
                        <span className="text-[11px] text-[#88847D] block">
                          Cost Price
                        </span>
                        <span className="text-base font-bold text-[#292824] font-mono">
                          {currencySymbol}
                          {detailProduct.cost_price ?? "—"}
                        </span>
                      </div>
                      <div className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA]">
                        <span className="text-[11px] text-[#88847D] block">
                          Average Unit Cost
                        </span>
                        <span className="text-base font-bold text-[#292824] font-mono">
                          {currencySymbol}
                          {detailProduct.avg_cost ??
                            detailProduct.cost_price ??
                            "—"}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA]">
                    <span className="text-[11px] text-[#88847D] block">
                      Current Stock
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-bold text-[#292824] font-mono">
                        {detailProduct.stock_qty}
                      </span>
                      {detailProduct.is_low_stock && (
                        <Badge variant="warning" size="sm">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA]">
                    <span className="text-[11px] text-[#88847D] block">
                      Reorder Alert Level
                    </span>
                    <span className="text-base font-bold text-[#292824] font-mono">
                      {detailProduct.reorder_level} units
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA]">
                    <span className="text-[11px] text-[#88847D] block">
                      Catalog Status
                    </span>
                    <span className="text-xs font-semibold text-[#292824] mt-1 block">
                      {detailProduct.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Variants Breakdown Table */}
                {detailProduct.variants &&
                  detailProduct.variants.length > 0 && (
                    <div className="border border-[#E8E3DA] rounded-lg overflow-hidden">
                      <div className="bg-[#F8F6F2] px-3 py-2 border-b border-[#E8E3DA] font-semibold text-[#292824] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#795438]" />
                        <span>
                          Product Variations ({detailProduct.variants.length})
                        </span>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF8F4] border-b border-[#E8E3DA] text-[11px] text-[#88847D] uppercase">
                          <tr>
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3">Variation</th>
                            {canManage && (
                              <th className="py-2 px-3 text-right">Cost</th>
                            )}
                            <th className="py-2 px-3 text-right">Price</th>
                            <th className="py-2 px-3 text-center">Stock</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E3DA]">
                          {detailProduct.variants.map((v) => (
                            <tr key={v.id || v.sku}>
                              <td className="py-2 px-3 font-mono text-[#292824]">
                                {v.sku}
                              </td>
                              <td className="py-2 px-3 text-[#292824] font-medium">
                                {v.label ||
                                  v.name ||
                                  [v.color, v.size, v.material, v.style]
                                    .filter(Boolean)
                                    .join(" / ") ||
                                  v.sku}
                              </td>
                              {canManage && (
                                <td className="py-2 px-3 text-right font-mono text-[#88847D]">
                                  {currencySymbol}
                                  {v.cost_price ?? "—"}
                                </td>
                              )}
                              <td className="py-2 px-3 text-right font-mono font-semibold text-[#292824]">
                                {currencySymbol}
                                {v.sell_price}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-[#292824]">
                                {v.stock_qty}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <Badge
                                  variant={v.is_active ? "neutral" : "outline"}
                                  size="sm"
                                >
                                  {v.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {detailProduct.description && (
                  <div>
                    <span className="font-semibold text-[#292824] block mb-1">
                      Description
                    </span>
                    <p className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA] text-[#292824] leading-relaxed">
                      {detailProduct.description}
                    </p>
                  </div>
                )}

                <div className="border-t border-[#E8E3DA] pt-3 flex flex-wrap gap-4 text-[11px] text-[#88847D]">
                  <div>
                    Created:{" "}
                    {new Date(detailProduct.created_at).toLocaleDateString()}
                  </div>
                  {detailProduct.low_stock_notified_at && (
                    <div className="text-amber-800 font-medium">
                      Low-Stock Notified:{" "}
                      {new Date(
                        detailProduct.low_stock_notified_at,
                      ).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Stock History */}
            {canManage && detailTab === "history" && (
              <div className="space-y-3">
                {isDetailMovementsLoading ? (
                  <TableSkeleton rows={4} columns={5} />
                ) : !detailMovementsData?.data ||
                  detailMovementsData.data.length === 0 ? (
                  <div className="p-6 text-center bg-[#F8F6F2] rounded-lg border border-[#E8E3DA] text-xs text-[#88847D]">
                    No stock movements recorded for this product yet.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto border border-[#E8E3DA] rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F4] sticky top-0 border-b border-[#E8E3DA] text-[#88847D] font-semibold text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3 text-right">Change</th>
                          {canManage && (
                            <th className="py-2 px-3 text-right">Unit Cost</th>
                          )}
                          <th className="py-2 px-3">Reference / Reason</th>
                          <th className="py-2 px-3">User</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E3DA]">
                        {detailMovementsData.data.map((m: StockMovement) => {
                          const isPositive = m.qty_change > 0;
                          return (
                            <tr key={m.id} className="hover:bg-[#FAF8F4]">
                              <td className="py-2 px-3 font-mono text-[11px] text-[#88847D] whitespace-nowrap">
                                {new Date(m.created_at).toLocaleDateString()}{" "}
                                {new Date(m.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-2 px-3 uppercase text-[10px] font-semibold tracking-wider text-[#292824]">
                                <div>{m.type}</div>
                                {m.variant_label && (
                                  <div className="text-[10px] font-normal normal-case text-[#795438]">
                                    {m.variant_label}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-[#292824] whitespace-nowrap">
                                <span className="inline-flex items-center gap-0.5 justify-end">
                                  {isPositive ? (
                                    <ArrowUpRight className="w-3.5 h-3.5 text-[#795438]" />
                                  ) : (
                                    <ArrowDownRight className="w-3.5 h-3.5 text-[#88847D]" />
                                  )}
                                  <span>
                                    {isPositive
                                      ? `+${m.qty_change}`
                                      : m.qty_change}
                                  </span>
                                </span>
                              </td>
                              {canManage && (
                                <td className="py-2 px-3 text-right font-mono text-[#88847D]">
                                  {currencySymbol}
                                  {m.unit_cost}
                                </td>
                              )}
                              <td className="py-2 px-3 text-[#292824] max-w-xs truncate">
                                {m.reason ? (
                                  <span>{m.reason}</span>
                                ) : m.reference_label ? (
                                  <span className="font-mono">
                                    {m.reference_label}
                                  </span>
                                ) : m.reference_type ? (
                                  <span className="font-mono">
                                    {m.reference_type} #{m.reference_id}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="py-2 px-3 text-[#88847D] whitespace-nowrap">
                                {m.user?.name || "System"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Products via CSV"
        description="Upload a CSV spreadsheet to bulk import or update home decor products."
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(false)}
            >
              Done
            </Button>
            {!importResult && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportSubmit}
                disabled={!importFile}
                isLoading={importMutation.isPending}
                leftIcon={<UploadCloud className="w-4 h-4" />}
              >
                Upload &amp; Process
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA]">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#795438]" />
              <div className="text-xs">
                <span className="font-semibold text-[#292824] block">
                  CSV File Template
                </span>
                <span className="text-[#88847D]">
                  Includes decor catalog headers and sample interior products
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Template
            </Button>
          </div>

          {!importResult ? (
            <div className="border-2 border-dashed border-[#DDD6CA] rounded-lg p-6 text-center bg-[#FAF8F4] hover:bg-[#F3EDE6]/40 transition-colors">
              <input
                type="file"
                accept=".csv,text/csv"
                id="csv_file_input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setImportFile(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="csv_file_input"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <UploadCloud className="w-10 h-10 text-[#A58B6F] mb-2" />
                <span className="text-xs font-semibold text-[#292824]">
                  {importFile
                    ? importFile.name
                    : "Click to select CSV file from your computer"}
                </span>
                <span className="text-[11px] text-[#88847D] mt-1">
                  Required columns: sku, name, category, cost_price, sell_price
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA] text-xs">
                <div className="font-bold text-[#292824] mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#795438]" />
                  <span>Import Results</span>
                </div>
                <div className="text-[#292824]">
                  Successfully imported:{" "}
                  <span className="font-bold">
                    {importResult.imported_count}
                  </span>{" "}
                  products
                </div>
                {Boolean(
                  importResult.error_count && importResult.error_count > 0,
                ) && (
                  <div className="text-amber-900 font-semibold mt-0.5">
                    Warnings / Errors: {importResult.error_count} rows skipped
                  </div>
                )}
              </div>

              {Boolean(
                importResult.errors && importResult.errors.length > 0,
              ) && (
                <div className="max-h-48 overflow-y-auto border border-[#E8E3DA] rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F4] border-b border-[#E8E3DA] text-[#88847D] font-semibold">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E3DA]">
                      {importResult.errors?.map((err: any, idx: number) => (
                        <tr key={idx} className="bg-white">
                          <td className="py-1.5 px-3 font-mono text-[#292824]">
                            {err.row}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-[#88847D]">
                            {err.sku || "—"}
                          </td>
                          <td className="py-1.5 px-3 text-[#292824] font-medium">
                            {err.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Manage Product Image Modal */}
      <Modal
        isOpen={Boolean(imageModalProduct)}
        onClose={closeImageModal}
        title="Product Image"
        description={
          imageModalProduct
            ? `Upload or change the catalog photo for ${imageModalProduct.name}`
            : "Product Image"
        }
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeImageModal}>
              Cancel
            </Button>
            {imageModalProduct &&
              Boolean(
                imageModalProduct.image_url || imageModalProduct.thumb_url,
              ) &&
              !modalImageFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    deleteImageMutation.mutate(imageModalProduct.id)
                  }
                  isLoading={deleteImageMutation.isPending}
                  className="text-[#795438] hover:text-[#292824] border-[#DDD6CA] hover:bg-[#F8F6F2]"
                >
                  Delete Image
                </Button>
              )}
            <Button
              variant="primary"
              size="sm"
              disabled={!modalImageFile && !modalRemoveExisting}
              isLoading={
                uploadImageMutation.isPending || deleteImageMutation.isPending
              }
              onClick={() => {
                if (!imageModalProduct) return;
                if (modalImageFile) {
                  uploadImageMutation.mutate({
                    productId: imageModalProduct.id,
                    file: modalImageFile,
                  });
                } else if (modalRemoveExisting) {
                  deleteImageMutation.mutate(imageModalProduct.id);
                }
              }}
            >
              Save Image
            </Button>
          </>
        }
      >
        {imageModalProduct && (
          <div className="space-y-4 text-xs text-[#292824]">
            {/* Product Summary Box */}
            <div className="p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA] flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#292824] block text-sm">
                  {imageModalProduct.name}
                </span>
                <span className="font-mono text-[#88847D] text-xs">
                  SKU: {imageModalProduct.sku}
                </span>
              </div>
              <span className="text-[#88847D] text-xs">
                {imageModalProduct.category?.name || "Uncategorized"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#292824] mb-1.5">
                Upload New Image
              </label>
              <ImageUploader
                currentImageUrl={
                  modalRemoveExisting
                    ? null
                    : imageModalProduct.image_url || imageModalProduct.thumb_url
                }
                onFileSelect={(file) => {
                  setModalImageFile(file);
                  if (file) {
                    setModalRemoveExisting(false);
                  }
                }}
                onRemoveExisting={() => {
                  setModalImageFile(null);
                  setModalRemoveExisting(true);
                }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() =>
          deletingProduct && deleteMutation.mutate(deletingProduct.id)
        }
        title="Delete Product"
        message={`Are you sure you want to remove "${deletingProduct?.name}" (${deletingProduct?.sku}) from active inventory and POS? Historical sales and order records will remain preserved.`}
        confirmLabel="Delete Product"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
