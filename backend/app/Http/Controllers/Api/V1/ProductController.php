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
use App\Services\ProductImageService;
use App\Services\ProductImportService;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Product::class);

        $query = Product::query()->with(['category', 'unit']);

        if ($request->filled('search')) {
            $query->search($request->input('search'));
        }

        // Category filter: includes the selected category and all its descendants!
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

        if ($request->filled('unit_id')) {
            $query->where('unit_id', $request->integer('unit_id'));
        }

        if ($request->has('is_active') && $request->input('is_active') !== '') {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->boolean('low_stock')) {
            $query->lowStock();
        }

        $sortField = $request->input('sort_by', 'created_at');
        $sortDirection = $request->input('sort_order', 'desc') === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['name', 'sku', 'sell_price', 'cost_price', 'stock_qty', 'created_at'];

        if (in_array($sortField, $allowedSorts, true)) {
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->latest();
        }

        $products = $query->paginate($request->integer('per_page', 15));

        return ProductResource::collection($products);
    }

    public function store(
        ProductStoreRequest $request,
        ProductImageService $imageService,
        SettingService $settingService
    ): JsonResponse {
        $data = $request->validated();

        // Default reorder level from settings if not set
        if (! isset($data['reorder_level']) || $data['reorder_level'] === null) {
            $data['reorder_level'] = (int) $settingService->get('default_reorder_level', 10);
        }

        $imageFile = $request->file('image');
        unset($data['image']);

        $product = Product::create($data);

        if ($imageFile) {
            $imageService->storeImage($product, $imageFile);
        }

        $product->load(['category', 'unit']);

        return response()->json([
            'message' => 'Product created successfully',
            'data' => new ProductResource($product),
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $this->authorize('view', $product);
        $product->load(['category', 'unit']);

        return response()->json([
            'data' => new ProductResource($product),
        ]);
    }

    public function update(
        ProductUpdateRequest $request,
        Product $product,
        ProductImageService $imageService
    ): JsonResponse {
        $data = $request->validated();

        $imageFile = $request->file('image');
        unset($data['image']);

        $product->update($data);

        if ($imageFile) {
            $imageService->storeImage($product, $imageFile);
        }

        $product->load(['category', 'unit']);

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => new ProductResource($product),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        // Soft delete product (keeps image files according to specification)
        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully',
        ]);
    }

    public function uploadImage(ProductImageRequest $request, Product $product, ProductImageService $imageService): JsonResponse
    {
        $imageService->storeImage($product, $request->file('image'));
        $product->load(['category', 'unit']);

        return response()->json([
            'message' => 'Product image uploaded successfully',
            'data' => new ProductResource($product),
        ]);
    }

    public function deleteImage(Product $product, ProductImageService $imageService): JsonResponse
    {
        $this->authorize('update', $product);

        $imageService->deleteImageFiles($product);
        $product->load(['category', 'unit']);

        return response()->json([
            'message' => 'Product image deleted successfully',
            'data' => new ProductResource($product),
        ]);
    }

    public function toggleActive(Product $product): JsonResponse
    {
        $this->authorize('update', $product);

        $product->is_active = ! $product->is_active;
        $product->save();

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

    public function lowStock(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Product::class);

        $products = Product::query()
            ->with(['category', 'unit'])
            ->active()
            ->lowStock()
            ->orderBy('stock_qty', 'asc')
            ->paginate($request->integer('per_page', 20));

        return ProductResource::collection($products);
    }
}
