<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\SaleService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Process\Process;

class TestSaleConcurrencyCommand extends Command
{
    protected $signature = 'test:concurrency {--worker} {--product-id=} {--user-id=} {--runs=1}';

    protected $description = 'Runs concurrency test: sells the last unit twice simultaneously to prove zero overselling';

    public function handle(SaleService $saleService): int
    {
        // If running in worker mode, execute single sale attempt and output JSON
        if ($this->option('worker')) {
            return $this->handleWorker($saleService);
        }

        // Master orchestrator mode
        $runs = (int) $this->option('runs');
        $this->info("Starting {$runs} concurrency test run(s)...");

        $user = User::where('role', User::ROLE_CASHIER)->first()
            ?? User::first();

        if (! $user) {
            $this->error('No user found in database to run sales.');

            return 1;
        }

        for ($i = 1; $i <= $runs; $i++) {
            $this->line("--- Run {$i}/{$runs} ---");

            // Create or reset a unique product with exactly 1 in stock
            $product = DB::transaction(function () {
                $p = Product::create([
                    'sku' => 'CONCURRENCY-'.uniqid(),
                    'name' => 'Concurrency Target Product',
                    'category_id' => 1,
                    'unit_id' => 1,
                    'cost_price' => 10.00,
                    'sell_price' => 15.00,
                    'stock_qty' => 1,
                    'reorder_level' => 5,
                    'is_active' => true,
                ]);

                // Create initial movement so stock equals movements sum
                StockMovement::create([
                    'product_id' => $p->id,
                    'type' => StockMovement::TYPE_ADJUSTMENT,
                    'qty_change' => 1,
                    'unit_cost' => 10.00,
                    'reason' => 'Initial concurrency stock setup',
                    'user_id' => 1,
                    'created_at' => now(),
                ]);

                return $p;
            });

            // Launch two concurrent worker processes
            $cmd1 = [PHP_BINARY, 'artisan', 'test:concurrency', '--worker', "--product-id={$product->id}", "--user-id={$user->id}"];
            $cmd2 = [PHP_BINARY, 'artisan', 'test:concurrency', '--worker', "--product-id={$product->id}", "--user-id={$user->id}"];

            $env = [
                'DB_CONNECTION' => config('database.default', 'mysql'),
                'DB_DATABASE' => config('database.connections.mysql.database', 'inventory_system'),
            ];

            $process1 = new Process($cmd1, base_path(), $env);
            $process2 = new Process($cmd2, base_path(), $env);

            // Start both processes asynchronously at the exact same moment
            $process1->start();
            $process2->start();

            // Wait for both to complete
            $process1->wait();
            $process2->wait();

            $output1 = trim($process1->getOutput());
            $output2 = trim($process2->getOutput());

            $res1 = json_decode($output1, true);
            $res2 = json_decode($output2, true);

            if (! is_array($res1) || ! is_array($res2)) {
                $this->error("Invalid worker output:\nP1: {$output1}\nP2: {$output2}");

                return 1;
            }

            $successCount = ($res1['success'] ? 1 : 0) + ($res2['success'] ? 1 : 0);
            $failureCount = (! $res1['success'] ? 1 : 0) + (! $res2['success'] ? 1 : 0);

            $freshProduct = $product->fresh();
            $movementsSum = (int) StockMovement::where('product_id', $product->id)->sum('qty_change');

            $this->line("Results: Successes={$successCount}, Failures={$failureCount}, Final Stock={$freshProduct->stock_qty}, Movements Sum={$movementsSum}");

            if ($successCount !== 1 || $failureCount !== 1) {
                $this->error("FAILED: Expected exactly 1 success and 1 failure, but got {$successCount} successes and {$failureCount} failures.");

                return 1;
            }

            if ($freshProduct->stock_qty !== 0) {
                $this->error("FAILED: Product stock_qty expected to be 0, but got {$freshProduct->stock_qty}.");

                return 1;
            }

            if ($movementsSum !== 0) {
                $this->error("FAILED: Movements sum expected to be 0 (1 setup - 1 sale), but got {$movementsSum}.");

                return 1;
            }

            $this->info("✓ Run {$i} PASSED: Exactly 1 sold, 1 rejected, stock = 0, no overselling.");
        }

        $this->info("ALL {$runs} CONCURRENCY RUNS PASSED CLEANLY!");

        return 0;
    }

    protected function handleWorker(SaleService $saleService): int
    {
        $productId = (int) $this->option('product-id');
        $userId = (int) $this->option('user-id');

        $user = User::find($userId);
        if (! $user) {
            echo json_encode(['success' => false, 'error' => 'User not found']);

            return 1;
        }

        try {
            $sale = $saleService->create([
                'payment_method' => Sale::PAYMENT_CARD,
                'items' => [
                    ['product_id' => $productId, 'qty' => 1],
                ],
            ], $user);

            echo json_encode([
                'success' => true,
                'sale_id' => $sale->id,
                'invoice_number' => $sale->invoice?->number,
            ]);

            return 0;
        } catch (ValidationException $e) {
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage(),
                'errors' => $e->errors(),
            ]);

            return 0;
        } catch (\Throwable $t) {
            echo json_encode([
                'success' => false,
                'error' => $t->getMessage(),
            ]);

            return 0;
        }
    }
}
