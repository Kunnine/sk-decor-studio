<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StockService
{
    /**
     * Low-level atomic stock movement recorder.
     * Locks product row, verifies non-negative constraint, writes movement and updates stock_qty.
     */
    public function record(
        Product $product,
        int $qtyChange,
        string $type,
        float $unitCost,
        User $user,
        ?Model $reference = null,
        ?string $reason = null
    ): StockMovement {
        return DB::transaction(function () use ($product, $qtyChange, $type, $unitCost, $user, $reference, $reason) {
            /** @var Product $lockedProduct */
            $lockedProduct = Product::where('id', $product->id)->lockForUpdate()->firstOrFail();

            $newQty = $lockedProduct->stock_qty + $qtyChange;

            if ($newQty < 0) {
                throw new InvalidArgumentException(
                    "Stock operation rejected: Insufficient stock for '{$lockedProduct->name}' ({$lockedProduct->sku}). Current: {$lockedProduct->stock_qty}, Delta: {$qtyChange}."
                );
            }

            $movement = StockMovement::create([
                'product_id' => $lockedProduct->id,
                'type' => $type,
                'qty_change' => $qtyChange,
                'unit_cost' => $unitCost,
                'reference_type' => $reference ? $reference->getMorphClass() : null,
                'reference_id' => $reference?->getKey(),
                'reason' => $reason,
                'user_id' => $user->id,
                'created_at' => now(),
            ]);

            $lockedProduct->stock_qty = $newQty;
            $lockedProduct->save();

            // Synchronize caller's model instance if different
            $product->stock_qty = $newQty;

            return $movement;
        });
    }

    /**
     * Calculate new weighted average cost.
     * Formula: (old_qty * old_cost + in_qty * unit_cost) / (old_qty + in_qty)
     */
    public function calculateAverageCost(int $oldQty, float $oldCost, int $inQty, float $unitCost): float
    {
        if ($inQty <= 0) {
            return round($oldCost, 2);
        }

        if ($oldQty <= 0) {
            return round($unitCost, 2);
        }

        $totalValue = ($oldQty * $oldCost) + ($inQty * $unitCost);
        $totalQty = $oldQty + $inQty;

        return round($totalValue / $totalQty, 2);
    }

    /**
     * Receive a draft purchase.
     * Idempotent: rejects if purchase is not in draft status.
     * For each item, writes purchase movement, increments stock_qty, and recalculates average cost.
     */
    public function receive(Purchase $purchase, User $user): Purchase
    {
        return DB::transaction(function () use ($purchase, $user) {
            // Lock purchase row to prevent concurrent receive calls
            /** @var Purchase $lockedPurchase */
            $lockedPurchase = Purchase::where('id', $purchase->id)
                ->with('items.product')
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedPurchase->isDraft()) {
                throw new InvalidArgumentException(
                    "Purchase '{$lockedPurchase->ref_no}' has already been received."
                );
            }

            if ($lockedPurchase->items->isEmpty()) {
                throw new InvalidArgumentException(
                    "Purchase '{$lockedPurchase->ref_no}' has no line items and cannot be received."
                );
            }

            foreach ($lockedPurchase->items as $item) {
                /** @var Product $lockedProduct */
                $lockedProduct = Product::where('id', $item->product_id)->lockForUpdate()->firstOrFail();

                $oldQty = $lockedProduct->stock_qty;
                $oldCost = (float) ($lockedProduct->avg_cost > 0 ? $lockedProduct->avg_cost : $lockedProduct->cost_price);
                $inQty = $item->qty;
                $unitCost = (float) $item->unit_cost;

                // 1. Record stock-in movement and update stock_qty
                $this->record(
                    product: $lockedProduct,
                    qtyChange: $inQty,
                    type: StockMovement::TYPE_PURCHASE,
                    unitCost: $unitCost,
                    user: $user,
                    reference: $lockedPurchase,
                    reason: "Received via Purchase {$lockedPurchase->ref_no}"
                );

                // 2. Recalculate average cost valuation
                $newAvgCost = $this->calculateAverageCost($oldQty, $oldCost, $inQty, $unitCost);
                $lockedProduct->avg_cost = $newAvgCost;
                $lockedProduct->cost_price = $newAvgCost;
                $lockedProduct->save();
            }

            // Mark purchase as received
            $lockedPurchase->status = Purchase::STATUS_RECEIVED;
            $lockedPurchase->received_at = now();
            $lockedPurchase->save();

            $purchase->status = Purchase::STATUS_RECEIVED;
            $purchase->received_at = $lockedPurchase->received_at;

            return $lockedPurchase;
        });
    }

    /**
     * Manual stock adjustment (positive or negative delta).
     * Reason is strictly required. Rejects any delta that would make stock negative.
     */
    public function adjust(Product $product, int $delta, string $reason, User $user): StockMovement
    {
        if ($delta === 0) {
            throw new InvalidArgumentException('Stock adjustment delta cannot be zero.');
        }

        $trimmedReason = trim($reason);
        if (empty($trimmedReason)) {
            throw new InvalidArgumentException('A valid reason is required for manual stock adjustment.');
        }

        return DB::transaction(function () use ($product, $delta, $trimmedReason, $user) {
            /** @var Product $lockedProduct */
            $lockedProduct = Product::where('id', $product->id)->lockForUpdate()->firstOrFail();

            $cost = (float) ($lockedProduct->avg_cost > 0 ? $lockedProduct->avg_cost : $lockedProduct->cost_price);

            return $this->record(
                product: $lockedProduct,
                qtyChange: $delta,
                type: StockMovement::TYPE_ADJUSTMENT,
                unitCost: $cost,
                user: $user,
                reference: null,
                reason: $trimmedReason
            );
        });
    }
}
