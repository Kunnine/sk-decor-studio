import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supplierApi, SupplierPayload } from "../api/suppliers";
import { Supplier } from "../types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Badge } from "../components/ui/Badge";

const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required").max(255),
  phone: z.string().max(50).optional().nullable(),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal(""))
    .nullable(),
  address: z.string().max(500).optional().nullable(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export const Suppliers: React.FC = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole(["admin", "manager"]);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", page, search],
    queryFn: () =>
      supplierApi.list({ page, per_page: 10, search: search || undefined }),
  });

  const suppliers = data?.data || [];
  const meta = data?.meta;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: SupplierPayload) => {
      if (editingSupplier) {
        return supplierApi.update(editingSupplier.id, payload);
      }
      return supplierApi.create(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      addToast({
        title: editingSupplier ? "Supplier Updated" : "Supplier Created",
        message: res.message,
        type: "success",
      });
      closeModal();
    },
    onError: (err: any) => {
      addToast({
        title: "Save Failed",
        message:
          err.response?.data?.message || "Failed to save supplier details.",
        type: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplierApi.delete(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      addToast({
        title: "Supplier Deleted",
        message: res.message,
        type: "success",
      });
      setDeletingSupplier(null);
    },
    onError: (err: any) => {
      addToast({
        title: "Delete Failed",
        message: err.response?.data?.message || "Could not delete supplier.",
        type: "error",
      });
      setDeletingSupplier(null);
    },
  });

  const openCreateModal = () => {
    setEditingSupplier(null);
    reset({
      name: "",
      phone: "",
      email: "",
      address: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    reset({
      name: sup.name,
      phone: sup.phone || "",
      email: sup.email || "",
      address: sup.address || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    reset();
  };

  const onFormSubmit = (formData: SupplierFormData) => {
    saveMutation.mutate({
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#292824] tracking-tight">
            Suppliers
          </h2>
          <p className="text-xs text-[#88847D] mt-0.5">
            Manage vendor profiles, contact details, and procurement partners
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Supplier
          </Button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-[#E8E3DA]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#A58B6F] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search suppliers by name, phone, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF8F4] border border-[#E8E3DA] rounded-lg text-[#292824] placeholder-[#88847D] focus:outline-none focus:ring-1 focus:ring-[#795438] focus:bg-white"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-lg border border-[#E8E3DA] overflow-hidden shadow-none">
        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : suppliers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No suppliers found"
              description={
                search
                  ? "No suppliers matched your search query."
                  : "Add your first supplier to begin creating purchase orders."
              }
              actionLabel={canManage && !search ? "Add Supplier" : undefined}
              onAction={openCreateModal}
              icon={<Truck className="w-8 h-8 text-[#A58B6F]" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#292824]">
              <thead className="bg-[#FAF8F4] border-b border-[#E8E3DA] text-[#88847D] uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-center">Purchases</th>
                  {canManage && (
                    <th className="py-3 px-4 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE4]">
                {suppliers.map((sup) => (
                  <tr
                    key={sup.id}
                    className="hover:bg-[#FAF8F4]/70 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-[#292824]">
                      {sup.name}
                    </td>
                    <td className="py-3 px-4 text-[#88847D]">
                      {sup.phone ? (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-[#A58B6F]" />
                          {sup.phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#88847D]">
                      {sup.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#A58B6F]" />
                          {sup.email}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#88847D] max-w-xs truncate">
                      {sup.address || "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold font-mono text-[#292824]">
                        {sup.purchases_count ?? 0}
                      </span>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(sup)}
                            className="p-1.5 text-[#88847D] hover:text-[#795438] rounded hover:bg-[#F3EDE6] transition-colors"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingSupplier(sup)}
                            className="p-1.5 text-[#88847D] hover:text-[#292824] rounded hover:bg-[#F3EDE6] transition-colors"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="border-t border-[#E8E3DA] px-4 py-3 flex items-center justify-between bg-[#FAF8F4] text-xs text-[#88847D]">
            <div>
              Showing <span className="font-semibold text-[#292824]">{meta.from || 0}</span> to{" "}
              <span className="font-semibold text-[#292824]">{meta.to || 0}</span> of{" "}
              <span className="font-semibold text-[#292824]">{meta.total}</span> suppliers
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={meta.current_page <= 1}
                onClick={() => setPage(meta.current_page - 1)}
                className="p-1.5 rounded border border-[#DDD6CA] bg-white text-[#292824] hover:bg-[#F3EDE6] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-[#292824]">
                Page {meta.current_page} of {meta.last_page}
              </span>
              <button
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage(meta.current_page + 1)}
                className="p-1.5 rounded border border-[#DDD6CA] bg-white text-[#292824] hover:bg-[#F3EDE6] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
        description="Vendor details for purchase orders and inventory replenishments."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit(onFormSubmit)}
              isLoading={saveMutation.isPending}
            >
              {editingSupplier ? "Save Changes" : "Create Supplier"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <Input
            label="Company / Vendor Name"
            placeholder="e.g. Lumiere Artisanal Lighting"
            required
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Phone"
              placeholder="+1-555-0100"
              error={errors.phone?.message}
              {...register("phone")}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="orders@vendor.test"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#292824] mb-1.5">
              Physical / Billing Address
            </label>
            <textarea
              rows={3}
              placeholder="Street address, city, state, postal code..."
              className="w-full px-3 py-2 text-sm bg-white text-[#292824] border border-[#DDD6CA] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438]"
              {...register("address")}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingSupplier)}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={() =>
          deletingSupplier && deleteMutation.mutate(deletingSupplier.id)
        }
        title="Delete Supplier"
        message={`Are you sure you want to soft-delete supplier "${deletingSupplier?.name}"? Historical purchases and inventory movements will be permanently preserved.`}
        confirmLabel="Delete Supplier"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
