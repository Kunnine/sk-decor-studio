<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LargeSalesSeeder extends Seeder
{
    /**
     * Seeds 50,000 sales with items across 90 days for benchmarking query performance.
     */
    public function run(): void
    {
        $this->command?->info('Seeding 50,000 sales for benchmark...');

        $user = User::first() ?? User::factory()->create();
        $products = Product::where('is_active', true)->limit(20)->get();

        if ($products->isEmpty()) {
            $this->command?->error('No products found to seed sales. Run DatabaseSeeder first.');

            return;
        }

        $methods = [Sale::PAYMENT_CASH, Sale::PAYMENT_CARD, Sale::PAYMENT_TRANSFER];
        $totalSales = 50000;
        $chunkSize = 1000;
        $now = now();

        $productData = $products->map(fn ($p) => [
            'id' => $p->id,
            'cost' => (float) ($p->avg_cost > 0 ? $p->avg_cost : $p->cost_price),
            'price' => (float) $p->sell_price,
        ])->toArray();
        $pCount = count($productData);

        for ($chunk = 0; $chunk < ($totalSales / $chunkSize); $chunk++) {
            $salesBatch = [];
            $itemsBatch = [];

            // Get max current ID for foreign keys
            $lastId = (int) DB::table('sales')->max('id');

            for ($i = 1; $i <= $chunkSize; $i++) {
                $saleId = $lastId + $i;
                $daysAgo = rand(0, 89);
                $soldAt = $now->copy()->subDays($daysAgo)->subMinutes(rand(0, 1440));

                $pIndex = rand(0, $pCount - 1);
                $p = $productData[$pIndex];
                $qty = rand(1, 4);
                $unitPrice = $p['price'];
                $unitCost = $p['cost'];
                $subtotal = round($unitPrice * $qty, 2);
                $tax = round($subtotal * 0.10, 2);
                $total = round($subtotal + $tax, 2);

                $salesBatch[] = [
                    'id' => $saleId,
                    'customer_id' => null,
                    'user_id' => $user->id,
                    'status' => Sale::STATUS_COMPLETED,
                    'subtotal' => $subtotal,
                    'discount' => 0.00,
                    'tax' => $tax,
                    'total' => $total,
                    'payment_method' => $methods[array_rand($methods)],
                    'amount_paid' => $total,
                    'change_due' => 0.00,
                    'sold_at' => $soldAt->toDateTimeString(),
                    'created_at' => $soldAt->toDateTimeString(),
                    'updated_at' => $soldAt->toDateTimeString(),
                ];

                $itemsBatch[] = [
                    'sale_id' => $saleId,
                    'product_id' => $p['id'],
                    'qty' => $qty,
                    'unit_price' => $unitPrice,
                    'unit_cost' => $unitCost,
                    'line_total' => $subtotal,
                    'created_at' => $soldAt->toDateTimeString(),
                    'updated_at' => $soldAt->toDateTimeString(),
                ];
            }

            DB::table('sales')->insert($salesBatch);
            DB::table('sale_items')->insert($itemsBatch);

            if (($chunk + 1) % 10 === 0) {
                $this->command?->info('Seeded '.(($chunk + 1) * $chunkSize).' sales...');
            }
        }

        $this->command?->info('Successfully seeded 50,000 sales.');
    }
}
