import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Ruler,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { unitApi, UnitPayload } from "../api/units";
import { Unit, PaginatedResponse } from "../types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

const unitSchema = z.object({
  name: z.string().min(2, "Unit name must be at least 2 characters").max(50),
  short_name: z
    .string()
    .min(1, "Short symbol / abbreviation is required")
    .max(10),
});

type UnitFormData = z.infer<typeof unitSchema>;

export const Units: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = hasPermission("units.manage");

  // URL state synchronization
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = 10;

  const updateFilters = (newParams: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === "") {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    setSearchParams(next);
  };

  // State for modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);

  // Query units
  const { data, isLoading } = useQuery({
    queryKey: ["units", { page, search, per_page: perPage }],
    queryFn: () =>
      unitApi.list({ page, search: search || undefined, per_page: perPage }),
  });

  const paginatedData = data as PaginatedResponse<Unit> | undefined;
  const units = paginatedData?.data || [];
  const meta = paginatedData?.meta;

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
  });

  const openCreateModal = () => {
    setEditingUnit(null);
    reset({ name: "", short_name: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit);
    reset({ name: unit.name, short_name: unit.short_name });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUnit(null);
    reset();
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: UnitPayload) => {
      if (editingUnit) {
        return unitApi.update(editingUnit.id, payload);
      }
      return unitApi.create(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-units"] });
      addToast({
        title: editingUnit ? "Unit Updated" : "Unit Created",
        message: res.message,
        type: "success",
      });
      closeModal();
    },
    onError: (err: any) => {
      addToast({
        title: "Error Saving Unit",
        message: err.response?.data?.message || "Failed to save unit.",
        type: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => unitApi.delete(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-units"] });
      addToast({
        title: "Unit Deleted",
        message: res.message,
        type: "success",
      });
      setDeletingUnit(null);
    },
    onError: (err: any) => {
      addToast({
        title: "Delete Prevented",
        message:
          err.response?.data?.message ||
          "Cannot delete unit with associated products.",
        type: "warning",
      });
      setDeletingUnit(null);
    },
  });

  const onSubmit = (formData: UnitFormData) => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Units of Measure</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define units (piece, kg, box, meter) for inventory tracking and
            conversions.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            className="gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Unit</span>
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) =>
              updateFilters({ search: e.target.value, page: "1" })
            }
            placeholder="Search by unit name or abbreviation..."
            className="pl-9 text-xs"
          />
        </div>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateFilters({ search: null, page: "1" })}
            className="text-xs text-slate-500"
          >
            Clear Search
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} columns={4} />
          </div>
        ) : units.length === 0 ? (
          <EmptyState
            icon={<Ruler className="w-8 h-8 text-slate-500" />}
            title="No units found"
            description={
              search
                ? `No units match your search "${search}".`
                : "Get started by creating your first unit of measurement."
            }
            actionLabel={canManage ? "Create Unit" : undefined}
            onAction={canManage ? openCreateModal : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Unit Name</th>
                  <th className="py-3 px-4">Abbreviation</th>
                  <th className="py-3 px-4">Linked Products</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((unit) => {
                  const productCount = unit.products_count ?? 0;
                  return (
                    <tr
                      key={unit.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {unit.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {unit.short_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {productCount}{" "}
                            {productCount === 1 ? "product" : "products"}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(unit)}
                              className="p-1.5 rounded text-slate-600 hover:text-indigo-700 hover:bg-slate-100 transition-colors"
                              title="Edit Unit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingUnit(unit)}
                              className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="Delete Unit"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            Read-only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900">{meta.from}</span>{" "}
              to <span className="font-semibold text-slate-900">{meta.to}</span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">{meta.total}</span>{" "}
              units
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateFilters({ page: (page - 1).toString() })}
                className="p-1.5"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 font-medium">
                Page {meta.current_page} of {meta.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => updateFilters({ page: (page + 1).toString() })}
                className="p-1.5"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingUnit ? "Edit Unit of Measure" : "Create Unit of Measure"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Unit Name *
            </label>
            <Input
              {...register("name")}
              placeholder="e.g. Kilogram, Piece, Box, Meter"
              error={errors.name?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Abbreviation / Symbol *
            </label>
            <Input
              {...register("short_name")}
              placeholder="e.g. kg, pcs, box, m"
              error={errors.short_name?.message}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Short display code used in product tables and stock balances.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || saveMutation.isPending}
            >
              {saveMutation.isPending
                ? "Saving..."
                : editingUnit
                  ? "Save Changes"
                  : "Create Unit"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingUnit}
        title="Delete Unit of Measure"
        message={
          deletingUnit && (deletingUnit.products_count ?? 0) > 0
            ? `Cannot delete "${deletingUnit.name}" because it is currently assigned to ${deletingUnit.products_count} product(s). Please reassign those products first.`
            : `Are you sure you want to delete unit "${deletingUnit?.name}" (${deletingUnit?.short_name})? This action cannot be undone.`
        }
        confirmLabel="Delete Unit"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingUnit && deleteMutation.mutate(deletingUnit.id)}
        onClose={() => setDeletingUnit(null)}
      />
    </div>
  );
};
