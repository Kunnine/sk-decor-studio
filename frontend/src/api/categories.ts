import api from './client';
import { Category, PaginatedResponse } from '../types';

export interface CategoryPayload {
  name: string;
  description?: string | null;
  parent_id?: number | null;
}

export const categoryApi = {
  list: async (params?: { search?: string; all?: boolean; tree?: boolean }): Promise<{ data: Category[] }> => {
    const res = await api.get<{ data: Category[] }>('/categories', { params });
    return res.data;
  },

  get: async (id: number): Promise<{ data: Category }> => {
    const res = await api.get<{ data: Category }>(`/categories/${id}`);
    return res.data;
  },

  create: async (payload: CategoryPayload): Promise<{ message: string; data: Category }> => {
    const res = await api.post<{ message: string; data: Category }>('/categories', payload);
    return res.data;
  },

  update: async (id: number, payload: Partial<CategoryPayload>): Promise<{ message: string; data: Category }> => {
    const res = await api.put<{ message: string; data: Category }>(`/categories/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/categories/${id}`);
    return res.data;
  },
};
