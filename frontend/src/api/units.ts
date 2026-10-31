import api from "./client";
import { PaginatedResponse, Unit } from "../types";

export interface UnitFilters {
  page?: number;
  per_page?: number;
  search?: string;
  all?: boolean;
}

export interface UnitPayload {
  name: string;
  short_name: string;
}

export const unitApi = {
  list: async (
    params?: UnitFilters,
  ): Promise<PaginatedResponse<Unit> | { data: Unit[] }> => {
    const res = await api.get("/units", { params });
    return res.data;
  },

  get: async (id: number): Promise<{ data: Unit }> => {
    const res = await api.get<{ data: Unit }>(`/units/${id}`);
    return res.data;
  },

  create: async (
    payload: UnitPayload,
  ): Promise<{ message: string; data: Unit }> => {
    const res = await api.post<{ message: string; data: Unit }>(
      "/units",
      payload,
    );
    return res.data;
  },

  update: async (
    id: number,
    payload: UnitPayload,
  ): Promise<{ message: string; data: Unit }> => {
    const res = await api.put<{ message: string; data: Unit }>(
      `/units/${id}`,
      payload,
    );
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/units/${id}`);
    return res.data;
  },
};
