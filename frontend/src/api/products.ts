import api from "./client";
import {
  CsvImportCommitResult,
  CsvImportPreview,
  PaginatedResponse,
  Product,
} from "../types";

export interface ProductFilters {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number | "";
  unit_id?: number | "";
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
  cost_price: number;
  sell_price: number;
  stock_qty?: number;
  reorder_level?: number;
  is_active?: boolean;
  image?: File | null;
}

export const productApi = {
  list: async (
    params?: ProductFilters,
  ): Promise<PaginatedResponse<Product>> => {
    const res = await api.get<PaginatedResponse<Product>>("/products", {
      params,
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
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === "image" && value instanceof File) {
          formData.append("image", value);
        } else if (typeof value === "boolean") {
          formData.append(key, value ? "1" : "0");
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const res = await api.post<{ message: string; data: Product }>(
      "/products",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<ProductPayload>,
  ): Promise<{ message: string; data: Product }> => {
    const formData = new FormData();
    formData.append("_method", "PUT");

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === "image" && value instanceof File) {
          formData.append("image", value);
        } else if (typeof value === "boolean") {
          formData.append(key, value ? "1" : "0");
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const res = await api.post<{ message: string; data: Product }>(
      `/products/${id}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/products/${id}`);
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
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
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
};
