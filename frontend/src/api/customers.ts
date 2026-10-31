import api from "./client";
import { Customer, PaginatedResponse } from "../types";

export interface CustomerPayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export const customerApi = {
  list: async (params?: {
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<Customer>> => {
    const res = await api.get<PaginatedResponse<Customer>>("/customers", {
      params,
    });
    return res.data;
  },

  search: async (q: string): Promise<Customer[]> => {
    const res = await api.get<{ data: Customer[] }>("/customers/search", {
      params: { q },
    });
    return res.data.data;
  },

  get: async (id: number): Promise<{ data: Customer }> => {
    const res = await api.get<{ data: Customer }>(`/customers/${id}`);
    return res.data;
  },

  create: async (
    payload: CustomerPayload,
  ): Promise<{ message: string; data: Customer }> => {
    const res = await api.post<{ message: string; data: Customer }>(
      "/customers",
      payload,
    );
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<CustomerPayload>,
  ): Promise<{ message: string; data: Customer }> => {
    const res = await api.put<{ message: string; data: Customer }>(
      `/customers/${id}`,
      payload,
    );
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/customers/${id}`);
    return res.data;
  },
};
