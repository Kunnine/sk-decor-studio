import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt,
  Search,
  Filter,
  FileText,
  Printer,
  Download,
  Ban,
  AlertTriangle,
  Calendar,
  User,
  ShoppingBag,
  Clock,
  RotateCcw,
  Package,
} from "lucide-react";
import { saleApi, SaleFilters } from "../api/sales";
import { Sale } from "../types";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

export const Sales: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, settings, hasPermission } = useAuth();

  const currencySymbol = settings?.currency_symbol || "$";
  const canVoid = hasPermission("sales.void");
  const canViewCost = hasPermission("products.cost_view");

  // URL Query Params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const status = (searchParams.get("status") || "") as any;
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const invoiceSearch = searchParams.get("invoice_number") || "";

  // Modal States
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState<string | null>(null);

  // Fetch Sales List
  const filters: SaleFilters = {
    page,
    per_page: 15,
    status: status || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    invoice_number: invoiceSearch || undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sales", filters],
    queryFn: () => saleApi.list(filters),
  });

  // Void Mutation
  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      saleApi.void(id, reason),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["posProducts"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      setSelectedSale(res.data);
      setIsVoidModalOpen(false);
      setVoidReason("");
      setVoidError(null);
    },
    onError: (err: any) => {
      setVoidError(err.response?.data?.message || "Failed to void sale");
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleDownloadPdf = async (
    invoiceId: number,
    invoiceNumber: string,
  ) => {
    try {
      const blob = await saleApi.downloadPdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert("Failed to download invoice PDF.");
    }
  };

  const handlePrintPdf = async (invoiceId: number) => {
    try {
      const blob = await saleApi.viewPdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    } catch {
      alert("Failed to print invoice PDF.");
    }
  };

  const handleVoidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !voidReason.trim()) return;
    setVoidError(null);
    voidMutation.mutate({ id: selectedSale.id, reason: voidReason.trim() });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#292824] tracking-tight">
            Sales Records
          </h1>
          <p className="text-sm text-[#88847D] mt-1">
            Browse transaction records, download stamped PDF invoices, and
            process authorized voids.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[10px] border border-[#E8E3DA] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Invoice Number Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#88847D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice number..."
              value={invoiceSearch}
              onChange={(e) =>
                handleFilterChange("invoice_number", e.target.value)
              }
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#DDD6CA] bg-white text-[#292824] placeholder-[#88847D] focus:outline-none focus:ring-1 focus:ring-[#795438]"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DDD6CA] focus:outline-none focus:ring-1 focus:ring-[#795438] bg-white text-[#292824]"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="void">Voided</option>
            </select>
          </div>

          {/* Date From */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-[#88847D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleFilterChange("date_from", e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#DDD6CA] bg-white text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438]"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-[#88847D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleFilterChange("date_to", e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#DDD6CA] bg-white text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438]"
            />
          </div>
        </div>

        {(status || dateFrom || dateTo || invoiceSearch) && (
          <div className="flex justify-end pt-2 border-t border-[#E8E3DA]">
            <button
              onClick={resetFilters}
              className="text-xs text-[#88847D] hover:text-[#292824] flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#E8E3DA] overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-[#88847D]">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p>Failed to load sales records.</p>
          </div>
        ) : !data?.data?.length ? (
          <EmptyState
            icon={<Receipt className="w-8 h-8 text-[#A58B6F]" />}
            title="No sales found"
            description="No transactions match your current search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3">Invoice</th>
                  <th className="px-6 py-3">Date & Time</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Cashier</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3DA]">
                {data.data.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="hover:bg-[#FAF8F4] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="font-mono font-bold text-[#292824] text-xs">
                        {sale.invoice?.number || `#${sale.id}`}
                      </div>
                      <div className="text-[10px] text-[#88847D]">
                        {sale.items?.length ?? 0} items
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-[#88847D] whitespace-nowrap">
                      {sale.sold_at
                        ? new Date(sale.sold_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-[#292824]">
                      {sale.customer ? (
                        <span className="font-medium text-[#292824]">
                          {sale.customer.name}
                        </span>
                      ) : (
                        <span className="text-[#88847D] italic">Walk-in</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-[#88847D]">
                      {sale.cashier?.name || "Staff"}
                    </td>
                    <td className="px-6 py-3.5 text-xs uppercase font-medium text-[#88847D]">
                      {sale.payment_method}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-[#292824] text-xs">
                      {currencySymbol}
                      {sale.total}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <Badge
                        variant={
                          sale.status === "completed" ? "neutral" : "warning"
                        }
                        size="sm"
                      >
                        {sale.status === "completed" ? "Completed" : "VOID"}
                      </Badge>
                    </td>
                    <td
                      className="px-6 py-3.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="p-1.5 text-[#88847D] hover:text-[#795438] hover:bg-[#F3EDE6] rounded"
                          title="View Details"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {sale.invoice && (
                          <button
                            onClick={() =>
                              handleDownloadPdf(
                                sale.invoice!.id,
                                sale.invoice!.number,
                              )
                            }
                            className="p-1.5 text-[#88847D] hover:text-[#292824] hover:bg-[#F3EDE6] rounded"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.meta && data.meta.last_page > 1 && (
          <div className="px-6 py-3 bg-[#F8F6F2] border-t border-[#E8E3DA] flex items-center justify-between text-xs text-[#88847D]">
            <div>
              Showing {data.meta.from ?? 0} to {data.meta.to ?? 0} of{" "}
              {data.meta.total} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handleFilterChange("page", String(page - 1))}
              >
                Previous
              </Button>
              <span className="font-semibold text-[#292824]">
                Page {page} of {data.meta.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.last_page}
                onClick={() => handleFilterChange("page", String(page + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SALE DETAIL MODAL */}
      {selectedSale && (
        <Modal
          isOpen={Boolean(selectedSale)}
          onClose={() => setSelectedSale(null)}
          title={`Sale Details - ${selectedSale.invoice?.number || "#" + selectedSale.id}`}
        >
          <div className="space-y-5">
            {/* VOID WARNING BANNER */}
            {selectedSale.status === "void" && (
              <div className="p-3 bg-[#FEF3C7] border border-amber-300 rounded-lg text-amber-900 text-xs">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider mb-1 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  VOIDED TRANSACTION
                </div>
                <div>
                  Voided on{" "}
                  {selectedSale.voided_at
                    ? new Date(selectedSale.voided_at).toLocaleString()
                    : "N/A"}{" "}
                  by {selectedSale.voided_by_user?.name || "Staff"}.
                </div>
                {selectedSale.void_reason && (
                  <div className="mt-1 font-semibold">
                    Reason: "{selectedSale.void_reason}"
                  </div>
                )}
              </div>
            )}

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F8F6F2] p-3 rounded-lg border border-[#E8E3DA]">
              <div>
                <span className="text-[#88847D] block">Date & Time</span>
                <span className="font-semibold text-[#292824]">
                  {selectedSale.sold_at
                    ? new Date(selectedSale.sold_at).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-[#88847D] block">Cashier</span>
                <span className="font-semibold text-[#292824]">
                  {selectedSale.cashier?.name || "Staff"}
                </span>
              </div>
              <div>
                <span className="text-[#88847D] block">Customer</span>
                <span className="font-semibold text-[#292824]">
                  {selectedSale.customer
                    ? selectedSale.customer.name
                    : "Walk-in Customer"}
                </span>
              </div>
              <div>
                <span className="text-[#88847D] block">Payment Method</span>
                <span className="font-semibold text-[#292824] uppercase">
                  {selectedSale.payment_method}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#88847D] mb-2">
                Purchased Items ({selectedSale.items?.length ?? 0})
              </h4>
              <div className="border border-[#E8E3DA] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] font-semibold">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      {canViewCost && (
                        <th className="px-3 py-2 text-right">Cost</th>
                      )}
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E3DA]">
                    {selectedSale.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded border border-[#E8E3DA] bg-[#F8F7F4] flex items-center justify-center overflow-hidden shrink-0">
                              {item.product?.thumb_url ? (
                                <img
                                  src={item.product.thumb_url}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-3.5 h-3.5 text-[#C8C1B6]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#292824] truncate max-w-xs">
                                {item.product?.name}
                              </div>
                              {item.variant_label && (
                                <div className="text-[10px] font-medium text-[#795438]">
                                  {item.variant_label}
                                </div>
                              )}
                              <div className="text-[10px] text-[#88847D] font-mono">
                                {item.variant?.sku || item.product?.sku}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-[#292824]">
                          {item.qty}
                        </td>
                        <td className="px-3 py-2 text-right text-[#292824]">
                          {currencySymbol}
                          {item.unit_price}
                        </td>
                        {canViewCost && (
                          <td className="px-3 py-2 text-right text-[#88847D]">
                            {currencySymbol}
                            {item.unit_cost || "0.00"}
                          </td>
                        )}
                        <td className="px-3 py-2 text-right font-bold text-[#292824]">
                          {currencySymbol}
                          {item.line_total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="space-y-1 text-xs border-t border-[#E8E3DA] pt-3">
              <div className="flex justify-between text-[#88847D]">
                <span>Subtotal:</span>
                <span>
                  {currencySymbol}
                  {selectedSale.subtotal}
                </span>
              </div>
              {parseFloat(selectedSale.discount) > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Discount:</span>
                  <span>
                    -{currencySymbol}
                    {selectedSale.discount}
                  </span>
                </div>
              )}
              {parseFloat(selectedSale.tax) > 0 && (
                <div className="flex justify-between text-[#88847D]">
                  <span>Tax:</span>
                  <span>
                    {currencySymbol}
                    {selectedSale.tax}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-[#795438] pt-1 border-t border-[#E8E3DA]">
                <span>Total:</span>
                <span>
                  {currencySymbol}
                  {selectedSale.total}
                </span>
              </div>
              {selectedSale.payment_method === "cash" && (
                <div className="flex justify-between text-[#88847D] pt-1 text-[11px]">
                  <span>
                    Paid: {currencySymbol}
                    {selectedSale.amount_paid}
                  </span>
                  <span>
                    Change Due: {currencySymbol}
                    {selectedSale.change_due}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E8E3DA]">
              <div>
                {canVoid && selectedSale.status === "completed" && (
                  <Button
                    variant="outline"
                    className="text-amber-800 border-amber-300 hover:bg-amber-50"
                    leftIcon={<Ban className="w-4 h-4 text-amber-600" />}
                    onClick={() => {
                      setVoidError(null);
                      setVoidReason("");
                      setIsVoidModalOpen(true);
                    }}
                  >
                    Void Sale
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedSale.invoice && (
                  <>
                    <Button
                      variant="outline"
                      leftIcon={<Printer className="w-4 h-4" />}
                      onClick={() => handlePrintPdf(selectedSale.invoice!.id)}
                    >
                      Print
                    </Button>
                    <Button
                      leftIcon={<Download className="w-4 h-4" />}
                      onClick={() =>
                        handleDownloadPdf(
                          selectedSale.invoice!.id,
                          selectedSale.invoice!.number,
                        )
                      }
                    >
                      Download PDF
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* VOID CONFIRMATION MODAL */}
      <Modal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        title="Authorize Sale Void"
      >
        <form onSubmit={handleVoidSubmit} className="space-y-4">
          <div className="p-3 bg-[#FEF3C7] border border-amber-300 rounded-lg text-amber-900 text-xs">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              IMPORTANT NOTICE
            </div>
            Voiding this sale will restore the inventory quantities back to
            stock and create immutable reversing void movements. This action
            cannot be reversed.
          </div>

          {voidError && (
            <div className="p-2.5 bg-[#292824] text-white rounded-lg text-xs font-semibold">
              {voidError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#292824] uppercase tracking-wider mb-1">
              Mandatory Void Reason <span className="text-amber-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Customer returned items immediately, incorrect pricing, or payment failed."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DDD6CA] bg-white text-[#292824] focus:outline-none focus:ring-2 focus:ring-[#795438]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E3DA]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsVoidModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              isLoading={voidMutation.isPending}
            >
              Confirm & Void
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
