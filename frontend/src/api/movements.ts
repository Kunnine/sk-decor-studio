import api from "./client";
import { MovementType, PaginatedResponse, StockMovement } from "../types";

export interface MovementFilters {
  page?: number;
  per_page?: number;
  product_id?: number | "";
  type?: MovementType | "";
  user_id?: number | "";
  date_from?: string;
  date_to?: string;
}

export const movementApi = {
  list: async (
    params?: MovementFilters,
  ): Promise<PaginatedResponse<StockMovement>> => {
    const res = await api.get<PaginatedResponse<StockMovement>>(
      "/stock-movements",
      { params },
    );
    return res.data;
  },
};
