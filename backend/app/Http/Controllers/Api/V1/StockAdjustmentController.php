<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\StockAdjustmentRequest;
use App\Http\Resources\StockMovementResource;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;

class StockAdjustmentController extends Controller
{
    public function __construct(
        protected StockService $stockService
    ) {}

    public function store(StockAdjustmentRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $product = Product::findOrFail($validated['product_id']);

        try {
            $movement = $this->stockService->adjust(
                product: $product,
                delta: (int) $validated['delta'],
                reason: $validated['reason'],
                user: $request->user()
            );

            $movement->load(['product', 'user']);

            return response()->json([
                'message' => 'Stock adjustment recorded successfully.',
                'data' => new StockMovementResource($movement),
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
