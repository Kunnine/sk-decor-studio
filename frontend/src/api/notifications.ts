import api from "./client";
import { NotificationItem } from "../types";

export interface NotificationsResponse {
  data: NotificationItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    unread_count: number;
  };
}

export const notificationApi = {
  list: async (params?: {
    unread?: boolean;
    per_page?: number;
    page?: number;
  }): Promise<NotificationsResponse> => {
    const res = await api.get<NotificationsResponse>("/notifications", {
      params,
    });
    return res.data;
  },

  markAsRead: async (
    id: string,
  ): Promise<{ message: string; data: NotificationItem }> => {
    const res = await api.post<{ message: string; data: NotificationItem }>(
      `/notifications/${id}/read`,
    );
    return res.data;
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>("/notifications/read-all");
    return res.data;
  },
};
