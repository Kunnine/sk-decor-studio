import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  UploadCloud,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { productApi, ProductFilters, ProductPayload } from '../api/products';
import { categoryApi } from '../api/categories';
import { Product, CsvImportResult } from '../types';
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

const productSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(64),
  name: z.string().min(2, 'Product name is required').max(255),
  description: z.string().optional().nullable(),
  category_id: z.number().min(1, 'Please select a valid category'),
  cost_price: z.number().min(0, 'Cost price cannot be negative'),
  sell_price: z.number().min(0, 'Sell price cannot be negative'),
  stock_qty: z.number().int().min(0, 'Stock cannot be negative'),
  reorder_level: z.number().int().min(0, 'Reorder level cannot be negative'),
  is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

export const Products: React.FC = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole(['admin', 'manager']);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Filters state
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    per_page: 10,
    search: '',
    category_id: '',
    is_active: '',
    low_stock: false,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoryApi.list({ all: true }),
  });

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productApi.list(filters),
  });

  const products = data?.data || [];
  const meta = data?.meta;

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  // Save (Create / Update) Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: ProductPayload) => {
      if (editingProduct) {
        return productApi.update(editingProduct.id, payload);
      }
      return productApi.create(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast({
        title: editingProduct ? 'Product Updated' : 'Product Created',
        message: res.message,
        type: 'success',
      });
      closeFormModal();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to save product details.';
      addToast({
        title: 'Save Failed',
        message: msg,
        type: 'error',
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => productApi.delete(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast({
        title: 'Product Deleted',
        message: res.message,
        type: 'success',
      });
      setDeletingProduct(null);
    },
    onError: (err: any) => {
      addToast({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Could not delete product.',
        type: 'error',
      });
      setDeletingProduct(null);
    },
  });

  // Import Mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => productApi.importCsv(file),
    onSuccess: (res) => {
      setImportResult(res);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories-all'] });
      addToast({
        title: 'Import Completed',
        message: res.message,
        type: 'success',
      });
    },
    onError: (err: any) => {
      addToast({
        title: 'Import Failed',
        message: err.response?.data?.message || 'CSV processing failed.',
        type: 'error',
      });
    },
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    reset({
      sku: '',
      name: '',
      description: '',
      category_id: '' as any,
      cost_price: 0,
      sell_price: 0,
      stock_qty: 0,
      reorder_level: 10,
      is_active: true,
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    reset({
      sku: prod.sku,
      name: prod.name,
      description: prod.description || '',
      category_id: prod.category_id,
      cost_price: parseFloat(prod.cost_price),
      sell_price: parseFloat(prod.sell_price),
      stock_qty: prod.stock_qty,
      reorder_level: prod.reorder_level,
      is_active: prod.is_active,
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingProduct(null);
    reset();
  };

  const onFormSubmit = (formData: ProductFormData) => {
    saveMutation.mutate(formData);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await productApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'products_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      addToast({
        title: 'Download Failed',
        message: 'Unable to download template at this time.',
        type: 'error',
      });
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    importMutation.mutate(importFile);
  };

  const categoryOptions = (categoriesData?.data || []).map((cat) => ({
    label: cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name,
    value: cat.id,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Products</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage product inventory, pricing catalog, and reorder levels
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportFile(null);
                setImportResult(null);
                setIsImportModalOpen(true);
              }}
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              Import CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Product
            </Button>
          </div>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-200">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by SKU or name..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
            }
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:bg-white"
          />
        </div>

        {/* Category filter */}
        <select
          value={filters.category_id}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              category_id: e.target.value ? Number(e.target.value) : '',
              page: 1,
            }))
          }
          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:bg-white"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filters.is_active === '' ? '' : filters.is_active ? '1' : '0'}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              is_active: e.target.value === '' ? '' : e.target.value === '1',
              page: 1,
            }))
          }
          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:bg-white"
        >
          <option value="">All Statuses</option>
          <option value="1">Active Only</option>
          <option value="0">Inactive Only</option>
        </select>

        {/* Low Stock Toggle button (uses Accent Amber for warning indicator) */}
        <button
          type="button"
          onClick={() =>
            setFilters((prev) => ({ ...prev, low_stock: !prev.low_stock, page: 1 }))
          }
          className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            filters.low_stock
              ? 'bg-[#FEF3C7] border-amber-400 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${filters.low_stock ? 'text-[#F59E0B]' : 'text-slate-400'}`} />
          <span>Low Stock Only</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-none">
        {isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : products.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No products found"
              description={
                filters.search || filters.category_id || filters.low_stock
                  ? 'No products matched your active filters.'
                  : 'Start expanding your inventory catalog by adding your first product.'
              }
              actionLabel={canManage && !filters.search ? 'Add Product' : undefined}
              onAction={openCreateModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Sell Price</th>
                  <th className="py-3 px-4 text-center">Stock Level</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {products.map((prod) => {
                  const isLow = prod.is_low_stock;
                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isLow ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {prod.sku}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                        {prod.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {prod.category?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        ${prod.cost_price}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        ${prod.sell_price}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLow ? (
                          <Badge variant="warning" size="sm">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{prod.stock_qty} (Min: {prod.reorder_level})</span>
                          </Badge>
                        ) : (
                          <span className="font-semibold text-slate-900 font-mono">
                            {prod.stock_qty}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={prod.is_active ? 'neutral' : 'outline'}
                          size="sm"
                          className={prod.is_active ? 'font-semibold' : 'text-slate-400'}
                        >
                          {prod.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(prod)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingProduct(prod)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta && meta.last_page > 1 && (
          <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between bg-slate-50 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{meta.from || 0}</span> to{' '}
              <span className="font-semibold">{meta.to || 0}</span> of{' '}
              <span className="font-semibold">{meta.total}</span> products
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={meta.current_page <= 1}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))
                }
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Page {meta.current_page} of {meta.last_page}
              </span>
              <button
                disabled={meta.current_page >= meta.last_page}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))
                }
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        description="Configure item details, cost, retail pricing, and reorder levels."
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeFormModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit(onFormSubmit)}
              isLoading={saveMutation.isPending}
            >
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU / Barcode"
              placeholder="e.g. LAP-APP-MBP14"
              required
              error={errors.sku?.message}
              {...register('sku')}
            />

            <Select
              label="Category"
              placeholder="Select Category"
              required
              options={categoryOptions}
              error={errors.category_id?.message}
              {...register('category_id', { valueAsNumber: true })}
            />
          </div>

          <Input
            label="Product Name"
            placeholder="e.g. MacBook Pro 14 M3 Pro 18GB"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cost Price ($)"
              type="number"
              step="0.01"
              placeholder="0.00"
              required
              error={errors.cost_price?.message}
              {...register('cost_price', { valueAsNumber: true })}
            />

            <Input
              label="Retail Sell Price ($)"
              type="number"
              step="0.01"
              placeholder="0.00"
              required
              error={errors.sell_price?.message}
              {...register('sell_price', { valueAsNumber: true })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Initial Stock Qty"
              type="number"
              placeholder="0"
              error={errors.stock_qty?.message}
              {...register('stock_qty', { valueAsNumber: true })}
            />

            <Input
              label="Reorder Alert Level"
              type="number"
              placeholder="10"
              helperText="Alerts when stock drops at or below this amount."
              error={errors.reorder_level?.message}
              {...register('reorder_level', { valueAsNumber: true })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Detailed specifications or notes..."
              className="w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:border-[#4338CA]"
              {...register('description')}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active"
              className="rounded border-slate-300 text-[#4338CA] focus:ring-[#4338CA]"
              {...register('is_active')}
            />
            <label htmlFor="is_active" className="text-xs font-semibold text-slate-800">
              Active in POS and Sales catalog
            </label>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Products via CSV"
        description="Upload a CSV spreadsheet to bulk import or update products."
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(false)}
            >
              Done
            </Button>
            {!importResult && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportSubmit}
                disabled={!importFile}
                isLoading={importMutation.isPending}
                leftIcon={<UploadCloud className="w-4 h-4" />}
              >
                Upload & Process
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#4338CA]" />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 block">CSV File Template</span>
                <span className="text-slate-500">Includes correct headers and sample products</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Template
            </Button>
          </div>

          {!importResult ? (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <input
                type="file"
                accept=".csv,text/csv"
                id="csv_file_input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setImportFile(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="csv_file_input"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-800">
                  {importFile ? importFile.name : 'Click to select CSV file from your computer'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Required columns: sku, name, category, cost_price, sell_price
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-[#4338CA]" />
                  <span>Import Results</span>
                </div>
                <div className="text-slate-700">
                  Successfully imported: <span className="font-bold">{importResult.imported_count}</span> products
                </div>
                {importResult.error_count > 0 && (
                  <div className="text-amber-900 font-semibold mt-0.5">
                    Warnings / Errors: {importResult.error_count} rows skipped
                  </div>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {importResult.errors.map((err, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="py-1.5 px-3 font-mono">{err.row}</td>
                          <td className="py-1.5 px-3 font-mono">{err.sku || '—'}</td>
                          <td className="py-1.5 px-3 text-slate-800 font-medium">
                            {err.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => deletingProduct && deleteMutation.mutate(deletingProduct.id)}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}" (${deletingProduct?.sku})? This product will be soft-deleted and removed from active sales catalogs.`}
        confirmLabel="Delete Product"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
