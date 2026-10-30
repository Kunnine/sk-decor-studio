import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  FolderTree,
  AlertCircle,
} from 'lucide-react';
import { categoryApi, CategoryPayload } from '../api/categories';
import { Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().max(500).optional().nullable(),
  parent_id: z.union([z.number(), z.string()]).optional().nullable(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export const Categories: React.FC = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole(['admin', 'manager']);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Fetch categories
  const { data, isLoading } = useQuery({
    queryKey: ['categories', search],
    queryFn: () => categoryApi.list({ search: search || undefined, all: true }),
  });

  const categories = data?.data || [];

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: (payload: CategoryPayload) => {
      if (editingCategory) {
        return categoryApi.update(editingCategory.id, payload);
      }
      return categoryApi.create(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast({
        title: editingCategory ? 'Category Updated' : 'Category Created',
        message: res.message,
        type: 'success',
      });
      closeModal();
    },
    onError: (err: any) => {
      addToast({
        title: 'Error Saving Category',
        message: err.response?.data?.message || 'Failed to save category.',
        type: 'error',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoryApi.delete(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast({
        title: 'Category Deleted',
        message: res.message,
        type: 'success',
      });
      setDeletingCategory(null);
    },
    onError: (err: any) => {
      addToast({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Could not delete category.',
        type: 'warning',
      });
      setDeletingCategory(null);
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    reset({
      name: '',
      description: '',
      parent_id: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    reset({
      name: cat.name,
      description: cat.description || '',
      parent_id: cat.parent_id || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    reset();
  };

  const onFormSubmit = (formData: CategoryFormData) => {
    const parentId =
      formData.parent_id === '' || formData.parent_id === null || formData.parent_id === undefined
        ? null
        : Number(formData.parent_id);

    saveMutation.mutate({
      name: formData.name,
      description: formData.description || null,
      parent_id: parentId,
    });
  };

  // Eligible parent options (cannot be self when editing)
  const parentOptions = categories
    .filter((c) => !editingCategory || c.id !== editingCategory.id)
    .map((c) => ({
      label: c.parent ? `${c.parent.name} > ${c.name}` : c.name,
      value: c.id,
    }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Categories</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize products into hierarchical departments and groups
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Category
          </Button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:bg-white"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-none">
        {isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : categories.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No categories found"
              description={search ? 'No categories matched your search term.' : 'Get started by creating your first category.'}
              actionLabel={canManage && !search ? 'Add Category' : undefined}
              onAction={openCreateModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Parent Group</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Products</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {cat.parent ? (
                        <Badge variant="neutral" size="sm">
                          {cat.parent.name}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 italic">None (Root)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {cat.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-slate-900">
                        {cat.products_count ?? 0}
                      </span>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingCategory(cat)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                            title="Delete Category"
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
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        description="Categories group your inventory items for reporting and POS browsing."
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
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Wireless Peripherals"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <Select
            label="Parent Category (Optional)"
            placeholder="None (Root Level)"
            options={parentOptions}
            error={errors.parent_id?.message as string | undefined}
            {...register('parent_id')}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of the category..."
              className="w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:border-[#4338CA]"
              {...register('description')}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
        title="Delete Category"
        message={`Are you sure you want to delete category "${deletingCategory?.name}"? If products or child categories belong to this group, the operation will be prevented.`}
        confirmLabel="Delete Category"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
