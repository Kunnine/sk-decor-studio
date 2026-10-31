import api from "./client";
import { PaginatedResponse, Role, User } from "../types";

export interface UserFilters {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
  is_active?: boolean | string;
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  role: Role;
  is_active?: boolean;
}

export const userApi = {
  list: async (params?: UserFilters): Promise<PaginatedResponse<User>> => {
    const res = await api.get<PaginatedResponse<User>>("/users", { params });
    return res.data;
  },

  get: async (id: number): Promise<{ data: User }> => {
    const res = await api.get<{ data: User }>(`/users/${id}`);
    return res.data;
  },

  create: async (
    payload: UserPayload,
  ): Promise<{ message: string; data: User }> => {
    const res = await api.post<{ message: string; data: User }>(
      "/users",
      payload,
    );
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<UserPayload>,
  ): Promise<{ message: string; data: User }> => {
    const res = await api.put<{ message: string; data: User }>(
      `/users/${id}`,
      payload,
    );
    return res.data;
  },

  toggleActive: async (
    id: number,
  ): Promise<{ message: string; data: User }> => {
    const res = await api.patch<{ message: string; data: User }>(
      `/users/${id}/toggle-active`,
    );
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/users/${id}`);
    return res.data;
  },
};
