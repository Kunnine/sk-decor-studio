import api from "./client";
import { PaginatedResponse, Supplier } from "../types";

export interface SupplierPayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export const supplierApi = {
  list: async (params?: {
    search?: string;
    all?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<Supplier>> => {
    const res = await api.get<PaginatedResponse<Supplier>>("/suppliers", {
      params,
    });
    return res.data;
  },

  get: async (id: number): Promise<{ data: Supplier }> => {
    const res = await api.get<{ data: Supplier }>(`/suppliers/${id}`);
    return res.data;
  },

  create: async (
    payload: SupplierPayload,
  ): Promise<{ message: string; data: Supplier }> => {
    const res = await api.post<{ message: string; data: Supplier }>(
      "/suppliers",
      payload,
    );
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<SupplierPayload>,
  ): Promise<{ message: string; data: Supplier }> => {
    const res = await api.put<{ message: string; data: Supplier }>(
      `/suppliers/${id}`,
      payload,
    );
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/suppliers/${id}`);
    return res.data;
  },
};
