import api from "./client";
import { PaginatedResponse, Purchase, PurchaseStatus } from "../types";

export interface PurchaseFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: PurchaseStatus | "";
  supplier_id?: number | "";
  date_from?: string;
  date_to?: string;
}

export interface PurchaseItemInput {
  product_id: number;
  qty: number;
  unit_cost: number;
}

export interface PurchasePayload {
  supplier_id: number;
  ref_no: string;
  notes?: string | null;
  items: PurchaseItemInput[];
}

export const purchaseApi = {
  list: async (
    params?: PurchaseFilters,
  ): Promise<PaginatedResponse<Purchase>> => {
    const res = await api.get<PaginatedResponse<Purchase>>("/purchases", {
      params,
    });
    return res.data;
  },

  get: async (id: number): Promise<{ data: Purchase }> => {
    const res = await api.get<{ data: Purchase }>(`/purchases/${id}`);
    return res.data;
  },

  create: async (
    payload: PurchasePayload,
  ): Promise<{ message: string; data: Purchase }> => {
    const res = await api.post<{ message: string; data: Purchase }>(
      "/purchases",
      payload,
    );
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<PurchasePayload>,
  ): Promise<{ message: string; data: Purchase }> => {
    const res = await api.put<{ message: string; data: Purchase }>(
      `/purchases/${id}`,
      payload,
    );
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/purchases/${id}`);
    return res.data;
  },

  receive: async (id: number): Promise<{ message: string; data: Purchase }> => {
    const res = await api.post<{ message: string; data: Purchase }>(
      `/purchases/${id}/receive`,
    );
    return res.data;
  },
};
