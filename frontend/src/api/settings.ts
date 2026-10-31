import api from "./client";
import { AppSettings } from "../types";

export const settingsApi = {
  get: async (): Promise<{ data: AppSettings }> => {
    const res = await api.get<{ data: AppSettings }>("/settings");
    return res.data;
  },

  update: async (
    payload: Omit<AppSettings, "business_logo_url" | "business_logo">,
  ): Promise<{ message: string; data: AppSettings }> => {
    const res = await api.put<{ message: string; data: AppSettings }>(
      "/settings",
      payload,
    );
    return res.data;
  },

  uploadLogo: async (
    file: File,
  ): Promise<{ message: string; data: AppSettings }> => {
    const formData = new FormData();
    formData.append("logo", file);
    const res = await api.post<{ message: string; data: AppSettings }>(
      "/settings/logo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return res.data;
  },
};
