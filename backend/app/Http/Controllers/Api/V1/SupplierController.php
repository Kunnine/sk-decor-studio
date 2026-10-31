<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Supplier\SupplierStoreRequest;
use App\Http\Requests\Supplier\SupplierUpdateRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SupplierController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Supplier::class);

        $query = Supplier::query()->withCount('purchases');

        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%");
            });
        }

        $suppliers = $request->boolean('all')
            ? $query->orderBy('name')->get()
            : $query->latest()->paginate($request->integer('per_page', 15));

        return SupplierResource::collection($suppliers);
    }

    public function store(SupplierStoreRequest $request): JsonResponse
    {
        $supplier = Supplier::create($request->validated());

        return response()->json([
            'message' => 'Supplier created successfully',
            'data' => new SupplierResource($supplier),
        ], 201);
    }

    public function show(Supplier $supplier): JsonResponse
    {
        $this->authorize('view', $supplier);

        $supplier->loadCount('purchases');

        return response()->json([
            'data' => new SupplierResource($supplier),
        ]);
    }

    public function update(SupplierUpdateRequest $request, Supplier $supplier): JsonResponse
    {
        $supplier->update($request->validated());

        return response()->json([
            'message' => 'Supplier updated successfully',
            'data' => new SupplierResource($supplier),
        ]);
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        $this->authorize('delete', $supplier);

        $supplier->delete();

        return response()->json([
            'message' => 'Supplier deleted successfully',
        ]);
    }
}
