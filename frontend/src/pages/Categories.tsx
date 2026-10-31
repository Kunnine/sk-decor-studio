import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  FolderTree,
  ChevronRight,
  ChevronDown,
  ArrowRightLeft,
  Folder,
  FolderPlus,
  Package,
  List,
} from "lucide-react";
import { categoryApi, CategoryPayload } from "../api/categories";
import { Category } from "../types";
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

const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(100),
  parent_id: z.number().nullable().optional(),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export const Categories: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = hasPermission("categories.manage");

  // URL state synchronization
  const viewMode = searchParams.get("view") || "tree"; // 'tree' | 'flat'
  const search = searchParams.get("search") || "";

  const setViewMode = (mode: "tree" | "flat") => {
    const next = new URLSearchParams(searchParams);
    next.set("view", mode);
    setSearchParams(next);
  };

  const setSearchTerm = (term: string) => {
    const next = new URLSearchParams(searchParams);
    if (term) {
      next.set("search", term);
    } else {
      next.delete("search");
    }
    setSearchParams(next);
  };

  // State for modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [movingCategory, setMovingCategory] = useState<Category | null>(null);
  const [targetParentId, setTargetParentId] = useState<string>("root");

  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );

  // Expanded nodes for tree view
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>(
    {},
  );

  const toggleNode = (id: number) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Query flat list for dropdowns & flat view
  const { data: flatData, isLoading: loadingFlat } = useQuery({
    queryKey: ["categories-flat", search],
    queryFn: () => categoryApi.list({ search: search || undefined, all: true }),
  });

  // Query hierarchical tree
  const { data: treeData, isLoading: loadingTree } = useQuery({
    queryKey: ["categories-tree"],
    queryFn: () => categoryApi.tree(),
  });

  const allCategories: Category[] = (flatData as any)?.data || [];
  const treeCategories: Category[] = (treeData as any)?.data || [];

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const openCreateModal = (parentId: number | null = null) => {
    setEditingCategory(null);
    reset({
      name: "",
      parent_id: parentId,
      description: "",
      sort_order: 0,
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    reset({
      name: cat.name,
      parent_id: cat.parent_id ?? null,
      description: cat.description || "",
      sort_order: cat.sort_order ?? 0,
    });
    setIsFormModalOpen(true);
  };

  const openMoveModal = (cat: Category) => {
    setMovingCategory(cat);
    setTargetParentId(cat.parent_id ? String(cat.parent_id) : "root");
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingCategory(null);
    reset();
  };

  // Mutations
  const invalidateCategoryQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["categories-flat"] });
    queryClient.invalidateQueries({ queryKey: ["categories-tree"] });
    queryClient.invalidateQueries({ queryKey: ["categories-all"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-categories"] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: CategoryPayload) => {
      if (editingCategory) {
        return categoryApi.update(editingCategory.id, payload);
      }
      return categoryApi.create(payload);
    },
    onSuccess: (res) => {
      invalidateCategoryQueries();
      addToast({
        title: editingCategory ? "Category Updated" : "Category Created",
        message: res.message,
        type: "success",
      });
      closeFormModal();
    },
    onError: (err: any) => {
      addToast({
        title: "Error Saving Category",
        message: err.response?.data?.message || "Failed to save category.",
        type: "error",
      });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, parentId }: { id: number; parentId: number | null }) =>
      categoryApi.move(id, parentId),
    onSuccess: (res) => {
      invalidateCategoryQueries();
      addToast({
        title: "Category Moved",
        message: res.message,
        type: "success",
      });
      setMovingCategory(null);
    },
    onError: (err: any) => {
      addToast({
        title: "Move Prevented",
        message:
          err.response?.data?.message ||
          "Cannot move category to specified parent.",
        type: "warning",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoryApi.delete(id),
    onSuccess: (res) => {
      invalidateCategoryQueries();
      addToast({
        title: "Category Deleted",
        message: res.message,
        type: "success",
      });
      setDeletingCategory(null);
    },
    onError: (err: any) => {
      addToast({
        title: "Delete Prevented",
        message:
          err.response?.data?.message ||
          "Category still contains products or child categories.",
        type: "warning",
      });
      setDeletingCategory(null);
    },
  });

  const onSaveSubmit = (formData: CategoryFormData) => {
    const parent =
      formData.parent_id !== null &&
      formData.parent_id !== undefined &&
      !isNaN(formData.parent_id)
        ? formData.parent_id
        : null;
    saveMutation.mutate({
      name: formData.name,
      parent_id: parent,
      description: formData.description,
      sort_order: formData.sort_order,
    });
  };

  const onMoveSubmit = () => {
    if (!movingCategory) return;
    const parent = targetParentId === "root" ? null : Number(targetParentId);
    moveMutation.mutate({ id: movingCategory.id, parentId: parent });
  };

  // Helper to build descendant ID set to prevent circular hierarchy in selectors
  const getDescendantIds = (catId: number): number[] => {
    const descendants: number[] = [catId];
    const queue = [catId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      allCategories.forEach((c) => {
        if (c.parent_id === current && !descendants.includes(c.id)) {
          descendants.push(c.id);
          queue.push(c.id);
        }
      });
    }
    return descendants;
  };

  // Render tree node
  const renderTreeNode = (node: Category, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id] ?? true; // default expanded
    const productCount = node.products_count ?? 0;
    const canDelete =
      productCount === 0 && (!node.children || node.children.length === 0);

    return (
      <div key={node.id} className="text-xs">
        <div
          className={`group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors ${
            depth > 0 ? "ml-6 border-l-2 border-slate-200 pl-3" : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(node.id)}
                className="p-1 rounded hover:bg-slate-200 text-slate-500"
                aria-label="Toggle node"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}

            <Folder className="w-4 h-4 text-indigo-700 shrink-0" />

            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-900 truncate">
                {node.name}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                /{node.slug}
              </span>
              <Badge
                variant="neutral"
                size="sm"
                className="text-[10px] py-0 px-1.5"
              >
                {productCount} {productCount === 1 ? "product" : "products"}
              </Badge>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openCreateModal(node.id)}
                className="p-1 rounded text-slate-500 hover:text-indigo-700 hover:bg-slate-100"
                title="Add child category"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openMoveModal(node)}
                className="p-1 rounded text-slate-500 hover:text-indigo-700 hover:bg-slate-100"
                title="Move category"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openEditModal(node)}
                className="p-1 rounded text-slate-500 hover:text-indigo-700 hover:bg-slate-100"
                title="Edit category"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeletingCategory(node)}
                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                title={
                  canDelete
                    ? "Delete category"
                    : "Cannot delete category with products or children"
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Product Categories
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize products in nested hierarchical categories with cycle
            prevention and integrity guards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("tree")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                viewMode === "tree"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Tree View</span>
            </button>
            <button
              onClick={() => setViewMode("flat")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                viewMode === "flat"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openCreateModal(null)}
              className="gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Root Category</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories..."
            className="pl-9 text-xs"
          />
        </div>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="text-xs text-slate-500"
          >
            Clear Search
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === "tree" ? (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          {loadingTree ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading category hierarchy...
            </div>
          ) : treeCategories.length === 0 ? (
            <EmptyState
              icon={<FolderTree className="w-8 h-8 text-slate-500" />}
              title="No categories defined"
              description="Create root categories to structure your product catalog."
              actionLabel={canManage ? "Create Category" : undefined}
              onAction={canManage ? () => openCreateModal(null) : undefined}
            />
          ) : (
            <div className="space-y-1">
              {treeCategories.map((rootNode) => renderTreeNode(rootNode, 0))}
            </div>
          )}
        </div>
      ) : (
        /* Flat Table View */
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loadingFlat ? (
            <div className="p-4">
              <TableSkeleton rows={5} columns={5} />
            </div>
          ) : allCategories.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-8 h-8 text-slate-500" />}
              title="No categories found"
              description={
                search
                  ? `No results matching "${search}"`
                  : "Get started by creating a category."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Slug</th>
                    <th className="py-3 px-4">Parent Category</th>
                    <th className="py-3 px-4">Products</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allCategories.map((cat) => {
                    const productCount = cat.products_count ?? 0;
                    return (
                      <tr
                        key={cat.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          <Folder className="w-3.5 h-3.5 text-indigo-700" />
                          <span>{cat.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {cat.slug}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {cat.parent ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">
                              {cat.parent.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">
                              None (Root)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span>{productCount}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canManage && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openCreateModal(cat.id)}
                                className="p-1.5 rounded text-slate-500 hover:text-indigo-700 hover:bg-slate-100"
                                title="Add child"
                              >
                                <FolderPlus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openMoveModal(cat)}
                                className="p-1.5 rounded text-slate-500 hover:text-indigo-700 hover:bg-slate-100"
                                title="Move"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditModal(cat)}
                                className="p-1.5 rounded text-slate-500 hover:text-indigo-700 hover:bg-slate-100"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingCategory(cat)}
                                className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Category Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        title={
          editingCategory
            ? `Edit Category: ${editingCategory.name}`
            : "Create Category"
        }
      >
        <form onSubmit={handleSubmit(onSaveSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Name *
            </label>
            <Input
              {...register("name")}
              placeholder="e.g. Computers & Laptops"
              error={errors.name?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parent Category
            </label>
            <Select
              {...register("parent_id", {
                setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
              })}
              options={[
                { label: "(None - Top Level Category)", value: "" },
                ...allCategories
                  .filter(
                    (c) =>
                      !editingCategory ||
                      !getDescendantIds(editingCategory.id).includes(c.id),
                  )
                  .map((c) => ({
                    label: c.name,
                    value: String(c.id),
                  })),
              ]}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Selecting a parent creates a subcategory. Cycles are automatically
              prevented.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Provide a brief summary of items categorized here..."
              className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-[#4338CA] focus:border-[#4338CA] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeFormModal}
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
                : editingCategory
                  ? "Save Changes"
                  : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Move Category Modal */}
      <Modal
        isOpen={!!movingCategory}
        onClose={() => setMovingCategory(null)}
        title={`Move Category: ${movingCategory?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Relocate{" "}
            <span className="font-semibold text-slate-900">
              {movingCategory?.name}
            </span>{" "}
            and all of its subcategories under a new parent or promote it to a
            top-level root category.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Parent
            </label>
            <Select
              value={targetParentId}
              onChange={(e) => setTargetParentId(e.target.value)}
              options={[
                { label: "(None - Promote to Top Level)", value: "root" },
                ...allCategories
                  .filter(
                    (c) =>
                      !movingCategory ||
                      !getDescendantIds(movingCategory.id).includes(c.id),
                  )
                  .map((c) => ({
                    label: c.name,
                    value: String(c.id),
                  })),
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMovingCategory(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={moveMutation.isPending}
              onClick={onMoveSubmit}
            >
              {moveMutation.isPending ? "Moving..." : "Confirm Move"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingCategory}
        title="Delete Category"
        message={
          deletingCategory &&
          ((deletingCategory.products_count ?? 0) > 0 ||
            (deletingCategory.children_count ?? 0) > 0)
            ? `Cannot delete "${deletingCategory.name}" because it still contains ${
                deletingCategory.products_count ?? 0
              } product(s) or child subcategories. Please reassign or delete them first.`
            : `Are you sure you want to delete category "${deletingCategory?.name}"? This action cannot be undone.`
        }
        confirmLabel="Delete Category"
        isLoading={deleteMutation.isPending}
        onConfirm={() =>
          deletingCategory && deleteMutation.mutate(deletingCategory.id)
        }
        onClose={() => setDeletingCategory(null)}
      />
    </div>
  );
};
