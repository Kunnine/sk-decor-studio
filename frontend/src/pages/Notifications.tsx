import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { notificationApi } from "../api/notifications";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

export const Notifications: React.FC = () => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "page", page, unreadOnly],
    queryFn: () =>
      notificationApi.list({
        page,
        per_page: 15,
        unread: unreadOnly || undefined,
      }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data ?? [];
  const meta = data?.meta;
  const unreadCount = meta?.unread_count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#292824]">Notifications</h1>
          <p className="text-xs text-[#88847D] mt-1">
            Real-time low-stock alerts and operational announcements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-white border border-[#E8E3DA] rounded-lg">
            <button
              onClick={() => {
                setUnreadOnly(false);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                !unreadOnly
                  ? "bg-[#795438] text-white"
                  : "text-[#88847D] hover:text-[#292824]"
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => {
                setUnreadOnly(true);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                unreadOnly
                  ? "bg-[#795438] text-white"
                  : "text-[#88847D] hover:text-[#292824]"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    unreadOnly
                      ? "bg-white text-[#795438]"
                      : "bg-[#F59E0B] text-[#292824]"
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              isLoading={markAllMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-[#E8E3DA] rounded-[10px] overflow-hidden shadow-none">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-8 h-8 text-[#A58B6F]" />}
            title={
              unreadOnly
                ? "No unread notifications"
                : "No notifications recorded"
            }
            description={
              unreadOnly
                ? "You are all caught up! There are no unread inventory alerts."
                : "Inventory notifications will appear here when stock drops below threshold levels."
            }
          />
        ) : (
          <div className="divide-y divide-[#E8E3DA]">
            {notifications.map((item) => {
              const isUnread = !item.read_at;
              const data = item.data;
              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isUnread ? "bg-amber-50/25" : "hover:bg-[#FAF8F4]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#F8F7F4] border border-[#E8E3DA] overflow-hidden shrink-0 flex items-center justify-center">
                      {data.thumb_url ? (
                        <img
                          src={data.thumb_url}
                          alt={data.name || "Product"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-[#C8C1B6]" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#292824] text-sm">
                          {data.name || "Low Stock Alert"}
                        </span>
                        {data.sku && (
                          <span className="text-xs font-mono text-[#88847D]">
                            ({data.sku})
                          </span>
                        )}
                        {isUnread && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B] text-[#292824]">
                            Unread
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#292824] max-w-2xl">
                        {data.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#88847D]">
                        <span>
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                        {data.stock_qty !== undefined && (
                          <>
                            <span>&bull;</span>
                            <span className="font-semibold text-[#292824]">
                              Current Stock: {data.stock_qty}
                            </span>
                            <span>&bull;</span>
                            <span>Reorder Level: {data.reorder_level}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link
                      to="/products/low-stock"
                      className="px-3 py-1.5 text-xs font-semibold text-[#795438] bg-[#F3EDE6] hover:bg-[#EAE1D6] rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span>Restock</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markReadMutation.mutate(item.id)}
                        isLoading={markReadMutation.isPending}
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4 text-[#88847D]" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-[#E8E3DA] flex items-center justify-between bg-[#F8F6F2]">
            <span className="text-xs text-[#88847D]">
              Page {meta.current_page} of {meta.last_page} ({meta.total} total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
