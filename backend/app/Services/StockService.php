<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\StockMovement;
use App\Models\User;
use App\Notifications\LowStockAlert;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use InvalidArgumentException;

class StockService
{
    /**
     * Low-level atomic stock movement recorder.
     * Locks product (and optional variant) row, verifies non-negative constraint, writes movement and updates stock_qty.
     */
    public function record(
        Product $product,
        int $qtyChange,
        string $type,
        float $unitCost,
        User $user,
        ?Model $reference = null,
        ?string $reason = null,
        ?ProductVariant $variant = null
    ): StockMovement {
        return DB::transaction(function () use ($product, $qtyChange, $type, $unitCost, $user, $reference, $reason, $variant) {
            /** @var Product $lockedProduct */
            $lockedProduct = Product::withTrashed()->where('id', $product->id)->lockForUpdate()->firstOrFail();

            $lockedVariant = null;
            $variantLabel = null;

            if ($variant !== null) {
                /** @var ProductVariant $lockedVariant */
                $lockedVariant = ProductVariant::withTrashed()
                    ->where('id', $variant->id)
                    ->where('product_id', $lockedProduct->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $newVariantQty = $lockedVariant->stock_qty + $qtyChange;
                if ($newVariantQty < 0) {
                    throw new InvalidArgumentException(
                        "Stock operation rejected: Insufficient stock for '{$lockedProduct->name}' [{$lockedVariant->label()}] ({$lockedVariant->sku}). Current: {$lockedVariant->stock_qty}, Delta: {$qtyChange}."
                    );
                }

                $lockedVariant->stock_qty = $newVariantQty;
                $lockedVariant->save();
                $variant->stock_qty = $newVariantQty;
                $variantLabel = $lockedVariant->label();

                $newQty = (int) ProductVariant::where('product_id', $lockedProduct->id)
                    ->where('is_active', true)
                    ->sum('stock_qty');
            } else {
                $newQty = $lockedProduct->stock_qty + $qtyChange;

                if ($newQty < 0) {
                    throw new InvalidArgumentException(
                        "Stock operation rejected: Insufficient stock for '{$lockedProduct->name}' ({$lockedProduct->sku}). Current: {$lockedProduct->stock_qty}, Delta: {$qtyChange}."
                    );
                }
            }

            $movement = StockMovement::create([
                'product_id' => $lockedProduct->id,
                'product_variant_id' => $lockedVariant?->id,
                'variant_label' => $variantLabel,
                'type' => $type,
                'qty_change' => $qtyChange,
                'unit_cost' => $unitCost,
                'reference_type' => $reference ? $reference->getMorphClass() : null,
                'reference_id' => $reference?->getKey(),
                'reason' => $reason,
                'user_id' => $user->id,
                'created_at' => now(),
            ]);

            $shouldAlert = false;
            if ($newQty <= $lockedProduct->reorder_level && $lockedProduct->low_stock_notified_at === null) {
                $lockedProduct->low_stock_notified_at = now();
                $shouldAlert = true;
            } elseif ($newQty > $lockedProduct->reorder_level && $lockedProduct->low_stock_notified_at !== null) {
                $lockedProduct->low_stock_notified_at = null;
            }

            $lockedProduct->stock_qty = $newQty;
            $lockedProduct->save();

            // Synchronize caller's model instance if different
            $product->stock_qty = $newQty;
            $product->low_stock_notified_at = $lockedProduct->low_stock_notified_at;

            if ($shouldAlert) {
                $productToNotify = clone $lockedProduct;
                DB::afterCommit(function () use ($productToNotify) {
                    $recipients = User::query()
                        ->active()
                        ->whereIn('role', [User::ROLE_ADMIN, User::ROLE_MANAGER])
                        ->get();

                    if ($recipients->isNotEmpty()) {
                        Notification::send($recipients, new LowStockAlert($productToNotify));
                    }
                });
            }

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
                ->with(['items.product', 'items.variant'])
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

                $lockedVariant = null;
                if ($item->product_variant_id) {
                    $lockedVariant = ProductVariant::where('id', $item->product_variant_id)
                        ->where('product_id', $lockedProduct->id)
                        ->lockForUpdate()
                        ->firstOrFail();
                }

                $oldQty = $lockedProduct->stock_qty;
                $oldCost = (float) ($lockedProduct->avg_cost > 0 ? $lockedProduct->avg_cost : $lockedProduct->cost_price);
                $inQty = $item->qty;
                $unitCost = (float) $item->unit_cost;

                if ($lockedVariant) {
                    $oldVarQty = $lockedVariant->stock_qty;
                    $oldVarCost = (float) ($lockedVariant->avg_cost > 0 ? $lockedVariant->avg_cost : $lockedVariant->cost_price);
                    $newVarAvg = $this->calculateAverageCost($oldVarQty, $oldVarCost, $inQty, $unitCost);
                    $lockedVariant->avg_cost = $newVarAvg;
                    $lockedVariant->cost_price = $newVarAvg;
                    $lockedVariant->save();
                }

                // 1. Record stock-in movement and update stock_qty
                $this->record(
                    product: $lockedProduct,
                    qtyChange: $inQty,
                    type: StockMovement::TYPE_PURCHASE,
                    unitCost: $unitCost,
                    user: $user,
                    reference: $lockedPurchase,
                    reason: "Received via Purchase {$lockedPurchase->ref_no}",
                    variant: $lockedVariant
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

            app(AnalyticsService::class)->invalidateCache();

            return $lockedPurchase;
        });
    }

    /**
     * Manual stock adjustment (positive or negative delta).
     * Reason is strictly required. Rejects any delta that would make stock negative.
     */
    public function adjust(Product $product, int $delta, string $reason, User $user, ?ProductVariant $variant = null): StockMovement
    {
        if ($delta === 0) {
            throw new InvalidArgumentException('Stock adjustment delta cannot be zero.');
        }

        $trimmedReason = trim($reason);
        if (empty($trimmedReason)) {
            throw new InvalidArgumentException('A valid reason is required for manual stock adjustment.');
        }

        return DB::transaction(function () use ($product, $delta, $trimmedReason, $user, $variant) {
            /** @var Product $lockedProduct */
            $lockedProduct = Product::where('id', $product->id)->lockForUpdate()->firstOrFail();

            $lockedVariant = null;
            if ($variant !== null) {
                $lockedVariant = ProductVariant::where('id', $variant->id)
                    ->where('product_id', $lockedProduct->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $cost = (float) ($lockedVariant->avg_cost > 0 ? $lockedVariant->avg_cost : ($lockedVariant->cost_price > 0 ? $lockedVariant->cost_price : $lockedProduct->cost_price));
            } else {
                $cost = (float) ($lockedProduct->avg_cost > 0 ? $lockedProduct->avg_cost : $lockedProduct->cost_price);
            }

            $movement = $this->record(
                product: $lockedProduct,
                qtyChange: $delta,
                type: StockMovement::TYPE_ADJUSTMENT,
                unitCost: $cost,
                user: $user,
                reference: null,
                reason: $trimmedReason,
                variant: $lockedVariant
            );

            app(AnalyticsService::class)->invalidateCache();
            app(AuditLogService::class)->log(
                action: 'adjusted',
                entity: 'StockAdjustment',
                entityId: $lockedProduct->id,
                changes: array_filter([
                    'sku' => $lockedVariant?->sku ?? $lockedProduct->sku,
                    'name' => $lockedProduct->name,
                    'variant' => $lockedVariant?->label(),
                    'delta' => $delta,
                    'reason' => $trimmedReason,
                    'new_stock' => $lockedVariant?->stock_qty ?? $lockedProduct->stock_qty,
                ], fn ($val) => $val !== null),
                user: $user
            );

            return $movement;
        });
    }
}
