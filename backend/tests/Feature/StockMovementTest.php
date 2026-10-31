<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin and manager can list stock movements with filters', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::factory()->create();

    $p1 = Product::factory()->create(['category_id' => $cat->id, 'stock_qty' => 0]);
    $p2 = Product::factory()->create(['category_id' => $cat->id, 'stock_qty' => 0]);

    $service = app(StockService::class);
    $service->adjust($p1, 10, 'Adjustment 1', $admin);
    $service->adjust($p2, 20, 'Adjustment 2', $admin);

    $response = $this->actingAs($admin, 'sanctum')
        ->getJson("/api/v1/stock-movements?product_id={$p1->id}");

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.product_id', $p1->id)
        ->assertJsonPath('data.0.qty_change', 10);
});

test('cashier cannot list stock movements', function () {
    $cashier = User::factory()->cashier()->create();

    $response = $this->actingAs($cashier, 'sanctum')
        ->getJson('/api/v1/stock-movements');

    $response->assertStatus(403);
});

test('product resource exposes stock_qty to all users but hides cost fields from cashiers', function () {
    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create();
    $cat = Category::factory()->create();

    $product = Product::create([
        'sku' => 'VISIBILITY-01',
        'name' => 'Visibility Test Item',
        'category_id' => $cat->id,
        'cost_price' => 75.00,
        'avg_cost' => 75.00,
        'sell_price' => 120.00,
        'stock_qty' => 42,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    // Admin request: includes cost_price and avg_cost
    $adminRes = $this->actingAs($admin, 'sanctum')
        ->getJson("/api/v1/products/{$product->id}");

    $adminRes->assertStatus(200)
        ->assertJsonPath('data.stock_qty', 42)
        ->assertJsonPath('data.cost_price', '75.00')
        ->assertJsonPath('data.avg_cost', '75.00');

    // Cashier request: includes stock_qty but omits cost_price and avg_cost
    $cashierRes = $this->actingAs($cashier, 'sanctum')
        ->getJson("/api/v1/products/{$product->id}");

    $cashierRes->assertStatus(200)
        ->assertJsonPath('data.stock_qty', 42)
        ->assertJsonMissing(['cost_price', 'avg_cost']);
});
