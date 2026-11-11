import api from "./client";
import { AppSettings, User } from "../types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
  permissions: string[];
  settings: AppSettings;
}

export interface MeResponse {
  user: User;
  permissions: string[];
  settings: AppSettings;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/login", payload);
    return res.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>("/logout");
    return res.data;
  },

  me: async (): Promise<MeResponse> => {
    const res = await api.get<MeResponse>("/me");
    return res.data;
  },

  updatePreferences: async (payload: {
    email_alerts_enabled?: boolean | null;
    digest_enabled?: boolean | null;
  }): Promise<{ message: string; user: User }> => {
    const res = await api.put<{ message: string; user: User }>(
      "/me/preferences",
      payload,
    );
    return res.data;
  },
};
