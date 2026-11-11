import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Bell,
  Mail,
  Shield,
  Save,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authApi } from "../api/auth";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export const Profile: React.FC = () => {
  const { user, settings } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [emailAlerts, setEmailAlerts] = useState<boolean>(
    user?.email_alerts_enabled ??
      (settings
        ? String(settings.default_reorder_level ? "1" : "1") === "1"
        : true),
  );

  const [digest, setDigest] = useState<boolean>(user?.digest_enabled ?? true);

  const updateMutation = useMutation({
    mutationFn: (payload: {
      email_alerts_enabled: boolean;
      digest_enabled: boolean;
    }) => authApi.updatePreferences(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      addToast({
        title: "Preferences Saved",
        message: res.message,
        type: "success",
      });
    },
    onError: () => {
      addToast({
        title: "Update Failed",
        message: "Could not save notification preferences.",
        type: "error",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      email_alerts_enabled: emailAlerts,
      digest_enabled: digest,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#292824]">User Profile</h1>
        <p className="text-xs text-[#88847D] mt-1">
          Manage your account information and notification preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Info Card */}
        <div className="md:col-span-1 bg-white border border-[#E8E3DA] rounded-[10px] p-6 space-y-4 shadow-none">
          <div className="w-16 h-16 rounded-full bg-[#F3EDE6] border border-[#DFD2C5] flex items-center justify-center text-[#795438] mx-auto">
            <UserIcon className="w-8 h-8" />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-sm font-bold text-[#292824]">{user?.name}</h2>
            <p className="text-xs text-[#88847D]">{user?.email}</p>
            <div className="pt-2">
              <Badge
                variant="primary"
                size="sm"
                className="uppercase text-[10px]"
              >
                {user?.role}
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8E3DA] text-xs text-[#88847D] space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#A58B6F]" />
              <span>
                Status: <strong className="text-[#292824]">Active</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#A58B6F]" />
              <span>Email Verified</span>
            </div>
          </div>
        </div>

        {/* Preferences Form */}
        <div className="md:col-span-2 bg-white border border-[#E8E3DA] rounded-[10px] p-6 shadow-none">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8E3DA]">
              <Bell className="w-4 h-4 text-[#795438]" />
              <h2 className="text-sm font-bold text-[#292824]">
                Notification Preferences
              </h2>
            </div>

            <p className="text-xs text-[#88847D]">
              Control when and how you receive alerts about inventory restocks.
              System defaults are configured in Global Settings.
            </p>

            <div className="space-y-4">
              {/* Email Alert Toggle */}
              <div className="flex items-start justify-between p-4 rounded-lg border border-[#E8E3DA] bg-[#F8F6F2]">
                <div className="space-y-0.5 pr-4">
                  <label
                    className="text-xs font-bold text-[#292824] block cursor-pointer"
                    htmlFor="email-alert-toggle"
                  >
                    Instant Low-Stock Email Alerts
                  </label>
                  <p className="text-[11px] text-[#88847D]">
                    Receive an immediate email notification when a product
                    crosses below its reorder threshold.
                  </p>
                </div>
                <input
                  id="email-alert-toggle"
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 text-[#795438] rounded border-[#DDD6CA] focus:ring-[#795438] mt-1 cursor-pointer"
                />
              </div>

              {/* Nightly Digest Toggle */}
              <div className="flex items-start justify-between p-4 rounded-lg border border-[#E8E3DA] bg-[#F8F6F2]">
                <div className="space-y-0.5 pr-4">
                  <label
                    className="text-xs font-bold text-[#292824] block cursor-pointer"
                    htmlFor="digest-toggle"
                  >
                    Daily Low-Stock Summary Digest
                  </label>
                  <p className="text-[11px] text-[#88847D]">
                    Receive a single daily summary email of all items requiring
                    restock, scheduled at your organization&apos;s digest time.
                  </p>
                </div>
                <input
                  id="digest-toggle"
                  type="checkbox"
                  checked={digest}
                  onChange={(e) => setDigest(e.target.checked)}
                  className="w-4 h-4 text-[#795438] rounded border-[#DDD6CA] focus:ring-[#795438] mt-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#E8E3DA]">
              <Button
                type="submit"
                variant="primary"
                isLoading={updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save Preferences
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
