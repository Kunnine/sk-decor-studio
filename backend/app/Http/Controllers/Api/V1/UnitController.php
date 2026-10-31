<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Unit\UnitStoreRequest;
use App\Http\Requests\Unit\UnitUpdateRequest;
use App\Http\Resources\UnitResource;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UnitController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Unit::class);

        $query = Unit::query()->withCount('products');

        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('short_name', 'like', "%{$term}%");
            });
        }

        if ($request->boolean('all')) {
            $units = $query->orderBy('name')->get();

            return UnitResource::collection($units);
        }

        $units = $query->orderBy('name')->paginate($request->integer('per_page', 15));

        return UnitResource::collection($units);
    }

    public function store(UnitStoreRequest $request): JsonResponse
    {
        $unit = Unit::create($request->validated());

        return response()->json([
            'message' => 'Unit created successfully',
            'data' => new UnitResource($unit),
        ], 201);
    }

    public function show(Unit $unit): JsonResponse
    {
        $this->authorize('view', $unit);
        $unit->loadCount('products');

        return response()->json([
            'data' => new UnitResource($unit),
        ]);
    }

    public function update(UnitUpdateRequest $request, Unit $unit): JsonResponse
    {
        $unit->update($request->validated());
        $unit->loadCount('products');

        return response()->json([
            'message' => 'Unit updated successfully',
            'data' => new UnitResource($unit),
        ]);
    }

    public function destroy(Unit $unit): JsonResponse
    {
        $this->authorize('delete', $unit);

        if ($unit->products()->exists()) {
            return response()->json([
                'message' => 'Cannot delete unit because it is currently assigned to one or more products.',
            ], 422);
        }

        $unit->delete();

        return response()->json([
            'message' => 'Unit deleted successfully',
        ]);
    }
}
