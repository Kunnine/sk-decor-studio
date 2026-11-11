<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\ProductImageRequest;
use App\Http\Requests\Product\ProductImportCommitRequest;
use App\Http\Requests\Product\ProductStoreRequest;
use App\Http\Requests\Product\ProductUpdateRequest;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Services\AnalyticsService;
use App\Services\AuditLogService;
use App\Services\ProductImageService;
use App\Services\ProductImportService;
use App\Services\ProductVariantService;
use App\Services\SettingService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Product::class);

        $query = Product::query()->with(['category.parent', 'unit', 'supplier', 'variants']);

        if ($request->filled('search')) {
            $query->search($request->input('search'));
        }

        // Category filter: includes the selected category (or parent_category_id) and all descendants
        if ($request->filled('category_id')) {
            $categoryId = $request->integer('category_id');
            $category = Category::find($categoryId);
            if ($category) {
                $categoryIds = array_merge([$categoryId], $category->allDescendantIds());
                $query->whereIn('category_id', $categoryIds);
            } else {
                $query->where('category_id', $categoryId);
            }
        } elseif ($request->filled('parent_category_id')) {
            $parentId = $request->integer('parent_category_id');
            $parent = Category::find($parentId);
            if ($parent) {
                $categoryIds = array_merge([$parentId], $parent->allDescendantIds());
                $query->whereIn('category_id', $categoryIds);
            } else {
                $query->where('category_id', $parentId);
            }
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->integer('supplier_id'));
        }

        if ($request->filled('unit_id')) {
            $query->where('unit_id', $request->integer('unit_id'));
        }

        if ($request->filled('min_price')) {
            $query->where('sell_price', '>=', (float) $request->input('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('sell_price', '<=', (float) $request->input('max_price'));
        }

        if ($request->filled('stock_status')) {
            match ($request->input('stock_status')) {
                'out_of_stock' => $query->where('stock_qty', '<=', 0),
                'low_stock' => $query->where('stock_qty', '>', 0)->whereColumn('stock_qty', '<=', 'reorder_level'),
                'in_stock' => $query->where('stock_qty', '>', 0),
                default => null,
            };
        }

        foreach (['color', 'size', 'material', 'style'] as $attr) {
            if ($request->filled($attr)) {
                $val = $request->input($attr);
                $query->where(function ($aq) use ($attr, $val) {
                    $aq->where($attr, 'like', "%{$val}%")
                        ->orWhereHas('variants', fn ($vq) => $vq->where($attr, 'like', "%{$val}%"));
                });
            }
        }

        $rawIsActive = $request->input('is_active');
        if ($rawIsActive !== null && $rawIsActive !== '') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->boolean('low_stock')) {
            $query->lowStock();
        }

        $sortField = $request->input('sort_by', 'created_at');
        $sortDirection = $request->input('sort_order', 'desc') === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['name', 'sku', 'sell_price', 'cost_price', 'stock_qty', 'created_at'];

        if (in_array($sortField, $allowedSorts, true)) {
            $query->orderBy($sortField, $sortDirection)->orderBy('id', $sortDirection);
        } else {
            $query->latest()->orderByDesc('id');
        }

        $perPage = min(max($request->integer('per_page', 15), 1), 100);
        $products = $query->paginate($perPage);

        return ProductResource::collection($products);
    }

    public function store(
        ProductStoreRequest $request,
        ProductImageService $imageService,
        ProductVariantService $variantService,
        SettingService $settingService,
        StockService $stockService
    ): JsonResponse {
        $data = $request->validated();

        // Default reorder level from settings if not set
        if (! isset($data['reorder_level']) || $data['reorder_level'] === null) {
            $data['reorder_level'] = (int) $settingService->get('default_reorder_level', 10);
        }

        $variants = $data['variants'] ?? [];
        $hasVariants = (bool) ($data['has_variants'] ?? ! empty($variants));
        $initialStock = (int) ($data['stock_qty'] ?? 0);
        $imageFile = $request->file('image');
        unset($data['image'], $data['variants']);

        $data['has_variants'] = $hasVariants;
        $data['stock_qty'] = 0;
        $data['avg_cost'] = $data['avg_cost'] ?? $data['cost_price'];

        $product = DB::transaction(function () use ($data, $variants, $hasVariants, $initialStock, $variantService, $stockService, $request) {
            $created = Product::create($data);

            if ($hasVariants || ! empty($variants)) {
                return $variantService->sync($created, $variants, $hasVariants, $request->user());
            }

            if ($initialStock > 0) {
                $stockService->adjust(
                    product: $created,
                    delta: $initialStock,
                    reason: 'Initial stock on product creation',
                    user: $request->user()
                );
            }

            return $created;
        });

        $product->refresh();

        if ($imageFile) {
            $imageService->storeImage($product, $imageFile);
            $product->refresh();
        }

        $product->load(['category.parent', 'unit', 'supplier', 'variants']);
        app(AnalyticsService::class)->invalidateCache();

        return response()->json([
            'message' => 'Product created successfully',
            'data' => new ProductResource($product),
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $this->authorize('view', $product);
        $product->load(['category.parent', 'unit', 'supplier', 'variants']);

        return response()->json([
            'data' => new ProductResource($product),
        ]);
    }

    public function update(
        ProductUpdateRequest $request,
        Product $product,
        ProductImageService $imageService,
        ProductVariantService $variantService,
        StockService $stockService
    ): JsonResponse {
        $data = $request->validated();

        $oldCost = (float) $product->cost_price;
        $oldSell = (float) $product->sell_price;

        $hasVariantsInput = array_key_exists('has_variants', $data) || array_key_exists('variants', $data);
        $variants = $data['variants'] ?? [];
        $hasVariants = array_key_exists('has_variants', $data)
            ? (bool) $data['has_variants']
            : (! empty($variants) ? true : (bool) $product->has_variants);

        $requestedStockQty = array_key_exists('stock_qty', $data) && $data['stock_qty'] !== null
            ? (int) $data['stock_qty']
            : null;

        $imageFile = $request->file('image');
        unset($data['image'], $data['remove_image'], $data['variants'], $data['stock_qty']);

        DB::transaction(function () use ($product, $data, $hasVariantsInput, $variants, $hasVariants, $requestedStockQty, $variantService, $stockService, $request) {
            /** @var Product $lockedProduct */
            $lockedProduct = Product::where('id', $product->id)->lockForUpdate()->firstOrFail();

            $lockedProduct->update($data);

            if ($hasVariantsInput) {
                $variantService->sync($lockedProduct, $variants, $hasVariants, $request->user());
                $lockedProduct->refresh();
            }

            if (! $lockedProduct->has_variants && $requestedStockQty !== null) {
                $delta = $requestedStockQty - (int) $lockedProduct->stock_qty;
                if ($delta !== 0) {
                    $stockService->adjust(
                        product: $lockedProduct,
                        delta: $delta,
                        reason: 'Updated via Edit Product',
                        user: $request->user()
                    );
                }
            }
        });

        $product->refresh();

        $priceChanges = [];
        if (isset($data['cost_price']) && (float) $data['cost_price'] !== $oldCost) {
            $priceChanges['cost_price'] = ['old' => $oldCost, 'new' => (float) $data['cost_price']];
        }
        if (isset($data['sell_price']) && (float) $data['sell_price'] !== $oldSell) {
            $priceChanges['sell_price'] = ['old' => $oldSell, 'new' => (float) $data['sell_price']];
        }

        if (! empty($priceChanges)) {
            app(AuditLogService::class)->log(
                action: 'price_changed',
                entity: 'Product',
                entityId: $product->id,
                changes: array_merge(['sku' => $product->sku, 'name' => $product->name], $priceChanges),
                user: $request->user()
            );
        }

        if ($imageFile) {
            $imageService->storeImage($product, $imageFile);
            $product->refresh();
        } elseif ($request->boolean('remove_image')) {
            $imageService->deleteImageFiles($product);
            $product->refresh();
        }

        $product->load(['category.parent', 'unit', 'supplier', 'variants']);
        app(AnalyticsService::class)->invalidateCache();

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => new ProductResource($product),
        ]);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        $hasTransactionHistory = $product->saleItems()->exists() || $product->purchaseItems()->exists();

        DB::transaction(function () use ($product, $hasTransactionHistory, $request) {
            // Deactivate and soft-delete so historical sales, purchases, invoices, and stock movements remain intact
            $product->is_active = false;
            $product->save();
            $product->delete();

            app(AuditLogService::class)->log(
                action: $hasTransactionHistory ? 'deactivated_archived' : 'deleted',
                entity: 'Product',
                entityId: $product->id,
                changes: [
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'has_transaction_history' => $hasTransactionHistory,
                    'soft_deleted' => true,
                ],
                user: $request->user()
            );
        });

        app(AnalyticsService::class)->invalidateCache();

        $message = $hasTransactionHistory
            ? 'Product has existing sales or purchase history and was deactivated & archived without altering historical records.'
            : 'Product deleted successfully';

        return response()->json([
            'message' => $message,
            'has_transaction_history' => $hasTransactionHistory,
            'soft_deleted' => true,
        ]);
    }

    public function uploadImage(ProductImageRequest $request, Product $product, ProductImageService $imageService): JsonResponse
    {
        $imageService->storeImage($product, $request->file('image'));
        $product->refresh();
        $product->load(['category.parent', 'unit', 'supplier', 'variants']);

        return response()->json([
            'message' => 'Product image uploaded successfully',
            'data' => new ProductResource($product),
        ]);
    }

    public function deleteImage(Product $product, ProductImageService $imageService): JsonResponse
    {
        $this->authorize('update', $product);

        $imageService->deleteImageFiles($product);
        $product->refresh();
        $product->load(['category.parent', 'unit', 'supplier', 'variants']);

        return response()->json([
            'message' => 'Product image deleted successfully',
            'data' => new ProductResource($product),
        ]);
    }

    public function toggleActive(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);

        $product->is_active = ! $product->is_active;
        $product->save();

        app(AuditLogService::class)->log(
            action: $product->is_active ? 'activated' : 'deactivated',
            entity: 'Product',
            entityId: $product->id,
            changes: [
                'sku' => $product->sku,
                'name' => $product->name,
                'is_active' => $product->is_active,
            ],
            user: $request->user()
        );

        $product->load(['category.parent', 'unit', 'supplier', 'variants']);
        app(AnalyticsService::class)->invalidateCache();

        $status = $product->is_active ? 'activated' : 'deactivated';

        return response()->json([
            'message' => "Product {$status} successfully",
            'data' => new ProductResource($product),
        ]);
    }

    public function importPreview(Request $request, ProductImportService $importService): JsonResponse
    {
        $this->authorize('import', Product::class);

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt'],
        ]);

        $result = $importService->preview($request->file('file'));

        return response()->json($result);
    }

    public function importCommit(ProductImportCommitRequest $request, ProductImportService $importService): JsonResponse
    {
        $result = $importService->commit(
            $request->input('preview_token'),
            $request->validated()
        );

        app(AnalyticsService::class)->invalidateCache();

        return response()->json($result);
    }

    public function importTemplate(ProductImportService $importService): StreamedResponse
    {
        $this->authorize('viewAny', Product::class);

        $csv = $importService->getTemplateCsv();

        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'products_import_template.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function posSearch(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $term = trim($request->input('q', ''));

        $query = Product::query()
            ->with(['category.parent', 'unit', 'supplier', 'variants'])
            ->active()
            ->where('stock_qty', '>', 0);

        if ($request->filled('category_id')) {
            $categoryId = $request->integer('category_id');
            $category = Category::find($categoryId);
            if ($category) {
                $categoryIds = array_merge([$categoryId], $category->allDescendantIds());
                $query->whereIn('category_id', $categoryIds);
            } else {
                $query->where('category_id', $categoryId);
            }
        }

        $limit = min(max($request->integer('limit', 500), 1), 1000);

        if (! empty($term)) {
            $query->where(function ($q) use ($term) {
                $q->where('sku', $term)
                    ->orWhere('sku', 'like', "%{$term}%")
                    ->orWhere('name', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhere('color', 'like', "%{$term}%")
                    ->orWhere('size', 'like', "%{$term}%")
                    ->orWhere('material', 'like', "%{$term}%")
                    ->orWhere('style', 'like', "%{$term}%")
                    ->orWhereHas('variants', function ($vq) use ($term) {
                        $vq->where('is_active', true)
                            ->where(function ($sub) use ($term) {
                                $sub->where('sku', 'like', "%{$term}%")
                                    ->orWhere('name', 'like', "%{$term}%")
                                    ->orWhere('color', 'like', "%{$term}%")
                                    ->orWhere('size', 'like', "%{$term}%")
                                    ->orWhere('material', 'like', "%{$term}%")
                                    ->orWhere('style', 'like', "%{$term}%");
                            });
                    });
            });

            $products = $query->orderByRaw('CASE WHEN sku = ? THEN 0 WHEN sku LIKE ? THEN 1 ELSE 2 END', [$term, "{$term}%"])
                ->orderBy('name')
                ->limit($limit)
                ->get();
        } else {
            $products = $query->orderBy('name')
                ->limit($limit)
                ->get();
        }

        return response()->json([
            'data' => ProductResource::collection($products),
        ]);
    }

    public function lowStock(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Product::class);

        $products = Product::query()
            ->with(['category.parent', 'unit', 'supplier', 'variants'])
            ->select('products.*')
            ->selectSub(function ($query) {
                $query->selectRaw('MAX(purchases.received_at)')
                    ->from('purchases')
                    ->join('purchase_items', 'purchase_items.purchase_id', '=', 'purchases.id')
                    ->whereColumn('purchase_items.product_id', 'products.id')
                    ->where('purchases.status', 'received');
            }, 'last_purchase_date')
            ->active()
            ->lowStock()
            ->orderBy('stock_qty', 'asc')
            ->paginate($request->integer('per_page', 20));

        return ProductResource::collection($products);
    }
}
