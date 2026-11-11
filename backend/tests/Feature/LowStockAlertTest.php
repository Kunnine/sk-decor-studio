<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;
use App\Notifications\LowStockAlert;
use App\Notifications\LowStockDigestNotification;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

test('crossing the level sends exactly one alert', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $manager = User::factory()->manager()->create();
    $cashier = User::factory()->cashier()->create();

    $category = Category::create(['name' => 'Alert Test Category', 'slug' => 'alert-test-cat']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    // Initial stock: 12, Reorder level: 10
    $product = Product::create([
        'sku' => 'ALERT-1',
        'name' => 'Alert Test Product',
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'cost_price' => 10.00,
        'sell_price' => 20.00,
        'stock_qty' => 12,
        'reorder_level' => 10,
        'is_active' => true,
        'low_stock_notified_at' => null,
    ]);

    // Initial movement
    StockMovement::create([
        'product_id' => $product->id,
        'type' => StockMovement::TYPE_ADJUSTMENT,
        'qty_change' => 12,
        'unit_cost' => 10.00,
        'reason' => 'Setup',
        'user_id' => $admin->id,
        'created_at' => now(),
    ]);

    $stockService = app(StockService::class);

    // Cross the level: 12 -> 9 (delta: -3)
    $stockService->record(
        product: $product,
        qtyChange: -3,
        type: StockMovement::TYPE_SALE,
        unitCost: 10.00,
        user: $cashier,
        reason: 'Sale 1'
    );

    // Refresh model
    $product->refresh();
    expect($product->stock_qty)->toBe(9);
    expect($product->low_stock_notified_at)->not->toBeNull();

    // Verify exactly one notification sent to active manager & admin
    Notification::assertSentTo([$admin, $manager], LowStockAlert::class, 1);
    Notification::assertNotSentTo([$cashier], LowStockAlert::class);
});

test('a second sale below the level sends none', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create();
    $category = Category::create(['name' => 'Test Cat', 'slug' => 'test-cat-'.uniqid()]);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    $product = Product::create([
        'sku' => 'ALERT-2',
        'name' => 'Alert Test Product 2',
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'cost_price' => 10.00,
        'sell_price' => 20.00,
        'stock_qty' => 10,
        'reorder_level' => 10,
        'is_active' => true,
        'low_stock_notified_at' => null,
    ]);

    $stockService = app(StockService::class);

    // Sale 1: 10 -> 8 (crosses level)
    $stockService->record($product, -2, StockMovement::TYPE_SALE, 10.00, $cashier, null, 'Sale 1');
    $product->refresh();
    expect($product->low_stock_notified_at)->not->toBeNull();

    Notification::assertSentTo($admin, LowStockAlert::class, 1);

    // Reset notification fake recorder
    Notification::fake();

    // Sale 2: 8 -> 5 (further drops while low_stock_notified_at is already set)
    $stockService->record($product, -3, StockMovement::TYPE_SALE, 10.00, $cashier, null, 'Sale 2');
    $product->refresh();
    expect($product->stock_qty)->toBe(5);

    // No new alert sent!
    Notification::assertNothingSent();
});

test('restoring stock resets the flag', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $category = Category::create(['name' => 'Test Cat', 'slug' => 'test-cat-'.uniqid()]);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    $product = Product::create([
        'sku' => 'ALERT-3',
        'name' => 'Alert Test Product 3',
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'cost_price' => 10.00,
        'sell_price' => 20.00,
        'stock_qty' => 8,
        'reorder_level' => 10,
        'is_active' => true,
        'low_stock_notified_at' => now()->subDay(),
    ]);

    $stockService = app(StockService::class);

    // Adjust stock up above reorder level: 8 + 7 = 15 > 10
    $stockService->adjust($product, 7, 'Restock adjustment', $admin);

    $product->refresh();
    expect($product->stock_qty)->toBe(15);
    expect($product->low_stock_notified_at)->toBeNull();

    // Now drop it again: 15 -> 9 (should trigger alert again!)
    $stockService->record($product, -6, StockMovement::TYPE_SALE, 10.00, $admin, null, 'New drop');
    $product->refresh();
    expect($product->stock_qty)->toBe(9);
    expect($product->low_stock_notified_at)->not->toBeNull();

    Notification::assertSentTo($admin, LowStockAlert::class, 1);
});

test('a rolled-back sale sends nothing', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $category = Category::create(['name' => 'Test Cat', 'slug' => 'test-cat-'.uniqid()]);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    $product = Product::create([
        'sku' => 'ALERT-ROLLBACK',
        'name' => 'Rollback Product',
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'cost_price' => 10.00,
        'sell_price' => 20.00,
        'stock_qty' => 10,
        'reorder_level' => 10,
        'is_active' => true,
        'low_stock_notified_at' => null,
    ]);

    try {
        DB::transaction(function () use ($product, $admin) {
            app(StockService::class)->record($product, -5, StockMovement::TYPE_SALE, 10.00, $admin, null, 'Aborted sale');
            // Intentional exception to trigger rollback
            throw new RuntimeException('Intentional rollback');
        });
    } catch (RuntimeException $e) {
        // Ignored
    }

    $product->refresh();
    expect($product->stock_qty)->toBe(10);
    expect($product->low_stock_notified_at)->toBeNull();

    Notification::assertNothingSent();
});

test('the digest lists only low products and sends nothing when there are none', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create(['digest_enabled' => true]);
    $category = Category::create(['name' => 'Test Cat', 'slug' => 'test-cat-'.uniqid()]);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    // Case 1: All products healthy
    $product1 = Product::create([
        'sku' => 'HEALTHY-1',
        'name' => 'Healthy Product',
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'cost_price' => 10.00,
        'sell_price' => 20.00,
        'stock_qty' => 50,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    $this->artisan('stock:low-digest')
        ->expectsOutput('No low-stock products found. Digest skipped.')
        ->assertSuccessful();

    Notification::assertNothingSent();

    // Case 2: One low product (stock: 3, level: 10)
    $lowProduct = Product::create([
        'sku' => 'LOW-1',
        'name' => 'Low Stock Product',
        'category_id' => $category->id,
        'unit_id' => $unit->id,
        'cost_price' => 5.00,
        'sell_price' => 15.00,
        'stock_qty' => 3,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    $this->artisan('stock:low-digest')
        ->assertSuccessful();

    Notification::assertSentTo(
        $admin,
        LowStockDigestNotification::class,
        function (LowStockDigestNotification $notification) use ($lowProduct) {
            return $notification->products->contains('id', $lowProduct->id)
                && $notification->products->count() === 1;
        }
    );
});
