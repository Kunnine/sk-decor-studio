<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Unit;
use App\Models\User;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('analytics endpoints require admin or manager authorization; cashier gets 403', function () {
    $cashier = User::factory()->cashier()->create();

    $endpoints = [
        '/api/v1/analytics/summary',
        '/api/v1/analytics/sales-trend',
        '/api/v1/analytics/top-products',
        '/api/v1/analytics/sales-by-category',
        '/api/v1/analytics/valuation',
        '/api/v1/analytics/payment-methods',
        '/api/v1/analytics/cashiers',
    ];

    foreach ($endpoints as $url) {
        $response = $this->actingAs($cashier)->getJson($url);
        $response->assertStatus(403);
    }
});

test('seeded sales produce exact expected totals, profit and margin; void sales are excluded', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::create(['name' => 'Electronics', 'slug' => 'electronics']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    // Product 1: cost 40, sell 100
    $p1 = Product::create([
        'sku' => 'P1',
        'name' => 'Widget A',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 40.00,
        'avg_cost' => 40.00,
        'sell_price' => 100.00,
        'stock_qty' => 50,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    // Product 2: cost 20, sell 50
    $p2 = Product::create([
        'sku' => 'P2',
        'name' => 'Widget B',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 20.00,
        'avg_cost' => 20.00,
        'sell_price' => 50.00,
        'stock_qty' => 50,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    // Sale 1 (Completed): 2x P1 (rev: 200, cost: 80, profit: 120), 1x P2 (rev: 50, cost: 20, profit: 30)
    // Subtotal: 250, Total: 250, Profit: 150
    $sale1 = Sale::create([
        'user_id' => $admin->id,
        'status' => Sale::STATUS_COMPLETED,
        'subtotal' => 250.00,
        'discount' => 0.00,
        'tax' => 0.00,
        'total' => 250.00,
        'payment_method' => 'card',
        'amount_paid' => 250.00,
        'change_due' => 0.00,
        'sold_at' => now()->subDays(5),
    ]);
    SaleItem::create(['sale_id' => $sale1->id, 'product_id' => $p1->id, 'qty' => 2, 'unit_price' => 100.00, 'unit_cost' => 40.00, 'line_total' => 200.00]);
    SaleItem::create(['sale_id' => $sale1->id, 'product_id' => $p2->id, 'qty' => 1, 'unit_price' => 50.00, 'unit_cost' => 20.00, 'line_total' => 50.00]);

    // Sale 2 (VOID): 1x P1 (rev 100, cost 40) - MUST BE EXCLUDED
    $saleVoid = Sale::create([
        'user_id' => $admin->id,
        'status' => Sale::STATUS_VOID,
        'subtotal' => 100.00,
        'discount' => 0.00,
        'tax' => 0.00,
        'total' => 100.00,
        'payment_method' => 'cash',
        'amount_paid' => 100.00,
        'change_due' => 0.00,
        'sold_at' => now()->subDays(3),
        'voided_at' => now()->subDays(2),
        'voided_by' => $admin->id,
        'void_reason' => 'Customer changed mind',
    ]);
    SaleItem::create(['sale_id' => $saleVoid->id, 'product_id' => $p1->id, 'qty' => 1, 'unit_price' => 100.00, 'unit_cost' => 40.00, 'line_total' => 100.00]);

    $res = $this->actingAs($admin)->getJson('/api/v1/analytics/summary?from='.now()->subDays(10)->toDateString().'&to='.now()->toDateString());
    $res->assertOk();

    $data = $res->json('data');

    // Expected:
    // Revenue: 250.00 (from sale 1 only, void excluded)
    // Orders: 1
    // Units Sold: 3 (2 + 1)
    // Gross Profit: 150.00 (120 + 30)
    // Margin %: 150 / 250 * 100 = 60.00%
    expect($data['revenue']['current'])->toEqual(250.00);
    expect($data['orders']['current'])->toBe(1);
    expect($data['units_sold']['current'])->toBe(3);
    expect($data['gross_profit']['current'])->toEqual(150.00);
    expect($data['gross_margin_pct']['current'])->toEqual(60.00);
});

test('previous-period comparison is correct', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::create(['name' => 'Tools', 'slug' => 'tools']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);
    $p = Product::create([
        'sku' => 'TOOL-1',
        'name' => 'Hammer',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 10.00,
        'sell_price' => 20.00,
        'stock_qty' => 100,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    // Current period: days -3 to 0 (4 days)
    // Total: 200.00
    $saleCurrent = Sale::create([
        'user_id' => $admin->id,
        'status' => Sale::STATUS_COMPLETED,
        'subtotal' => 200.00,
        'total' => 200.00,
        'payment_method' => 'cash',
        'amount_paid' => 200.00,
        'sold_at' => now()->subDays(1),
    ]);
    SaleItem::create(['sale_id' => $saleCurrent->id, 'product_id' => $p->id, 'qty' => 10, 'unit_price' => 20.00, 'unit_cost' => 10.00, 'line_total' => 200.00]);

    // Previous period: days -7 to -4 (4 days)
    // Total: 100.00
    $salePrevious = Sale::create([
        'user_id' => $admin->id,
        'status' => Sale::STATUS_COMPLETED,
        'subtotal' => 100.00,
        'total' => 100.00,
        'payment_method' => 'cash',
        'amount_paid' => 100.00,
        'sold_at' => now()->subDays(5),
    ]);
    SaleItem::create(['sale_id' => $salePrevious->id, 'product_id' => $p->id, 'qty' => 5, 'unit_price' => 20.00, 'unit_cost' => 10.00, 'line_total' => 100.00]);

    $from = now()->subDays(3)->toDateString();
    $to = now()->toDateString();

    $res = $this->actingAs($admin)->getJson("/api/v1/analytics/summary?from={$from}&to={$to}");
    $res->assertOk();

    $revenue = $res->json('data.revenue');
    expect($revenue['current'])->toEqual(200.00);
    expect($revenue['previous'])->toEqual(100.00);
    expect($revenue['change'])->toEqual(100.00);
    expect($revenue['change_pct'])->toEqual(100.00); // 100% growth
});

test('missing days are filled with zero in sales-trend', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::create(['name' => 'Toys', 'slug' => 'toys']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);
    $p = Product::create([
        'sku' => 'TOY-1',
        'name' => 'Yo-yo',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 2.00,
        'sell_price' => 5.00,
        'stock_qty' => 50,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    // Sale only on day -2
    $sale = Sale::create([
        'user_id' => $admin->id,
        'status' => Sale::STATUS_COMPLETED,
        'subtotal' => 50.00,
        'total' => 50.00,
        'payment_method' => 'cash',
        'amount_paid' => 50.00,
        'sold_at' => now()->subDays(2),
    ]);
    SaleItem::create(['sale_id' => $sale->id, 'product_id' => $p->id, 'qty' => 10, 'unit_price' => 5.00, 'unit_cost' => 2.00, 'line_total' => 50.00]);

    $from = now()->subDays(4)->toDateString();
    $to = now()->toDateString();

    $res = $this->actingAs($admin)->getJson("/api/v1/analytics/sales-trend?from={$from}&to={$to}");
    $res->assertOk();

    $trend = $res->json('data');
    expect($trend)->toBeArray();
    expect(count($trend))->toBe(5); // 5 consecutive days: day -4, -3, -2, -1, 0

    // Missing day (day -4) should be 0
    $dayMinus4 = collect($trend)->firstWhere('date', now()->subDays(4)->toDateString());
    expect($dayMinus4['revenue'])->toEqual(0.00);
    expect($dayMinus4['orders'])->toBe(0);
    expect($dayMinus4['profit'])->toEqual(0.00);

    // Active day (day -2) should have revenue and profit
    $dayMinus2 = collect($trend)->firstWhere('date', now()->subDays(2)->toDateString());
    expect($dayMinus2['revenue'])->toEqual(50.00);
    expect($dayMinus2['orders'])->toBe(1);
    expect($dayMinus2['profit'])->toEqual(30.00);
});

test('cache clears after a new sale', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::create(['name' => 'Garden', 'slug' => 'garden']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);
    $p = Product::create([
        'sku' => 'GARDEN-1',
        'name' => 'Spade',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 10.00,
        'sell_price' => 25.00,
        'stock_qty' => 50,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    $from = now()->subDays(5)->toDateString();
    $to = now()->toDateString();

    // First call caches 0 revenue
    $res1 = $this->actingAs($admin)->getJson("/api/v1/analytics/summary?from={$from}&to={$to}");
    $res1->assertOk();
    expect($res1->json('data.revenue.current'))->toEqual(0.00);

    // Create a sale via SaleService (which invalidates analytics cache)
    app(SaleService::class)->create([
        'items' => [
            ['product_id' => $p->id, 'qty' => 2],
        ],
        'payment_method' => 'cash',
        'amount_paid' => 55.00,
    ], $admin);

    // Second call should return fresh updated revenue (55.00) rather than stale 0.00
    $res2 = $this->actingAs($admin)->getJson("/api/v1/analytics/summary?from={$from}&to={$to}");
    $res2->assertOk();
    expect($res2->json('data.revenue.current'))->toEqual(55.00);
});
