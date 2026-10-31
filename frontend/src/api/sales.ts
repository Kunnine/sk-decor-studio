import api from "./client";
import { PaginatedResponse, PaymentMethod, Sale, SaleStatus } from "../types";

export interface SaleFilters {
  page?: number;
  per_page?: number;
  status?: SaleStatus | "";
  date_from?: string;
  date_to?: string;
  user_id?: number | "";
  customer_id?: number | "";
  invoice_number?: string;
}

export interface SaleItemInput {
  product_id: number;
  qty: number;
  unit_price?: number;
}

export interface CreateSalePayload {
  customer_id?: number | null;
  payment_method: PaymentMethod;
  amount_paid?: number;
  discount?: number | { type: "percent" | "amount"; value: number };
  notes?: string | null;
  items: SaleItemInput[];
}

export const saleApi = {
  list: async (params?: SaleFilters): Promise<PaginatedResponse<Sale>> => {
    const res = await api.get<PaginatedResponse<Sale>>("/sales", { params });
    return res.data;
  },

  get: async (id: number): Promise<{ data: Sale }> => {
    const res = await api.get<{ data: Sale }>(`/sales/${id}`);
    return res.data;
  },

  create: async (
    payload: CreateSalePayload,
    idempotencyKey?: string,
  ): Promise<{ message: string; data: Sale }> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const res = await api.post<{ message: string; data: Sale }>(
      "/sales",
      payload,
      { headers },
    );
    return res.data;
  },

  void: async (
    id: number,
    reason: string,
  ): Promise<{ message: string; data: Sale }> => {
    const res = await api.post<{ message: string; data: Sale }>(
      `/sales/${id}/void`,
      { reason },
    );
    return res.data;
  },

  downloadPdf: async (invoiceId: number): Promise<Blob> => {
    const res = await api.get(`/invoices/${invoiceId}/pdf?download=1`, {
      responseType: "blob",
    });
    return res.data;
  },

  viewPdf: async (invoiceId: number): Promise<Blob> => {
    const res = await api.get(`/invoices/${invoiceId}/pdf`, {
      responseType: "blob",
    });
    return res.data;
  },
};
