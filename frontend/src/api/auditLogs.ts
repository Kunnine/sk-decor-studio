import api from "./client";
import { AuditLogItem, PaginatedResponse } from "../types";

export const auditLogApi = {
  list: async (
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<AuditLogItem>> => {
    const res = await api.get<PaginatedResponse<AuditLogItem>>("/audit-logs", {
      params,
    });
    return res.data;
  },
};
