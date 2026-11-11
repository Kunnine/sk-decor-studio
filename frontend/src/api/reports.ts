import api from "./client";

export interface ReportResponse<T, Totals = Record<string, unknown>> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  totals: Totals;
}

export const reportsApi = {
  salesSummary: async (
    params?: Record<string, unknown>,
  ): Promise<
    ReportResponse<
      unknown,
      {
        orders: number;
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
      }
    >
  > => {
    const res = await api.get("/reports/sales-summary", { params });
    return res.data;
  },

  salesByProduct: async (
    params?: Record<string, unknown>,
  ): Promise<
    ReportResponse<
      unknown,
      {
        units_sold: number;
        revenue: number;
        cogs: number;
        profit: number;
        margin_pct: number;
      }
    >
  > => {
    const res = await api.get("/reports/sales-by-product", { params });
    return res.data;
  },

  salesByCategory: async (
    params?: Record<string, unknown>,
  ): Promise<
    ReportResponse<
      unknown,
      { units_sold: number; revenue: number; percentage: number }
    >
  > => {
    const res = await api.get("/reports/sales-by-category", { params });
    return res.data;
  },

  purchasesBySupplier: async (
    params?: Record<string, unknown>,
  ): Promise<
    ReportResponse<
      unknown,
      { purchases_count: number; items_purchased: number; total_spent: number }
    >
  > => {
    const res = await api.get("/reports/purchases-by-supplier", { params });
    return res.data;
  },

  stockMovements: async (
    params?: Record<string, unknown>,
  ): Promise<
    ReportResponse<
      unknown,
      { movements_count: number; net_qty: number; net_value: number }
    >
  > => {
    const res = await api.get("/reports/stock-movements", { params });
    return res.data;
  },

  inventoryValuation: async (
    params?: Record<string, unknown>,
  ): Promise<
    ReportResponse<
      unknown,
      {
        products_count: number;
        total_units: number;
        total_inventory_value: number;
        total_retail_value: number;
        total_potential_profit: number;
      }
    >
  > => {
    const res = await api.get("/reports/inventory-valuation", { params });
    return res.data;
  },

  lowStock: async (
    params?: Record<string, unknown>,
  ): Promise<
    ReportResponse<
      unknown,
      {
        products_count: number;
        total_deficit: number;
        total_restock_cost: number;
      }
    >
  > => {
    const res = await api.get("/reports/low-stock", { params });
    return res.data;
  },

  getSignedPdfUrl: async (payload: {
    report: "sales-summary" | "inventory-valuation";
    from?: string;
    to?: string;
    category_id?: number;
  }): Promise<{ url: string; expires_at: string }> => {
    const res = await api.post<{ url: string; expires_at: string }>(
      "/reports/signed-pdf-url",
      payload,
    );
    return res.data;
  },

  downloadCsv: async (
    reportType: string,
    params?: Record<string, unknown>,
    filename?: string,
  ): Promise<void> => {
    const res = await api.get(`/reports/${reportType}`, {
      params: { ...params, format: "csv" },
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename || `${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
