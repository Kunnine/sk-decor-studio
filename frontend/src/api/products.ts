import api from "./client";
import {
  CsvImportCommitResult,
  CsvImportPreview,
  PaginatedResponse,
  Product,
  ProductVariant,
} from "../types";

export interface ProductFilters {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number | "";
  parent_category_id?: number | "";
  supplier_id?: number | "";
  unit_id?: number | "";
  min_price?: number | string;
  max_price?: number | string;
  stock_status?: "" | "in_stock" | "low_stock" | "out_of_stock";
  color?: string;
  size?: string;
  material?: string;
  style?: string;
  is_active?: boolean | string;
  low_stock?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ProductPayload {
  sku: string;
  name: string;
  description?: string | null;
  category_id: number;
  unit_id?: number | null;
  supplier_id?: number | null;
  cost_price: number;
  sell_price: number;
  stock_qty?: number;
  reorder_level?: number;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  style?: string | null;
  has_variants?: boolean;
  variants?: ProductVariant[];
  is_active?: boolean;
  image?: File | null;
  remove_image?: boolean;
}

export const productApi = {
  list: async (
    params?: ProductFilters,
  ): Promise<PaginatedResponse<Product>> => {
    const cleanParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(
            ([, value]) =>
              value !== "" && value !== undefined && value !== null,
          ),
        )
      : undefined;

    const res = await api.get<PaginatedResponse<Product>>("/products", {
      params: cleanParams,
    });
    return res.data;
  },

  get: async (id: number): Promise<{ data: Product }> => {
    const res = await api.get<{ data: Product }>(`/products/${id}`);
    return res.data;
  },

  create: async (
    payload: ProductPayload,
  ): Promise<{ message: string; data: Product }> => {
    let body: any;
    if (payload.image instanceof File) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || key === "remove_image") return;
        if (key === "image" && value instanceof File) {
          formData.append("image", value);
        } else if (key === "variants" && Array.isArray(value)) {
          formData.append("variants", JSON.stringify(value));
        } else if (typeof value === "boolean") {
          formData.append(key, value ? "1" : "0");
        } else if (value === null) {
          if (
            [
              "supplier_id",
              "unit_id",
              "color",
              "size",
              "material",
              "style",
              "description",
            ].includes(key)
          ) {
            formData.append(key, "");
          }
        } else {
          formData.append(key, String(value));
        }
      });
      body = formData;
    } else {
      body = payload;
    }

    const res = await api.post<{ message: string; data: Product }>(
      "/products",
      body,
    );
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<ProductPayload>,
  ): Promise<{ message: string; data: Product }> => {
    let body: any;
    if (payload.image instanceof File || payload.remove_image) {
      const formData = new FormData();
      formData.append("_method", "PUT");

      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined) return;
        if (key === "image" && value instanceof File) {
          formData.append("image", value);
        } else if (key === "variants" && Array.isArray(value)) {
          formData.append("variants", JSON.stringify(value));
        } else if (typeof value === "boolean") {
          formData.append(key, value ? "1" : "0");
        } else if (value === null) {
          if (
            [
              "supplier_id",
              "unit_id",
              "color",
              "size",
              "material",
              "style",
              "description",
            ].includes(key)
          ) {
            formData.append(key, "");
          }
        } else {
          formData.append(key, String(value));
        }
      });
      body = formData;
      const res = await api.post<{ message: string; data: Product }>(
        `/products/${id}`,
        body,
      );
      return res.data;
    } else {
      const res = await api.put<{ message: string; data: Product }>(
        `/products/${id}`,
        payload,
      );
      return res.data;
    }
  },

  delete: async (
    id: number,
  ): Promise<{
    message: string;
    has_transaction_history?: boolean;
    soft_deleted?: boolean;
  }> => {
    const res = await api.delete<{
      message: string;
      has_transaction_history?: boolean;
      soft_deleted?: boolean;
    }>(`/products/${id}`);
    return res.data;
  },

  uploadImage: async (
    id: number,
    file: File,
  ): Promise<{ message: string; data: Product }> => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await api.post<{ message: string; data: Product }>(
      `/products/${id}/image`,
      formData,
    );
    return res.data;
  },

  deleteImage: async (
    id: number,
  ): Promise<{ message: string; data: Product }> => {
    const res = await api.delete<{ message: string; data: Product }>(
      `/products/${id}/image`,
    );
    return res.data;
  },

  toggleActive: async (
    id: number,
  ): Promise<{ message: string; data: Product }> => {
    const res = await api.patch<{ message: string; data: Product }>(
      `/products/${id}/toggle-active`,
    );
    return res.data;
  },

  importPreview: async (file: File): Promise<CsvImportPreview> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post<CsvImportPreview>(
      "/products/import/preview",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  importCommit: async (options: {
    preview_token: string;
    create_missing_categories?: boolean;
    create_missing_units?: boolean;
    duplicate_sku_action: "skip" | "update";
  }): Promise<CsvImportCommitResult> => {
    const res = await api.post<CsvImportCommitResult>(
      "/products/import",
      options,
    );
    return res.data;
  },

  downloadTemplate: async (): Promise<Blob> => {
    const res = await api.get("/products/import/template", {
      responseType: "blob",
    });
    return res.data;
  },

  importCsv: async (file: File): Promise<CsvImportCommitResult> => {
    const preview = await productApi.importPreview(file);
    return productApi.importCommit({
      preview_token: preview.preview_token,
      duplicate_sku_action: "update",
      create_missing_categories: true,
      create_missing_units: true,
    });
  },

  posSearch: async (
    q: string,
    categoryId?: number | "",
  ): Promise<Product[]> => {
    const res = await api.get<{ data: Product[] }>("/products/pos-search", {
      params: {
        q,
        ...(categoryId ? { category_id: categoryId } : {}),
      },
    });
    return res.data.data;
  },

  lowStock: async (params?: {
    page?: number;
    per_page?: number;
  }): Promise<
    PaginatedResponse<Product & { last_purchase_date?: string | null }>
  > => {
    const res = await api.get<
      PaginatedResponse<Product & { last_purchase_date?: string | null }>
    >("/products/low-stock", { params });
    return res.data;
  },
};
