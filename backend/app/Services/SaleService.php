<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceCounter;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class SaleService
{
    public function __construct(
        protected StockService $stockService,
        protected SettingService $settingService
    ) {}

    /**
     * Create a sale in ONE database transaction.
     * Locks product rows in ascending ID order to prevent deadlocks.
     * Generates invoice number via locked yearly counter.
     */
    public function create(array $data, User $user, ?string $idempotencyKey = null): Sale
    {
        // 1. Idempotency Check
        if ($idempotencyKey) {
            $existingSale = Sale::where('idempotency_key', $idempotencyKey)
                ->with(['items.product.unit', 'items.variant', 'customer', 'invoice', 'user'])
                ->first();

            if ($existingSale) {
                return $existingSale;
            }
        }

        // 2. Validate Items Array
        $rawItems = $data['items'] ?? [];
        if (empty($rawItems)) {
            throw ValidationException::withMessages([
                'items' => ['At least one product line is required to create a sale.'],
            ]);
        }

        // 3. Merge duplicate product + variant lines
        $mergedItems = [];
        foreach ($rawItems as $raw) {
            $pid = (int) $raw['product_id'];
            $variantId = isset($raw['product_variant_id']) && $raw['product_variant_id'] !== null && $raw['product_variant_id'] !== ''
                ? (int) $raw['product_variant_id']
                : null;
            $qty = (int) $raw['qty'];

            if ($qty <= 0) {
                throw ValidationException::withMessages([
                    'items' => ["Quantity for product ID {$pid} must be a positive integer."],
                ]);
            }

            $key = "{$pid}:".($variantId ?? 0);

            if (! isset($mergedItems[$key])) {
                $mergedItems[$key] = [
                    'product_id' => $pid,
                    'product_variant_id' => $variantId,
                    'qty' => $qty,
                    'custom_price' => isset($raw['unit_price']) ? (float) $raw['unit_price'] : null,
                ];
            } else {
                $mergedItems[$key]['qty'] += $qty;
                if (isset($raw['unit_price'])) {
                    $mergedItems[$key]['custom_price'] = (float) $raw['unit_price'];
                }
            }
        }

        // 4. Sort product and variant IDs ascending to prevent deadlocks
        $productIds = collect($mergedItems)->pluck('product_id')->unique()->sort()->values()->all();
        $variantIds = collect($mergedItems)->pluck('product_variant_id')->filter()->unique()->sort()->values()->all();

        return DB::transaction(function () use ($data, $user, $idempotencyKey, $mergedItems, $productIds, $variantIds) {
            // Check idempotency again within transaction
            if ($idempotencyKey) {
                $existing = Sale::where('idempotency_key', $idempotencyKey)->lockForUpdate()->first();
                if ($existing) {
                    return $existing->load(['items.product.unit', 'items.variant', 'customer', 'invoice', 'user']);
                }
            }

            // Lock products (and variants if any) in ascending ID order
            $lockedProducts = Product::whereIn('id', $productIds)
                ->orderBy('id', 'asc')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $lockedVariants = ! empty($variantIds)
                ? ProductVariant::whereIn('id', $variantIds)
                    ->orderBy('id', 'asc')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id')
                : collect();

            // Verify each product/variant exists, is active, and has sufficient stock
            $lineItemsToCreate = [];
            $subtotal = 0.00;

            foreach ($mergedItems as $itemData) {
                $pid = $itemData['product_id'];
                $vid = $itemData['product_variant_id'];
                /** @var Product|null $product */
                $product = $lockedProducts->get($pid);

                if (! $product) {
                    throw ValidationException::withMessages([
                        'items' => ["Product ID {$pid} does not exist."],
                    ]);
                }

                if (! $product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => ["Product '{$product->name}' ({$product->sku}) is inactive and cannot be sold."],
                    ]);
                }

                $requestedQty = $itemData['qty'];
                /** @var ProductVariant|null $variant */
                $variant = null;

                if ($vid !== null) {
                    $variant = $lockedVariants->get($vid);
                    if (! $variant || (int) $variant->product_id !== (int) $product->id) {
                        throw ValidationException::withMessages([
                            'items' => ["Selected variation for '{$product->name}' is invalid."],
                        ]);
                    }
                    if (! $variant->is_active) {
                        throw ValidationException::withMessages([
                            'items' => ["Variation '{$variant->label()}' for '{$product->name}' is inactive."],
                        ]);
                    }
                    if ($variant->stock_qty < $requestedQty) {
                        throw ValidationException::withMessages([
                            'items' => [
                                "Insufficient stock for '{$product->name}' [{$variant->label()}] ({$variant->sku}). Requested: {$requestedQty}, Available: {$variant->stock_qty}.",
                            ],
                        ]);
                    }
                } elseif ($product->has_variants) {
                    $hasActiveVariants = ProductVariant::where('product_id', $product->id)
                        ->where('is_active', true)
                        ->exists();

                    if ($hasActiveVariants) {
                        throw ValidationException::withMessages([
                            'items' => ["Please select a variation for '{$product->name}'."],
                        ]);
                    }

                    if ($product->stock_qty < $requestedQty) {
                        throw ValidationException::withMessages([
                            'items' => [
                                "Insufficient stock for '{$product->name}' ({$product->sku}). Requested: {$requestedQty}, Available: {$product->stock_qty}.",
                            ],
                        ]);
                    }
                } elseif ($product->stock_qty < $requestedQty) {
                    throw ValidationException::withMessages([
                        'items' => [
                            "Insufficient stock for '{$product->name}' ({$product->sku}). Requested: {$requestedQty}, Available: {$product->stock_qty}.",
                        ],
                    ]);
                }

                $baseSellPrice = $variant ? (float) $variant->sell_price : (float) $product->sell_price;

                // Determine unit price: Managers/Admins can override; Cashiers cannot
                $isManagerOrAdmin = $user->isAdmin() || $user->isManager();
                if ($isManagerOrAdmin && $itemData['custom_price'] !== null && $itemData['custom_price'] >= 0) {
                    $unitPrice = round($itemData['custom_price'], 2);
                } else {
                    $unitPrice = round($baseSellPrice, 2);
                }

                $lineTotal = round($unitPrice * $requestedQty, 2);
                $subtotal += $lineTotal;

                if ($variant) {
                    $avgCost = (float) ($variant->avg_cost > 0
                        ? $variant->avg_cost
                        : ($variant->cost_price > 0 ? $variant->cost_price : ($product->avg_cost > 0 ? $product->avg_cost : $product->cost_price)));
                } else {
                    $avgCost = (float) ($product->avg_cost > 0 ? $product->avg_cost : $product->cost_price);
                }

                $lineItemsToCreate[] = [
                    'product' => $product,
                    'variant' => $variant,
                    'variant_label' => $variant?->label(),
                    'qty' => $requestedQty,
                    'unit_price' => $unitPrice,
                    'unit_cost' => $avgCost,
                    'line_total' => $lineTotal,
                ];
            }

            $subtotal = round($subtotal, 2);

            // Calculate discount (managers/admins only; cashiers cannot specify discount)
            $discount = 0.00;
            if (($user->isAdmin() || $user->isManager()) && isset($data['discount'])) {
                if (is_array($data['discount'])) {
                    $type = $data['discount']['type'] ?? 'amount';
                    $val = (float) ($data['discount']['value'] ?? 0);
                    if ($type === 'percent') {
                        $discount = round($subtotal * (min(100, max(0, $val)) / 100), 2);
                    } else {
                        $discount = round(max(0, $val), 2);
                    }
                } else {
                    $discount = round(max(0, (float) $data['discount']), 2);
                }
            }
            // Discount can never exceed subtotal
            $discount = min($discount, $subtotal);

            // Calculate tax from settings
            $taxRate = (float) $this->settingService->get('tax_rate', 0);
            $taxableAmount = max(0, $subtotal - $discount);
            $tax = round($taxableAmount * ($taxRate / 100), 2);

            // Server total
            $total = round($subtotal - $discount + $tax, 2);

            // Payment calculations
            $paymentMethod = $data['payment_method'] ?? Sale::PAYMENT_CASH;
            if (! in_array($paymentMethod, [Sale::PAYMENT_CASH, Sale::PAYMENT_CARD, Sale::PAYMENT_TRANSFER], true)) {
                $paymentMethod = Sale::PAYMENT_CASH;
            }

            $amountPaid = isset($data['amount_paid']) ? round((float) $data['amount_paid'], 2) : $total;
            if ($paymentMethod === Sale::PAYMENT_CASH) {
                if ($amountPaid < $total) {
                    throw ValidationException::withMessages([
                        'amount_paid' => ["Amount paid ({$amountPaid}) cannot be less than total ({$total})."],
                    ]);
                }
                $changeDue = round($amountPaid - $total, 2);
            } else {
                // Card or transfer payments are exact
                $amountPaid = $total;
                $changeDue = 0.00;
            }

            // Generate sequential invoice number with locked yearly counter
            $currentYear = (int) now()->format('Y');
            $counter = InvoiceCounter::where('year', $currentYear)->lockForUpdate()->first();
            if (! $counter) {
                InvoiceCounter::create(['year' => $currentYear, 'last_number' => 0]);
                $counter = InvoiceCounter::where('year', $currentYear)->lockForUpdate()->firstOrFail();
            }

            $counter->last_number += 1;
            $counter->save();

            $prefix = $this->settingService->get('invoice_prefix', 'INV');
            $invoiceNumber = sprintf('%s-%d-%06d', $prefix, $currentYear, $counter->last_number);

            // Write Sale Record
            $sale = Sale::create([
                'customer_id' => $data['customer_id'] ?? null,
                'user_id' => $user->id,
                'status' => Sale::STATUS_COMPLETED,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax' => $tax,
                'total' => $total,
                'payment_method' => $paymentMethod,
                'amount_paid' => $amountPaid,
                'change_due' => $changeDue,
                'notes' => $data['notes'] ?? null,
                'idempotency_key' => $idempotencyKey,
                'sold_at' => now(),
            ]);

            // Write Sale Items and Stock Movements
            foreach ($lineItemsToCreate as $item) {
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product']->id,
                    'product_variant_id' => $item['variant']?->id,
                    'variant_label' => $item['variant_label'],
                    'qty' => $item['qty'],
                    'unit_price' => $item['unit_price'],
                    'unit_cost' => $item['unit_cost'],
                    'line_total' => $item['line_total'],
                ]);

                // Record negative stock movement and update product stock_qty
                $this->stockService->record(
                    product: $item['product'],
                    qtyChange: -$item['qty'],
                    type: StockMovement::TYPE_SALE,
                    unitCost: $item['unit_cost'],
                    user: $user,
                    reference: $sale,
                    reason: "Sale {$invoiceNumber}",
                    variant: $item['variant']
                );
            }

            // Write Invoice Record
            Invoice::create([
                'sale_id' => $sale->id,
                'number' => $invoiceNumber,
                'issued_at' => now(),
                'pdf_path' => null,
            ]);

            app(AnalyticsService::class)->invalidateCache();

            return $sale->load(['items.product.unit', 'items.variant', 'customer', 'invoice', 'user']);
        });
    }

    /**
     * Void a completed sale.
     * Strictly manager or admin only.
     * Restores stock atomically, writes reversing void movements, and marks sale void.
     */
    public function void(Sale $sale, string $reason, User $user): Sale
    {
        $trimmedReason = trim($reason);
        if (empty($trimmedReason)) {
            throw new InvalidArgumentException('A reason is required to void a sale.');
        }

        return DB::transaction(function () use ($sale, $trimmedReason, $user) {
            /** @var Sale $lockedSale */
            $lockedSale = Sale::where('id', $sale->id)
                ->with(['items.product', 'items.variant', 'invoice'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedSale->isVoid()) {
                throw new InvalidArgumentException("Sale #{$lockedSale->id} has already been voided.");
            }

            if (! $lockedSale->isCompleted()) {
                throw new InvalidArgumentException('Only completed sales can be voided.');
            }

            // Lock products (and variants if present) in ascending ID order to avoid deadlocks
            $productIds = $lockedSale->items->pluck('product_id')->unique()->sort()->values()->toArray();
            $lockedProducts = Product::withTrashed()
                ->whereIn('id', $productIds)
                ->orderBy('id', 'asc')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $variantIds = $lockedSale->items->pluck('product_variant_id')->filter()->unique()->sort()->values()->toArray();
            $lockedVariants = ! empty($variantIds)
                ? ProductVariant::withTrashed()
                    ->whereIn('id', $variantIds)
                    ->orderBy('id', 'asc')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id')
                : collect();

            $invoiceNo = $lockedSale->invoice?->number ?? "ID-{$lockedSale->id}";

            // Restore stock for each item via reversing 'void' movements
            foreach ($lockedSale->items as $item) {
                /** @var Product $product */
                $product = $lockedProducts->get($item->product_id);
                $variant = $item->product_variant_id ? $lockedVariants->get($item->product_variant_id) : null;

                $this->stockService->record(
                    product: $product,
                    qtyChange: $item->qty, // positive delta restores stock
                    type: StockMovement::TYPE_VOID,
                    unitCost: (float) $item->unit_cost,
                    user: $user,
                    reference: $lockedSale,
                    reason: "Void sale {$invoiceNo}: {$trimmedReason}",
                    variant: $variant
                );
            }

            $lockedSale->status = Sale::STATUS_VOID;
            $lockedSale->voided_at = now();
            $lockedSale->voided_by = $user->id;
            $lockedSale->void_reason = $trimmedReason;
            $lockedSale->save();

            app(AnalyticsService::class)->invalidateCache();
            app(AuditLogService::class)->log(
                action: 'voided',
                entity: 'Sale',
                entityId: $lockedSale->id,
                changes: [
                    'reason' => $trimmedReason,
                    'total' => (float) $lockedSale->total,
                    'invoice' => $invoiceNo,
                ],
                user: $user
            );

            return $lockedSale->load(['items.product.unit', 'items.variant', 'customer', 'invoice', 'user', 'voidedByUser']);
        });
    }
}
