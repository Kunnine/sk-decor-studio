<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('average cost calculation handles zero initial stock', function () {
    $service = new StockService;

    // 0 old units at $0.00, 10 in units at $45.50 => $45.50
    $avg = $service->calculateAverageCost(
        oldQty: 0,
        oldCost: 0.00,
        inQty: 10,
        unitCost: 45.50
    );

    expect($avg)->toBe(45.50);
});

test('average cost calculation computes weighted average across mixed quantities and costs', function () {
    $service = new StockService;

    // 10 units at $10.00 ($100 total) + 20 units at $25.00 ($500 total) = 30 units, $600 total => $20.00
    $avg = $service->calculateAverageCost(
        oldQty: 10,
        oldCost: 10.00,
        inQty: 20,
        unitCost: 25.00
    );

    expect($avg)->toBe(20.00);
});

test('average cost calculation rounds properly to 2 decimal places', function () {
    $service = new StockService;

    // 10 units at $10.00 ($100) + 7 units at $14.25 ($99.75) = 17 units, $199.75 total => 11.75
    $avg = $service->calculateAverageCost(
        oldQty: 10,
        oldCost: 10.00,
        inQty: 7,
        unitCost: 14.25
    );

    expect($avg)->toBe(11.75);
});

test('receiving a purchase twice throws exception and does not double stock', function () {
    $admin = User::factory()->admin()->create();
    $supplier = Supplier::create([
        'name' => 'Test Supplier',
    ]);
    $cat = Category::factory()->create();

    $product = Product::create([
        'sku' => 'TEST-PROD-01',
        'name' => 'Test Laptop',
        'category_id' => $cat->id,
        'cost_price' => 100.00,
        'avg_cost' => 100.00,
        'sell_price' => 150.00,
        'stock_qty' => 0,
        'reorder_level' => 5,
        'is_active' => true,
    ]);

    $purchase = Purchase::create([
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-TEST-001',
        'status' => Purchase::STATUS_DRAFT,
        'total' => 500.00,
        'created_by' => $admin->id,
    ]);

    PurchaseItem::create([
        'purchase_id' => $purchase->id,
        'product_id' => $product->id,
        'qty' => 5,
        'unit_cost' => 100.00,
    ]);

    $service = new StockService;

    // First receive: succeeds
    $service->receive($purchase, $admin);

    $product->refresh();
    expect($product->stock_qty)->toBe(5);
    expect($purchase->status)->toBe(Purchase::STATUS_RECEIVED);

    // Second receive: must fail
    expect(fn () => $service->receive($purchase, $admin))
        ->toThrow(InvalidArgumentException::class);

    // Stock must remain 5, not 10
    $product->refresh();
    expect($product->stock_qty)->toBe(5);
    expect(StockMovement::where('product_id', $product->id)->count())->toBe(1);
});

test('adjustment that would make stock negative throws exception and writes no movement', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::factory()->create();

    $product = Product::create([
        'sku' => 'TEST-NEG-01',
        'name' => 'Stock Test Item',
        'category_id' => $cat->id,
        'cost_price' => 50.00,
        'avg_cost' => 50.00,
        'sell_price' => 80.00,
        'stock_qty' => 3,
        'reorder_level' => 2,
        'is_active' => true,
    ]);

    $service = new StockService;

    expect(fn () => $service->adjust($product, -5, 'Inventory count loss', $admin))
        ->toThrow(InvalidArgumentException::class);

    $product->refresh();
    expect($product->stock_qty)->toBe(3);
    expect(StockMovement::where('product_id', $product->id)->count())->toBe(0);
});

test('movements cannot be updated or deleted', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::factory()->create();

    $product = Product::create([
        'sku' => 'TEST-IMMUTABLE-01',
        'name' => 'Immutable Item',
        'category_id' => $cat->id,
        'cost_price' => 10.00,
        'avg_cost' => 10.00,
        'sell_price' => 20.00,
        'stock_qty' => 0,
        'reorder_level' => 2,
        'is_active' => true,
    ]);

    $service = new StockService;
    $movement = $service->adjust($product, 10, 'Initial count', $admin);

    // Attempt update: must throw RuntimeException
    expect(fn () => $movement->update(['qty_change' => 999]))
        ->toThrow(RuntimeException::class, 'Stock movements are immutable and cannot be updated.');

    // Attempt delete: must throw RuntimeException
    expect(fn () => $movement->delete())
        ->toThrow(RuntimeException::class, 'Stock movements are append-only and cannot be deleted.');
});

test('reconciliation: after multiple purchases and adjustments cached stock_qty strictly equals sum of movements', function () {
    $admin = User::factory()->admin()->create();
    $supplier = Supplier::create(['name' => 'Main Supplier']);
    $cat = Category::factory()->create();

    $product = Product::create([
        'sku' => 'RECON-01',
        'name' => 'Reconciliation Test Product',
        'category_id' => $cat->id,
        'cost_price' => 20.00,
        'avg_cost' => 20.00,
        'sell_price' => 40.00,
        'stock_qty' => 0,
        'reorder_level' => 5,
        'is_active' => true,
    ]);

    $service = new StockService;

    // Purchase 1: +50
    $po1 = Purchase::create([
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-RECON-1',
        'status' => Purchase::STATUS_DRAFT,
        'total' => 1000.00,
        'created_by' => $admin->id,
    ]);
    PurchaseItem::create(['purchase_id' => $po1->id, 'product_id' => $product->id, 'qty' => 50, 'unit_cost' => 20.00]);
    $service->receive($po1, $admin);

    // Adjustment: -5 (damage)
    $service->adjust($product, -5, 'Damaged during unloading', $admin);

    // Purchase 2: +25
    $po2 = Purchase::create([
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-RECON-2',
        'status' => Purchase::STATUS_DRAFT,
        'total' => 600.00,
        'created_by' => $admin->id,
    ]);
    PurchaseItem::create(['purchase_id' => $po2->id, 'product_id' => $product->id, 'qty' => 25, 'unit_cost' => 24.00]);
    $service->receive($po2, $admin);

    // Adjustment: +2 (found misplaced units)
    $service->adjust($product, 2, 'Found extra in shelf A2', $admin);

    $product->refresh();
    $movementSum = StockMovement::where('product_id', $product->id)->sum('qty_change');

    expect($product->stock_qty)->toBe(72); // 50 - 5 + 25 + 2 = 72
    expect($product->stock_qty)->toBe((int) $movementSum);
});
