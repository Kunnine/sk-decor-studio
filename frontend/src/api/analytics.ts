import api from "./client";
import {
  AnalyticsSummary,
  SalesTrendPoint,
  TopProductAnalytics,
  CategorySalesAnalytics,
  ValuationAnalytics,
  PaymentMethodAnalytics,
  CashierAnalytics,
} from "../types";

export interface DateRangeParams {
  from?: string;
  to?: string;
}

export const analyticsApi = {
  summary: async (params?: DateRangeParams): Promise<AnalyticsSummary> => {
    const res = await api.get<{ data: AnalyticsSummary }>(
      "/analytics/summary",
      {
        params,
      },
    );
    return res.data.data;
  },

  salesTrend: async (params?: DateRangeParams): Promise<SalesTrendPoint[]> => {
    const res = await api.get<{ data: SalesTrendPoint[] }>(
      "/analytics/sales-trend",
      {
        params,
      },
    );
    return res.data.data;
  },

  topProducts: async (
    params?: DateRangeParams & { by?: "qty" | "revenue"; limit?: number },
  ): Promise<TopProductAnalytics[]> => {
    const res = await api.get<{ data: TopProductAnalytics[] }>(
      "/analytics/top-products",
      {
        params,
      },
    );
    return res.data.data;
  },

  salesByCategory: async (
    params?: DateRangeParams,
  ): Promise<CategorySalesAnalytics[]> => {
    const res = await api.get<{ data: CategorySalesAnalytics[] }>(
      "/analytics/sales-by-category",
      { params },
    );
    return res.data.data;
  },

  valuation: async (): Promise<ValuationAnalytics> => {
    const res = await api.get<{ data: ValuationAnalytics }>(
      "/analytics/valuation",
    );
    return res.data.data;
  },

  paymentMethods: async (
    params?: DateRangeParams,
  ): Promise<PaymentMethodAnalytics[]> => {
    const res = await api.get<{ data: PaymentMethodAnalytics[] }>(
      "/analytics/payment-methods",
      { params },
    );
    return res.data.data;
  },

  cashiers: async (params?: DateRangeParams): Promise<CashierAnalytics[]> => {
    const res = await api.get<{ data: CashierAnalytics[] }>(
      "/analytics/cashiers",
      {
        params,
      },
    );
    return res.data.data;
  },
};
