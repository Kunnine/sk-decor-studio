<?php

use App\Models\Category;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('product list endpoint does not suffer from N+1 query problem', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::create(['name' => 'QC Cat', 'slug' => 'qc-cat']);
    $unit = Unit::create(['name' => 'Box', 'short_name' => 'bx']);

    // Seed 25 products
    for ($i = 1; $i <= 25; $i++) {
        Product::create([
            'sku' => "QC-P{$i}",
            'name' => "QC Product {$i}",
            'category_id' => $cat->id,
            'unit_id' => $unit->id,
            'cost_price' => 10.00,
            'sell_price' => 20.00,
            'stock_qty' => 50,
            'reorder_level' => 10,
            'is_active' => true,
        ]);
    }

    DB::enableQueryLog();

    $res = $this->actingAs($admin)->getJson('/api/v1/products?per_page=20');
    $res->assertOk();

    $queries = DB::getQueryLog();
    // Eager loaded relations (category.parent, unit, supplier, variants) execute bounded O(1) queries regardless of page size
    expect(count($queries))->toBeLessThanOrEqual(8, 'Product list endpoint executed too many queries: '.count($queries));
});

test('sales list endpoint does not suffer from N+1 query problem', function () {
    $admin = User::factory()->admin()->create();
    $customer = Customer::create(['name' => 'QC Customer', 'phone' => '12345678']);
    $cat = Category::create(['name' => 'QC Cat 2', 'slug' => 'qc-cat-2']);
    $unit = Unit::create(['name' => 'Box', 'short_name' => 'bx']);

    $product = Product::create([
        'sku' => 'QC-P-SALE',
        'name' => 'QC Sale Product',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 10.00,
        'sell_price' => 20.00,
        'stock_qty' => 100,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    // Seed 15 sales with invoice and items
    for ($i = 1; $i <= 15; $i++) {
        $sale = Sale::create([
            'customer_id' => $customer->id,
            'user_id' => $admin->id,
            'status' => Sale::STATUS_COMPLETED,
            'subtotal' => 20.00,
            'total' => 20.00,
            'payment_method' => 'cash',
            'amount_paid' => 20.00,
            'sold_at' => now(),
        ]);
        Invoice::create(['sale_id' => $sale->id, 'number' => "INV-QC-{$i}", 'issued_at' => now()]);
        SaleItem::create(['sale_id' => $sale->id, 'product_id' => $product->id, 'qty' => 1, 'unit_price' => 20.00, 'unit_cost' => 10.00, 'line_total' => 20.00]);
    }

    DB::enableQueryLog();

    $res = $this->actingAs($admin)->getJson('/api/v1/sales?per_page=15');
    $res->assertOk();

    $queries = DB::getQueryLog();
    // Bounded constant queries O(1) regardless of number of sales (sales, count, customers, users, invoices, items, products, categories, units)
    expect(count($queries))->toBeLessThanOrEqual(10, 'Sales list endpoint executed too many queries: '.count($queries));
});

test('analytics summary query count is bounded and uses optimal aggregation', function () {
    $admin = User::factory()->admin()->create();

    DB::enableQueryLog();

    $res = $this->actingAs($admin)->getJson('/api/v1/analytics/summary');
    $res->assertOk();

    $queries = DB::getQueryLog();
    // Summary uses aggregated SQL queries (current sales, current items, prev sales, prev items, low stock)
    expect(count($queries))->toBeLessThanOrEqual(6, 'Analytics summary executed too many queries: '.count($queries));
});
