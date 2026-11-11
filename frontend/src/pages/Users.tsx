import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users as UsersIcon,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { userApi } from "../api/users";
import { Role, User } from "../types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TableSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Badge } from "../components/ui/Badge";

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().optional(),
  role: z.enum(["admin", "manager", "cashier"]),
  is_active: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export const Users: React.FC = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = hasPermission("users.manage");

  // URL state synchronization
  const search = searchParams.get("search") || "";
  const roleFilter = searchParams.get("role") || "";
  const statusFilter = searchParams.get("is_active") || "";
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

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [togglingUser, setTogglingUser] = useState<User | null>(null);

  // Query users
  const { data, isLoading } = useQuery({
    queryKey: [
      "users",
      {
        page,
        search,
        role: roleFilter,
        is_active: statusFilter,
        per_page: perPage,
      },
    ],
    queryFn: () =>
      userApi.list({
        page,
        search: search || undefined,
        role: roleFilter || undefined,
        is_active: statusFilter !== "" ? statusFilter : undefined,
        per_page: perPage,
      }),
  });

  const users = data?.data || [];
  const meta = data?.meta;

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const openCreateModal = () => {
    setEditingUser(null);
    reset({
      name: "",
      email: "",
      password: "",
      role: "cashier",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    reset({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      is_active: u.is_active,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    reset();
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: UserFormData) => {
      if (editingUser) {
        return userApi.update(editingUser.id, payload);
      }
      return userApi.create(payload as any);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      addToast({
        title: editingUser ? "User Updated" : "User Created",
        message: res.message,
        type: "success",
      });
      closeModal();
    },
    onError: (err: any) => {
      addToast({
        title: "Error Saving User",
        message: err.response?.data?.message || "Failed to save user.",
        type: "error",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => userApi.toggleActive(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      addToast({
        title: "Status Updated",
        message: res.message,
        type: "success",
      });
      setTogglingUser(null);
    },
    onError: (err: any) => {
      addToast({
        title: "Action Prevented",
        message: err.response?.data?.message || "Failed to toggle status.",
        type: "warning",
      });
      setTogglingUser(null);
    },
  });

  const onSubmit = (formData: UserFormData) => {
    if (!editingUser && (!formData.password || formData.password.length < 8)) {
      addToast({
        title: "Validation Error",
        message: "Password is required and must be at least 8 characters.",
        type: "error",
      });
      return;
    }
    saveMutation.mutate(formData);
  };

  if (!canManage) {
    return (
      <div className="p-8 bg-white border border-[#E8E3DA] rounded-lg text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-[#A58B6F] mx-auto mb-2" />
        <h3 className="text-sm font-bold text-[#292824]">Access Restricted</h3>
        <p className="text-xs text-[#88847D] mt-1">
          Only administrators have access to user accounts and permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E3DA] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#292824]">User Management</h1>
          <p className="text-xs text-[#88847D] mt-0.5">
            Administer staff accounts, roles (Admin, Manager, Cashier), and
            account active status.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreateModal}
          className="gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add User</span>
        </Button>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-[#E8E3DA] rounded-lg p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#A58B6F] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) =>
                updateFilters({ search: e.target.value, page: "1" })
              }
              placeholder="Search by name or email..."
              className="pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select
              value={roleFilter}
              onChange={(e) =>
                updateFilters({ role: e.target.value, page: "1" })
              }
              className="text-xs w-full sm:w-36"
              options={[
                { label: "All Roles", value: "" },
                { label: "Admin", value: "admin" },
                { label: "Manager", value: "manager" },
                { label: "Cashier", value: "cashier" },
              ]}
            />

            <Select
              value={statusFilter}
              onChange={(e) =>
                updateFilters({ is_active: e.target.value, page: "1" })
              }
              className="text-xs w-full sm:w-36"
              options={[
                { label: "All Statuses", value: "" },
                { label: "Active", value: "1" },
                { label: "Deactivated", value: "0" },
              ]}
            />
          </div>
        </div>

        {(search || roleFilter || statusFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              updateFilters({
                search: null,
                role: null,
                is_active: null,
                page: "1",
              })
            }
            className="text-xs text-[#88847D] self-end md:self-auto"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E3DA] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} columns={5} />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="w-8 h-8 text-[#A58B6F]" />}
            title="No users found"
            description={
              search || roleFilter || statusFilter
                ? "No staff members match the selected filters."
                : "Get started by creating your first staff user."
            }
            actionLabel="Create User"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F4] border-b border-[#E8E3DA] text-[#88847D] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE4]">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-[#FAF8F4]/70 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#292824] flex items-center gap-2">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="text-[10px] font-bold text-[#795438] bg-[#F3EDE6] border border-[#DDD6CA] px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#88847D]">
                          {u.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={u.role === "admin" ? "primary" : "neutral"}
                          size="sm"
                          className="capitalize font-semibold text-[11px]"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            u.is_active
                              ? "text-[#292824] font-bold"
                              : "text-[#88847D]"
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#795438]" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-[#A58B6F]" />
                              <span>Deactivated</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#88847D]">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle Active status */}
                          <button
                            onClick={() => setTogglingUser(u)}
                            disabled={isSelf}
                            className={`p-1.5 rounded transition-colors ${
                              isSelf
                                ? "opacity-30 cursor-not-allowed text-[#88847D]"
                                : "text-[#88847D] hover:text-[#292824] hover:bg-[#F3EDE6]"
                            }`}
                            title={
                              isSelf
                                ? "Cannot deactivate self"
                                : u.is_active
                                  ? "Deactivate account"
                                  : "Activate account"
                            }
                          >
                            {u.is_active ? (
                              <ToggleRight className="w-4 h-4 text-[#795438]" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-[#A58B6F]" />
                            )}
                          </button>

                          {/* Edit user */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded text-[#88847D] hover:text-[#795438] hover:bg-[#F3EDE6] transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
          <div className="p-3 border-t border-[#E8E3DA] bg-[#FAF8F4] flex items-center justify-between text-xs text-[#88847D]">
            <div>
              Showing{" "}
              <span className="font-semibold text-[#292824]">{meta.from}</span>{" "}
              to <span className="font-semibold text-[#292824]">{meta.to}</span>{" "}
              of{" "}
              <span className="font-semibold text-[#292824]">{meta.total}</span>{" "}
              users
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
              <span className="px-2 font-medium text-[#292824]">
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
        title={
          editingUser ? `Edit User: ${editingUser.name}` : "Create New User"
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#292824] mb-1">
              Full Name *
            </label>
            <Input
              {...register("name")}
              placeholder="e.g. Sarah Jenkins"
              error={errors.name?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292824] mb-1">
              Email Address *
            </label>
            <Input
              type="email"
              {...register("email")}
              placeholder="e.g. s.jenkins@example.com"
              error={errors.email?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292824] mb-1">
              {editingUser
                ? "Password (leave blank to keep current)"
                : "Password *"}
            </label>
            <Input
              type="password"
              {...register("password")}
              placeholder={editingUser ? "••••••••" : "Minimum 8 characters"}
              error={errors.password?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#292824] mb-1">
              Role *
            </label>
            <Select
              {...register("role")}
              error={errors.role?.message}
              options={[
                {
                  label: "Admin (Full access to all system modules & settings)",
                  value: "admin",
                },
                {
                  label:
                    "Manager (Products, categories, and inventory management)",
                  value: "manager",
                },
                {
                  label: "Cashier (View catalog & process sales)",
                  value: "cashier",
                },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_checkbox"
              {...register("is_active")}
              className="rounded border-[#DDD6CA] accent-[#795438] text-[#795438] focus:ring-[#795438]"
            />
            <label
              htmlFor="is_active_checkbox"
              className="text-xs font-medium text-[#292824]"
            >
              Account is active (allows user to sign in)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#F0ECE4]">
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
                : editingUser
                  ? "Save Changes"
                  : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toggle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!togglingUser}
        title={
          togglingUser?.is_active
            ? "Deactivate User Account"
            : "Activate User Account"
        }
        message={
          togglingUser?.is_active
            ? `Are you sure you want to deactivate ${togglingUser.name}'s account? They will no longer be able to log in until reactivated.`
            : `Are you sure you want to reactivate ${togglingUser?.name}'s account?`
        }
        confirmLabel={togglingUser?.is_active ? "Deactivate" : "Activate"}
        isLoading={toggleMutation.isPending}
        onConfirm={() => togglingUser && toggleMutation.mutate(togglingUser.id)}
        onClose={() => setTogglingUser(null)}
      />
    </div>
  );
};
