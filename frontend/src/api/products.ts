import api from './client';
import { CsvImportResult, PaginatedResponse, Product } from '../types';

export interface ProductFilters {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number | '';
  is_active?: boolean | '';
  low_stock?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ProductPayload {
  sku: string;
  name: string;
  description?: string | null;
  category_id: number;
  cost_price: number;
  sell_price: number;
  stock_qty?: number;
  reorder_level?: number;
  is_active?: boolean;
}

export const productApi = {
  list: async (params?: ProductFilters): Promise<PaginatedResponse<Product>> => {
    const res = await api.get<PaginatedResponse<Product>>('/products', { params });
    return res.data;
  },

  get: async (id: number): Promise<{ data: Product }> => {
    const res = await api.get<{ data: Product }>(`/products/${id}`);
    return res.data;
  },

  lowStock: async (params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<Product>> => {
    const res = await api.get<PaginatedResponse<Product>>('/products/low-stock', { params });
    return res.data;
  },

  create: async (payload: ProductPayload): Promise<{ message: string; data: Product }> => {
    const res = await api.post<{ message: string; data: Product }>('/products', payload);
    return res.data;
  },

  update: async (id: number, payload: Partial<ProductPayload>): Promise<{ message: string; data: Product }> => {
    const res = await api.put<{ message: string; data: Product }>(`/products/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/products/${id}`);
    return res.data;
  },

  importCsv: async (file: File): Promise<CsvImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<CsvImportResult>('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  downloadTemplate: async (): Promise<Blob> => {
    const res = await api.get('/products/csv-template', {
      responseType: 'blob',
    });
    return res.data;
  },
};
