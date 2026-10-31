<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\CategoryMoveRequest;
use App\Http\Requests\Category\CategoryStoreRequest;
use App\Http\Requests\Category\CategoryUpdateRequest;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\CategoryTreeResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Category::class);

        $query = Category::query()->with(['parent'])->withCount(['products', 'children']);

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->input('search').'%');
        }

        if ($request->has('parent_id')) {
            if ($request->input('parent_id') === 'root' || $request->input('parent_id') === '') {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $request->integer('parent_id'));
            }
        }

        if ($request->boolean('all')) {
            $categories = $query->orderBy('sort_order')->orderBy('name')->get();

            return CategoryResource::collection($categories);
        }

        $categories = $query->orderBy('sort_order')->orderBy('name')->paginate($request->integer('per_page', 15));

        return CategoryResource::collection($categories);
    }

    public function tree(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Category::class);

        // Load root categories with their nested recursive children
        $roots = Category::whereNull('parent_id')
            ->with(['children.children.children'])
            ->withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return CategoryTreeResource::collection($roots);
    }

    public function store(CategoryStoreRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (empty($data['slug'])) {
            $baseSlug = Str::slug($data['name']);
            $slug = $baseSlug;
            $counter = 1;
            while (Category::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $data['slug'] = $slug;
        }

        $category = Category::create($data);
        $category->load('parent');

        return response()->json([
            'message' => 'Category created successfully',
            'data' => new CategoryResource($category),
        ], 201);
    }

    public function show(Category $category): JsonResponse
    {
        $this->authorize('view', $category);
        $category->load(['parent'])->loadCount(['products', 'children']);

        return response()->json([
            'data' => new CategoryResource($category),
        ]);
    }

    public function update(CategoryUpdateRequest $request, Category $category): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['parent_id']) && $category->wouldCreateCycle($data['parent_id'])) {
            return response()->json([
                'message' => 'Cannot set parent to this category or one of its descendants (would create a cycle).',
            ], 422);
        }

        $category->update($data);
        $category->load(['parent'])->loadCount(['products', 'children']);

        return response()->json([
            'message' => 'Category updated successfully',
            'data' => new CategoryResource($category),
        ]);
    }

    public function move(CategoryMoveRequest $request, Category $category): JsonResponse
    {
        $newParentId = $request->input('parent_id');

        if ($category->wouldCreateCycle($newParentId)) {
            return response()->json([
                'message' => 'Cannot move category under itself or one of its descendants (circular hierarchy).',
            ], 422);
        }

        $category->update(['parent_id' => $newParentId]);
        $category->load(['parent'])->loadCount(['products', 'children']);

        return response()->json([
            'message' => 'Category moved successfully',
            'data' => new CategoryResource($category),
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        $this->authorize('delete', $category);

        if ($category->hasProductsOrChildren()) {
            return response()->json([
                'message' => 'Cannot delete category that still contains products or child subcategories.',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully',
        ]);
    }
}
