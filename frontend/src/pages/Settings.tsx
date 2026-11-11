import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Settings as SettingsIcon,
  Save,
  Building,
  DollarSign,
  Calendar,
  AlertCircle,
  Upload,
} from "lucide-react";
import { settingsApi } from "../api/settings";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";

const settingsSchema = z.object({
  business_name: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100),
  currency_code: z
    .string()
    .min(2, "Currency code must be at least 2 characters")
    .max(10),
  currency_symbol: z.string().min(1, "Currency symbol is required").max(10),
  tax_rate: z
    .number()
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%"),
  default_reorder_level: z
    .number()
    .int()
    .min(0, "Reorder level cannot be negative"),
  invoice_prefix: z.string().min(1, "Invoice prefix is required").max(20),
  date_format: z.string().min(2, "Date format is required").max(20),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export const Settings: React.FC = () => {
  const { updateSettings, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const canManage = hasPermission("settings.manage");

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    if (data?.data) {
      reset({
        business_name: data.data.business_name,
        currency_code: data.data.currency_code,
        currency_symbol: data.data.currency_symbol,
        tax_rate: Number(data.data.tax_rate),
        default_reorder_level: Number(data.data.default_reorder_level),
        invoice_prefix: data.data.invoice_prefix,
        date_format: data.data.date_format,
      });
      if (data.data.business_logo_url) {
        setLogoPreview(data.data.business_logo_url);
      }
    }
  }, [data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SettingsFormData) => {
      // If a new logo file was selected, upload it first
      if (logoFile) {
        await settingsApi.uploadLogo(logoFile);
      }
      return settingsApi.update(payload);
    },
    onSuccess: (res) => {
      updateSettings(res.data);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setLogoFile(null);
      addToast({
        title: "Settings Saved",
        message: "Application configuration and defaults have been updated.",
        type: "success",
      });
    },
    onError: (err: any) => {
      addToast({
        title: "Save Failed",
        message:
          err.response?.data?.message || "Failed to update system settings.",
        type: "error",
      });
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        addToast({
          title: "File Too Large",
          message: "Logo must be smaller than 2MB.",
          type: "warning",
        });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = (formData: SettingsFormData) => {
    saveMutation.mutate(formData);
  };

  if (!canManage) {
    return (
      <div className="p-8 bg-white border border-[#E8E3DA] rounded-[10px] text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-[#A58B6F] mx-auto mb-2" />
        <h3 className="text-sm font-bold text-[#292824]">Access Restricted</h3>
        <p className="text-xs text-[#88847D] mt-1">
          You do not have permission to modify system configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between border-b border-[#E8E3DA] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#292824]">System Settings</h1>
          <p className="text-xs text-[#88847D] mt-0.5">
            Manage organization branding, localization, currency formatting, and
            default thresholds.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#88847D] bg-white border border-[#E8E3DA] rounded-[10px]">
          Loading settings...
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Organization & Branding */}
          <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E8E3DA] pb-3">
              <Building className="w-4 h-4 text-[#795438]" />
              <h2 className="text-sm font-bold text-[#292824]">
                Organization & Branding
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs font-semibold text-[#292824] mb-1">
                  Business Name *
                </label>
                <Input
                  {...register("business_name")}
                  placeholder="e.g. Maison Decor Studio"
                  error={errors.business_name?.message}
                />
                <p className="text-[11px] text-[#88847D] mt-1">
                  Shown in page header, sidebar brand, and exported documents.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292824] mb-1">
                  Business Logo
                </label>
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-12 h-12 rounded-lg object-contain border border-[#E8E3DA] bg-[#F8F6F2] p-1"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#F8F6F2] border border-[#E8E3DA] flex items-center justify-center text-xs font-bold text-[#88847D]">
                      LOGO
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#795438] bg-[#F3EDE6] border border-[#DFD2C5] rounded-lg hover:bg-[#EAE1D6] transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{logoPreview ? "Change Logo" : "Upload Logo"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-[#88847D] mt-1">
                      PNG, JPG, or WebP up to 2MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Localization & Currency */}
          <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E8E3DA] pb-3">
              <DollarSign className="w-4 h-4 text-[#795438]" />
              <h2 className="text-sm font-bold text-[#292824]">
                Currency & Pricing
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#292824] mb-1">
                  Currency Symbol *
                </label>
                <Input
                  {...register("currency_symbol")}
                  placeholder="e.g. $, Rp, €, £"
                  error={errors.currency_symbol?.message}
                />
                <p className="text-[11px] text-[#88847D] mt-1">
                  Pre-pended to prices across tables and cards.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292824] mb-1">
                  Currency Code *
                </label>
                <Input
                  {...register("currency_code")}
                  placeholder="e.g. USD, EUR, IDR"
                  error={errors.currency_code?.message}
                />
                <p className="text-[11px] text-[#88847D] mt-1">ISO 4217 code</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292824] mb-1">
                  Tax Rate (%) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("tax_rate", { valueAsNumber: true })}
                  placeholder="e.g. 10"
                  error={errors.tax_rate?.message}
                />
                <p className="text-[11px] text-[#88847D] mt-1">
                  Default percentage
                </p>
              </div>
            </div>
          </div>

          {/* Inventory & Operational Defaults */}
          <div className="bg-white border border-[#E8E3DA] rounded-[10px] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E8E3DA] pb-3">
              <Calendar className="w-4 h-4 text-[#795438]" />
              <h2 className="text-sm font-bold text-[#292824]">
                Operational Defaults
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#292824] mb-1">
                  Default Reorder Level *
                </label>
                <Input
                  type="number"
                  {...register("default_reorder_level", {
                    valueAsNumber: true,
                  })}
                  placeholder="e.g. 10"
                  error={errors.default_reorder_level?.message}
                />
                <p className="text-[11px] text-[#88847D] mt-1">
                  Pre-filled when creating new products
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292824] mb-1">
                  Invoice Prefix *
                </label>
                <Input
                  {...register("invoice_prefix")}
                  placeholder="e.g. MDS"
                  error={errors.invoice_prefix?.message}
                />
                <p className="text-[11px] text-[#88847D] mt-1">
                  Prefix for sales receipts
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292824] mb-1">
                  Date Format *
                </label>
                <Select
                  {...register("date_format")}
                  error={errors.date_format?.message}
                  options={[
                    { label: "YYYY-MM-DD (2026-10-31)", value: "YYYY-MM-DD" },
                    { label: "DD/MM/YYYY (31/10/2026)", value: "DD/MM/YYYY" },
                    { label: "MM/DD/YYYY (10/31/2026)", value: "MM/DD/YYYY" },
                  ]}
                />
                <p className="text-[11px] text-[#88847D] mt-1">
                  Standard display format
                </p>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || saveMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              <span>
                {saveMutation.isPending
                  ? "Saving Settings..."
                  : "Save Settings"}
              </span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
