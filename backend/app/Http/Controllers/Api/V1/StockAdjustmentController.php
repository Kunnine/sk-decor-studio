<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\StockAdjustmentRequest;
use App\Http\Resources\StockMovementResource;
use App\Models\Product;
use App\Models\ProductVariant;
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
        $variant = ! empty($validated['product_variant_id'])
            ? ProductVariant::where('product_id', $product->id)->findOrFail($validated['product_variant_id'])
            : null;

        try {
            $movement = $this->stockService->adjust(
                product: $product,
                delta: (int) $validated['delta'],
                reason: $validated['reason'],
                user: $request->user(),
                variant: $variant
            );

            $movement->load(['product', 'variant', 'user']);

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
