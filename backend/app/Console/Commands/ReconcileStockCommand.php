<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ReconcileStockCommand extends Command
{
    protected $signature = 'stock:reconcile';

    protected $description = 'Reconcile cached product stock_qty against the sum of stock_movements';

    public function handle(): int
    {
        $this->info('Starting stock reconciliation check...');

        // Aggregate movement sum per product
        $movementsByProduct = DB::table('stock_movements')
            ->select('product_id', DB::raw('COALESCE(SUM(qty_change), 0) as movement_sum'))
            ->groupBy('product_id')
            ->pluck('movement_sum', 'product_id');

        $products = Product::withTrashed()->get();
        $discrepancies = [];

        foreach ($products as $product) {
            $movementSum = (int) ($movementsByProduct[$product->id] ?? 0);
            $cachedStock = (int) $product->stock_qty;

            if ($movementSum !== $cachedStock) {
                $discrepancies[] = [
                    'id' => $product->id,
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'cached_stock' => $cachedStock,
                    'movement_sum' => $movementSum,
                    'difference' => $cachedStock - $movementSum,
                ];
            }
        }

        if (count($discrepancies) > 0) {
            $this->error(sprintf('Found %d stock discrepancies:', count($discrepancies)));
            $this->table(
                ['ID', 'SKU', 'Name', 'Cached Stock', 'Movement Sum', 'Diff'],
                $discrepancies
            );

            return Command::FAILURE;
        }

        $this->info(sprintf('All %d products reconciled successfully. 0 differences found.', $products->count()));

        return Command::SUCCESS;
    }
}
