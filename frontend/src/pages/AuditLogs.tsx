import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Search,
  Calendar,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  FileJson,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { auditLogApi } from "../api/auditLogs";
import { AuditLogItem } from "../types";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "price_change", label: "Price Change" },
  { value: "cost_change", label: "Cost Change" },
  { value: "settings_updated", label: "Settings Updated" },
  { value: "user_created", label: "User Created" },
  { value: "user_updated", label: "User Updated" },
  { value: "user_deactivated", label: "User Deactivated" },
  { value: "stock_adjusted", label: "Stock Adjusted" },
  { value: "sale_voided", label: "Sale Voided" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "All Entities" },
  { value: "Product", label: "Product" },
  { value: "Setting", label: "Setting" },
  { value: "User", label: "User" },
  { value: "StockMovement", label: "Stock Movement" },
  { value: "Sale", label: "Sale" },
];

export const AuditLogs: React.FC = () => {
  const { user, isAdmin, settings } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const page = parseInt(searchParams.get("page") || "1", 10);
  const action = searchParams.get("action") || "";
  const entity = searchParams.get("entity") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";

  // Changes Inspector Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const handleFilterChange = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const handleClearFilters = () => {
    const next = new URLSearchParams();
    setSearchParams(next, { replace: true });
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", page, action, entity, dateFrom, dateTo],
    queryFn: () =>
      auditLogApi.list({
        page,
        per_page: 20,
        action: action || undefined,
        entity: entity || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    enabled: isAdmin,
  });

  const logs: AuditLogItem[] = data?.data ?? [];
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  };

  const formatActionName = (act: string) => {
    return act
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#88847D]">
              {settings?.business_name || "Inventory System"}
            </span>
            <Badge
              variant="primary"
              size="sm"
              className="uppercase font-bold text-[10px]"
            >
              Admin Only
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-[#292824]">
            System Audit Trail
          </h1>
          <p className="text-xs text-[#88847D] mt-0.5">
            Append-only verification log for sensitive price overrides, stock
            corrections, user administration, and voids.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#88847D]" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-4 shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#292824]">
            <Filter className="w-3.5 h-3.5 text-[#795438]" />
            <span>Filters:</span>
          </div>

          {/* Action Filter */}
          <select
            value={action}
            onChange={(e) => handleFilterChange("action", e.target.value)}
            className="text-xs border border-[#DDD6CA] rounded-md px-2.5 py-1.5 bg-white text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438]"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Entity Filter */}
          <select
            value={entity}
            onChange={(e) => handleFilterChange("entity", e.target.value)}
            className="text-xs border border-[#DDD6CA] rounded-md px-2.5 py-1.5 bg-white text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438]"
          >
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Date range inputs */}
          <div className="flex items-center gap-1 text-xs text-[#88847D]">
            <span className="text-[11px] font-semibold text-[#88847D]">
              From
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleFilterChange("date_from", e.target.value)}
              className="text-xs border border-[#DDD6CA] rounded px-2 py-1 bg-white text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438]"
            />
            <span className="text-[11px] font-semibold text-[#88847D]">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleFilterChange("date_to", e.target.value)}
              className="text-xs border border-[#DDD6CA] rounded px-2 py-1 bg-white text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438]"
            />
          </div>

          {(action || entity || dateFrom || dateTo) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs h-8 px-2 text-[#88847D] gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-[#E8E3DA] rounded-[10px] shadow-none overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<ShieldCheck className="w-8 h-8 text-[#A58B6F]" />}
              title="No audit entries"
              description="No audit trail events match the selected criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F6F2] border-b border-[#E8E3DA] text-[#88847D] font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3DA] text-[#292824]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF8F4]">
                    <td className="py-3 px-4 whitespace-nowrap text-[#88847D]">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#292824]">
                        {log.user_name || "System"}
                      </div>
                      {log.user_email && (
                        <div className="text-[11px] text-[#88847D]">
                          {log.user_email}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F3EDE6] text-[#795438] border border-[#E2D9CE]">
                        {formatActionName(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {log.entity} {log.entity_id ? `#${log.entity_id}` : ""}
                    </td>
                    <td className="py-3 px-4 text-[#88847D] font-mono text-[11px]">
                      {log.ip || "127.0.0.1"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.changes ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#795438] border border-[#DFD2C5] rounded hover:bg-[#F3EDE6] transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Diff</span>
                        </button>
                      ) : (
                        <span className="text-[#88847D] text-[11px]">
                          &mdash;
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {meta.last_page > 1 && (
          <div className="px-5 py-3 border-t border-[#E8E3DA] bg-[#F8F6F2] flex items-center justify-between">
            <span className="text-xs text-[#88847D]">
              Showing page{" "}
              <span className="font-semibold text-[#292824]">
                {meta.current_page}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#292824]">
                {meta.last_page}
              </span>{" "}
              ({meta.total} events)
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange("page", String(page - 1))}
                disabled={page <= 1}
                className="p-1.5"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange("page", String(page + 1))}
                disabled={page >= meta.last_page}
                className="p-1.5"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Changes Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event #${selectedLog.id}: ${formatActionName(selectedLog.action)}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA] text-xs">
              <div>
                <span className="text-[#88847D] font-medium">User:</span>{" "}
                <span className="font-semibold text-[#292824]">
                  {selectedLog.user_name}
                </span>
              </div>
              <div>
                <span className="text-[#88847D] font-medium">Entity:</span>{" "}
                <span className="font-semibold text-[#292824]">
                  {selectedLog.entity} #{selectedLog.entity_id}
                </span>
              </div>
              <div>
                <span className="text-[#88847D] font-medium">IP Address:</span>{" "}
                <span className="font-mono text-[#292824]">
                  {selectedLog.ip || "127.0.0.1"}
                </span>
              </div>
              <div>
                <span className="text-[#88847D] font-medium">Timestamp:</span>{" "}
                <span className="text-[#292824]">
                  {selectedLog.created_at
                    ? new Date(selectedLog.created_at).toLocaleString()
                    : "-"}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-[#292824]">
                <FileJson className="w-4 h-4 text-[#795438]" />
                <span>Recorded State Changes (JSON Payload):</span>
              </div>
              <pre className="p-3 bg-[#292824] text-[#F8F6F2] rounded-lg text-xs font-mono overflow-x-auto max-h-80 border border-[#4A3828]">
                {JSON.stringify(selectedLog.changes, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
