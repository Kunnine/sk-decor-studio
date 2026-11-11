import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Package, ExternalLink } from "lucide-react";
import { notificationApi } from "../../api/notifications";
import { NotificationItem } from "../../types";

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Query notifications with 60 second polling, automatically pauses on tab hide
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "latest"],
    queryFn: () => notificationApi.list({ per_page: 10 }),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  const notifications: NotificationItem[] = data?.data ?? [];
  const unreadCount = data?.meta?.unread_count ?? 0;

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMinutes = Math.floor(
        (Date.now() - date.getTime()) / (1000 * 60),
      );
      if (diffMinutes < 1) return "just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg border border-[#E8E3DA] bg-white text-[#88847D] hover:text-[#292824] hover:bg-[#F3EDE6] focus:outline-none focus:ring-2 focus:ring-[#795438] transition-colors"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] rounded-full bg-[#F59E0B] text-[#292824] font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-none"
            title={`${unreadCount} unread alerts`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E8E3DA] rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E8E3DA] flex items-center justify-between bg-[#F8F6F2]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#292824]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B] text-[#292824]">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-[11px] font-medium text-[#795438] hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F0ECE4]">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-[#88847D]">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#88847D]">
                <Check className="w-5 h-5 mx-auto mb-1 text-[#A58B6F]" />
                No notifications right now
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.read_at;
                const data = item.data;
                return (
                  <div
                    key={item.id}
                    className={`p-3 text-xs flex gap-3 transition-colors ${
                      isUnread
                        ? "bg-amber-50/30 hover:bg-amber-50/50"
                        : "hover:bg-[#FAF8F4]"
                    }`}
                  >
                    {/* Thumbnail or icon */}
                    <div className="w-8 h-8 rounded shrink-0 bg-[#F3EDE6] border border-[#E8E3DA] overflow-hidden flex items-center justify-center">
                      {data.thumb_url ? (
                        <img
                          src={data.thumb_url}
                          alt={data.name || "Product"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-4 h-4 text-[#A58B6F]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-[#292824] truncate">
                          {data.name || "System Alert"}
                        </p>
                        <span className="text-[10px] text-[#88847D] shrink-0">
                          {formatTime(item.created_at)}
                        </span>
                      </div>
                      <p className="text-[#88847D] line-clamp-2 mt-0.5 text-[11px]">
                        {data.message}
                      </p>
                      {data.stock_qty !== undefined && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B] text-[#292824]">
                            Stock: {data.stock_qty} / {data.reorder_level}
                          </span>
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              navigate("/products/low-stock");
                            }}
                            className="text-[10px] text-[#795438] hover:underline flex items-center gap-0.5"
                          >
                            <span>Restock</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {isUnread && (
                      <button
                        onClick={() => markReadMutation.mutate(item.id)}
                        className="p-1 rounded text-[#88847D] hover:text-[#292824] hover:bg-[#F3EDE6] shrink-0 self-start"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[#E8E3DA] bg-[#F8F6F2] text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-[#795438] hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
