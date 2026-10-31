import api from "./client";
import { StockMovement } from "../types";

export interface AdjustmentPayload {
  product_id: number;
  delta: number;
  reason: string;
}

export const adjustmentApi = {
  create: async (
    payload: AdjustmentPayload,
  ): Promise<{ message: string; data: StockMovement }> => {
    const res = await api.post<{ message: string; data: StockMovement }>(
      "/stock-adjustments",
      payload,
    );
    return res.data;
  },
};
