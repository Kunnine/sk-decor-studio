<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ProductVariantService
{
    public function __construct(
        protected StockService $stockService
    ) {}

    /**
     * Sync variants for a product and keep parent product aggregate stock synchronized.
     *
     * @param  array<int, array<string, mixed>>  $variantsPayload
     */
    public function sync(Product $product, array $variantsPayload, bool $hasVariants, ?User $user = null): Product
    {
        return DB::transaction(function () use ($product, $variantsPayload, $hasVariants, $user) {
            /** @var Product $lockedProduct */
            $lockedProduct = Product::where('id', $product->id)->lockForUpdate()->firstOrFail();
            $wasHasVariants = (bool) $lockedProduct->has_variants;

            if (! $hasVariants) {
                if ($wasHasVariants) {
                    $existingVariants = ProductVariant::where('product_id', $lockedProduct->id)
                        ->lockForUpdate()
                        ->get();

                    foreach ($existingVariants as $existingVariant) {
                        if ($user !== null && (int) $existingVariant->stock_qty > 0) {
                            $this->stockService->adjust(
                                product: $lockedProduct,
                                delta: -(int) $existingVariant->stock_qty,
                                reason: 'Converted from product variations',
                                user: $user,
                                variant: $existingVariant
                            );
                        }
                        $existingVariant->delete();
                    }
                }

                $lockedProduct->has_variants = false;
                $lockedProduct->save();

                return $lockedProduct->refresh();
            }

            // If converting a non-variant product with unvarianted stock into variants, clear parent balance first so ledger reconciles
            if (! $wasHasVariants && $user !== null && (int) $lockedProduct->stock_qty > 0) {
                $this->stockService->adjust(
                    product: $lockedProduct,
                    delta: -(int) $lockedProduct->stock_qty,
                    reason: 'Converted to product variations',
                    user: $user
                );
                $lockedProduct->refresh();
            }

            $keptIds = [];

            foreach ($variantsPayload as $v) {
                $variantId = ! empty($v['id']) ? (int) $v['id'] : null;
                $hasStockInput = array_key_exists('stock_qty', $v) && $v['stock_qty'] !== null && $v['stock_qty'] !== '';
                $targetStockQty = $hasStockInput ? max(0, (int) $v['stock_qty']) : null;

                $attributes = [
                    'sku' => trim((string) $v['sku']),
                    'name' => isset($v['name']) && trim((string) $v['name']) !== '' ? trim((string) $v['name']) : null,
                    'color' => isset($v['color']) && trim((string) $v['color']) !== '' ? trim((string) $v['color']) : null,
                    'size' => isset($v['size']) && trim((string) $v['size']) !== '' ? trim((string) $v['size']) : null,
                    'material' => isset($v['material']) && trim((string) $v['material']) !== '' ? trim((string) $v['material']) : null,
                    'style' => isset($v['style']) && trim((string) $v['style']) !== '' ? trim((string) $v['style']) : null,
                    'cost_price' => (float) ($v['cost_price'] ?? $lockedProduct->cost_price),
                    'sell_price' => (float) ($v['sell_price'] ?? $lockedProduct->sell_price),
                    'reorder_level' => isset($v['reorder_level']) ? (int) $v['reorder_level'] : $lockedProduct->reorder_level,
                    'is_active' => array_key_exists('is_active', $v) ? (bool) $v['is_active'] : true,
                ];

                if ($variantId) {
                    /** @var ProductVariant|null $existing */
                    $existing = ProductVariant::where('product_id', $lockedProduct->id)
                        ->where('id', $variantId)
                        ->lockForUpdate()
                        ->first();

                    if ($existing) {
                        $oldStockQty = (int) $existing->stock_qty;

                        if ($user === null) {
                            if ($targetStockQty !== null) {
                                $attributes['stock_qty'] = $targetStockQty;
                            }
                            $existing->update($attributes);
                        } else {
                            if (! $attributes['is_active'] && $oldStockQty > 0) {
                                $this->stockService->adjust(
                                    product: $lockedProduct,
                                    delta: -$oldStockQty,
                                    reason: 'Variation deactivated via Edit Product',
                                    user: $user,
                                    variant: $existing
                                );
                                $existing->refresh();
                            }

                            $existing->update($attributes);

                            if ($attributes['is_active'] && $targetStockQty !== null) {
                                $delta = $targetStockQty - (int) $existing->stock_qty;
                                if ($delta !== 0) {
                                    $this->stockService->adjust(
                                        product: $lockedProduct,
                                        delta: $delta,
                                        reason: 'Updated via Edit Product',
                                        user: $user,
                                        variant: $existing
                                    );
                                }
                            }
                        }

                        $keptIds[] = $existing->id;

                        continue;
                    }
                }

                // Match by SKU if soft-deleted previously on this product or create new
                $existingBySku = ProductVariant::withTrashed()
                    ->where('product_id', $lockedProduct->id)
                    ->where('sku', $attributes['sku'])
                    ->first();

                $attributes['product_id'] = $lockedProduct->id;
                $attributes['avg_cost'] = $attributes['cost_price'];
                $desiredInitialStock = $targetStockQty ?? 0;

                if ($existingBySku) {
                    if ($existingBySku->trashed()) {
                        $existingBySku->restore();
                    }

                    if ($user === null) {
                        $attributes['stock_qty'] = $desiredInitialStock;
                        $existingBySku->update($attributes);
                    } else {
                        $existingBySku->update($attributes);
                        $delta = ($attributes['is_active'] ? $desiredInitialStock : 0) - (int) $existingBySku->stock_qty;
                        if ($delta !== 0) {
                            $this->stockService->adjust(
                                product: $lockedProduct,
                                delta: $delta,
                                reason: 'Variation stock updated',
                                user: $user,
                                variant: $existingBySku
                            );
                        }
                    }

                    $keptIds[] = $existingBySku->id;
                } else {
                    $attributes['stock_qty'] = $user === null ? $desiredInitialStock : 0;
                    $created = ProductVariant::create($attributes);

                    if ($user !== null && $attributes['is_active'] && $desiredInitialStock > 0) {
                        $this->stockService->adjust(
                            product: $lockedProduct,
                            delta: $desiredInitialStock,
                            reason: 'Initial variation stock',
                            user: $user,
                            variant: $created
                        );
                    }

                    $keptIds[] = $created->id;
                }
            }

            // Soft-delete any variants removed in the form payload
            $removedVariants = ProductVariant::where('product_id', $lockedProduct->id)
                ->when(! empty($keptIds), fn ($q) => $q->whereNotIn('id', $keptIds))
                ->lockForUpdate()
                ->get();

            foreach ($removedVariants as $removedVariant) {
                if ($user !== null && (int) $removedVariant->stock_qty > 0) {
                    $this->stockService->adjust(
                        product: $lockedProduct,
                        delta: -(int) $removedVariant->stock_qty,
                        reason: 'Variation removed via Edit Product',
                        user: $user,
                        variant: $removedVariant
                    );
                }
                $removedVariant->delete();
            }

            $lockedProduct->refresh();
            $lockedProduct->has_variants = ! empty($keptIds);

            if ($lockedProduct->has_variants) {
                $lockedProduct->stock_qty = (int) ProductVariant::where('product_id', $lockedProduct->id)
                    ->where('is_active', true)
                    ->sum('stock_qty');
            }

            $lockedProduct->save();

            return $lockedProduct->refresh();
        });
    }
}
