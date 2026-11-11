<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('cashier receives 403 on reports endpoints', function () {
    $cashier = User::factory()->cashier()->create();

    $reportRoutes = [
        '/api/v1/reports/sales-summary',
        '/api/v1/reports/sales-by-product',
        '/api/v1/reports/sales-by-category',
        '/api/v1/reports/purchases-by-supplier',
        '/api/v1/reports/stock-movements',
        '/api/v1/reports/inventory-valuation',
        '/api/v1/reports/low-stock',
    ];

    foreach ($reportRoutes as $route) {
        $res = $this->actingAs($cashier)->getJson($route);
        $res->assertStatus(403);
    }
});

test('sales summary table matches csv export totals', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::create(['name' => 'General', 'slug' => 'general']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);
    $p = Product::create([
        'sku' => 'R-1',
        'name' => 'Report Item',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 10.00,
        'sell_price' => 30.00,
        'stock_qty' => 100,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    // Create 2 sales
    $sale1 = Sale::create([
        'user_id' => $admin->id,
        'status' => Sale::STATUS_COMPLETED,
        'subtotal' => 90.00,
        'discount' => 10.00,
        'tax' => 8.00,
        'total' => 88.00,
        'payment_method' => 'card',
        'amount_paid' => 88.00,
        'sold_at' => now()->subDays(2),
    ]);
    SaleItem::create(['sale_id' => $sale1->id, 'product_id' => $p->id, 'qty' => 3, 'unit_price' => 30.00, 'unit_cost' => 10.00, 'line_total' => 90.00]);

    $sale2 = Sale::create([
        'user_id' => $admin->id,
        'status' => Sale::STATUS_COMPLETED,
        'subtotal' => 60.00,
        'discount' => 0.00,
        'tax' => 6.00,
        'total' => 66.00,
        'payment_method' => 'cash',
        'amount_paid' => 66.00,
        'sold_at' => now()->subDays(1),
    ]);
    SaleItem::create(['sale_id' => $sale2->id, 'product_id' => $p->id, 'qty' => 2, 'unit_price' => 30.00, 'unit_cost' => 10.00, 'line_total' => 60.00]);

    // 1. JSON Report Query
    $jsonRes = $this->actingAs($admin)->getJson('/api/v1/reports/sales-summary?from='.now()->subDays(5)->toDateString().'&to='.now()->toDateString());
    $jsonRes->assertOk();

    $totals = $jsonRes->json('totals');
    expect($totals['orders'])->toBe(2);
    expect($totals['subtotal'])->toEqual(150.00);
    expect($totals['discount'])->toEqual(10.00);
    expect($totals['tax'])->toEqual(14.00);
    expect($totals['total'])->toEqual(154.00);

    // 2. CSV Stream Export Query
    $csvRes = $this->actingAs($admin)->get('/api/v1/reports/sales-summary?format=csv&from='.now()->subDays(5)->toDateString().'&to='.now()->toDateString());
    $csvRes->assertOk();
    $csvRes->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

    $content = $csvRes->streamedContent();

    // Check CSV contains headers
    expect($content)->toContain('Date,"Invoice #",Customer,Cashier,Method,Items,Subtotal,Discount,Tax,Total');

    // Check CSV totals row strictly matches on-screen totals
    expect($content)->toContain('TOTALS,,,,,2,150.00,10.00,14.00,154.00');
});

test('inventory valuation report table matches csv export totals and exports valid pdf', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::create(['name' => 'Storage', 'slug' => 'storage']);
    $unit = Unit::create(['name' => 'Box', 'short_name' => 'bx']);

    $p = Product::create([
        'sku' => 'VAL-1',
        'name' => 'Valuation Box',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 25.00,
        'avg_cost' => 25.00,
        'sell_price' => 50.00,
        'stock_qty' => 20,
        'reorder_level' => 5,
        'is_active' => true,
    ]);

    // 1. Table data
    $jsonRes = $this->actingAs($admin)->getJson('/api/v1/reports/inventory-valuation');
    $jsonRes->assertOk();

    $totals = $jsonRes->json('totals');
    expect($totals['total_units'])->toBe(20);
    expect($totals['total_inventory_value'])->toEqual(500.00); // 20 * 25
    expect($totals['total_retail_value'])->toEqual(1000.00); // 20 * 50

    // 2. CSV export
    $csvRes = $this->actingAs($admin)->get('/api/v1/reports/inventory-valuation?format=csv');
    $csvRes->assertOk();
    $content = $csvRes->streamedContent();
    expect($content)->toContain('TOTALS,"1 products",,20,,,500.00,,1000.00,500.00');

    // 3. Signed PDF URL generation and download
    $signRes = $this->actingAs($admin)->postJson('/api/v1/reports/signed-pdf-url', [
        'report' => 'inventory-valuation',
    ]);
    $signRes->assertOk();
    $signedUrl = $signRes->json('url');
    expect($signedUrl)->toContain('signature=');

    // Download PDF using signed URL
    $pdfRes = $this->get($signedUrl);
    $pdfRes->assertOk();
    $pdfRes->assertHeader('Content-Type', 'application/pdf');
});

test('low stock report lists products and exports csv', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::create(['name' => 'Safety', 'slug' => 'safety']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    Product::create([
        'sku' => 'SAFE-1',
        'name' => 'Safety Helmet',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 15.00,
        'sell_price' => 30.00,
        'stock_qty' => 2,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    $jsonRes = $this->actingAs($admin)->getJson('/api/v1/reports/low-stock');
    $jsonRes->assertOk();

    $item = $jsonRes->json('data.0');
    expect($item['sku'])->toBe('SAFE-1');
    expect($item['deficit'])->toBe(8); // 10 - 2
    expect($item['suggested_reorder_qty'])->toBe(18); // 10*2 - 2

    $csvRes = $this->actingAs($admin)->get('/api/v1/reports/low-stock?format=csv');
    $csvRes->assertOk();
    expect($csvRes->streamedContent())->toContain('SAFE-1,"Safety Helmet",Safety,2,10,8,18');
});
