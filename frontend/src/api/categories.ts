import api from "./client";
import { Category, PaginatedResponse } from "../types";

export interface CategoryFilters {
  page?: number;
  per_page?: number;
  search?: string;
  parent_id?: number | "root" | "";
  all?: boolean;
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string | null;
  parent_id?: number | null;
  sort_order?: number;
}

export const categoryApi = {
  list: async (
    params?: CategoryFilters,
  ): Promise<PaginatedResponse<Category> | { data: Category[] }> => {
    const res = await api.get("/categories", { params });
    return res.data;
  },

  tree: async (): Promise<{ data: Category[] }> => {
    const res = await api.get<{ data: Category[] }>("/categories/tree");
    return res.data;
  },

  get: async (id: number): Promise<{ data: Category }> => {
    const res = await api.get<{ data: Category }>(`/categories/${id}`);
    return res.data;
  },

  create: async (
    payload: CategoryPayload,
  ): Promise<{ message: string; data: Category }> => {
    const res = await api.post<{ message: string; data: Category }>(
      "/categories",
      payload,
    );
    return res.data;
  },

  update: async (
    id: number,
    payload: CategoryPayload,
  ): Promise<{ message: string; data: Category }> => {
    const res = await api.put<{ message: string; data: Category }>(
      `/categories/${id}`,
      payload,
    );
    return res.data;
  },

  move: async (
    id: number,
    parentId: number | null,
  ): Promise<{ message: string; data: Category }> => {
    const res = await api.post<{ message: string; data: Category }>(
      `/categories/${id}/move`,
      {
        parent_id: parentId,
      },
    );
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/categories/${id}`);
    return res.data;
  },
};
