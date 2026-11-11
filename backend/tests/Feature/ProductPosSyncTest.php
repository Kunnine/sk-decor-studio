<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(SettingSeeder::class);
    $this->admin = User::factory()->admin()->create();
    $this->manager = User::factory()->manager()->create();
    $this->cashier = User::factory()->cashier()->create();
});

test('pos-search returns all active in-stock products beyond 24 items and includes newly created products immediately', function () {
    $category = Category::factory()->create(['name' => 'Table Lamps']);

    Product::factory()->count(30)->create([
        'category_id' => $category->id,
        'is_active' => true,
        'stock_qty' => 8,
    ]);

    $posRes = $this->actingAs($this->cashier, 'sanctum')
        ->getJson('/api/v1/products/pos-search')
        ->assertOk();

    expect(count($posRes->json('data')))->toBe(30);

    // Creating a product from Products Management immediately surfaces in both Products and POS search
    $createRes = $this->actingAs($this->manager, 'sanctum')
        ->postJson('/api/v1/products', [
            'sku' => 'SYNC-NEW-031',
            'name' => 'Alabaster Dome Pendant',
            'category_id' => $category->id,
            'cost_price' => 45.00,
            'sell_price' => 119.00,
            'stock_qty' => 12,
            'reorder_level' => 3,
            'is_active' => true,
        ])
        ->assertCreated();

    $newId = $createRes->json('data.id');

    $productsListRes = $this->actingAs($this->manager, 'sanctum')
        ->getJson('/api/v1/products?per_page=100')
        ->assertOk();

    expect(collect($productsListRes->json('data'))->pluck('id'))->toContain($newId);

    $posAfterCreate = $this->actingAs($this->cashier, 'sanctum')
        ->getJson('/api/v1/products/pos-search')
        ->assertOk();

    expect(count($posAfterCreate->json('data')))->toBe(31);
    expect(collect($posAfterCreate->json('data'))->pluck('id'))->toContain($newId);
});

test('products listing preserves both active and inactive products when is_active is empty string and filters accurately for 1 and 0', function () {
    $category = Category::factory()->create();

    Product::factory()->count(2)->create([
        'category_id' => $category->id,
        'is_active' => true,
    ]);
    $inactive = Product::factory()->create([
        'category_id' => $category->id,
        'sku' => 'INACT-001',
        'is_active' => false,
    ]);

    // Simulated query string `?is_active=` converted by Laravel ConvertEmptyStringsToNull middleware
    $allRes = $this->actingAs($this->manager, 'sanctum')
        ->getJson('/api/v1/products?is_active=')
        ->assertOk();

    expect($allRes->json('meta.total'))->toBe(3);
    expect(collect($allRes->json('data'))->pluck('id'))->toContain($inactive->id);

    $activeOnly = $this->actingAs($this->manager, 'sanctum')
        ->getJson('/api/v1/products?is_active=1')
        ->assertOk();
    expect($activeOnly->json('meta.total'))->toBe(2);

    $inactiveOnly = $this->actingAs($this->manager, 'sanctum')
        ->getJson('/api/v1/products?is_active=0')
        ->assertOk();
    expect($inactiveOnly->json('meta.total'))->toBe(1);
    expect($inactiveOnly->json('data.0.id'))->toBe($inactive->id);
});

test('editing product updates the same record, syncs POS selling price and stock for new sales, and preserves historical sale prices', function () {
    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'sku' => 'SYNC-EDIT-01',
        'name' => 'Brass Arch Floor Lamp',
        'cost_price' => 40.00,
        'sell_price' => 50.00,
        'stock_qty' => 10,
        'is_active' => true,
    ]);

    $initialProductCount = Product::count();

    // Historical Sale #1 at $50.00
    $sale1Res = $this->actingAs($this->cashier, 'sanctum')
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'items' => [
                ['product_id' => $product->id, 'qty' => 2],
            ],
        ])
        ->assertCreated();

    $sale1Id = $sale1Res->json('data.id');
    expect($sale1Res->json('data.subtotal'))->toBe('100.00');
    expect($product->fresh()->stock_qty)->toBe(8);

    // Edit the existing product: change name, sell price -> 75.00, stock -> 20
    $this->actingAs($this->manager, 'sanctum')
        ->putJson("/api/v1/products/{$product->id}", [
            'sku' => 'SYNC-EDIT-01',
            'name' => 'Brushed Brass Arch Lamp',
            'category_id' => $category->id,
            'cost_price' => 40.00,
            'sell_price' => 75.00,
            'stock_qty' => 20,
            'is_active' => true,
        ])
        ->assertOk()
        ->assertJsonPath('data.id', $product->id);

    // No duplicate record created
    expect(Product::count())->toBe($initialProductCount);

    // POS search immediately reflects updated name, sell price, and stock
    $posSearch = $this->actingAs($this->cashier, 'sanctum')
        ->getJson('/api/v1/products/pos-search?q=SYNC-EDIT-01')
        ->assertOk();

    expect($posSearch->json('data.0.id'))->toBe($product->id);
    expect($posSearch->json('data.0.name'))->toBe('Brushed Brass Arch Lamp');
    expect($posSearch->json('data.0.sell_price'))->toBe('75.00');
    expect($posSearch->json('data.0.stock_qty'))->toBe(20);

    // New sale as Manager (omitting custom unit_price) charges the updated $75.00 live DB price
    $sale2Res = $this->actingAs($this->manager, 'sanctum')
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertCreated();

    expect($sale2Res->json('data.subtotal'))->toBe('75.00');
    expect($product->fresh()->stock_qty)->toBe(19);

    // Historical Sale #1 still retains snapshot $50.00 unit_price and $100.00 line_total
    $sale1Detail = $this->actingAs($this->manager, 'sanctum')
        ->getJson("/api/v1/sales/{$sale1Id}")
        ->assertOk();

    expect($sale1Detail->json('data.subtotal'))->toBe('100.00');
    expect($sale1Detail->json('data.items.0.unit_price'))->toBe('50.00');
    expect($sale1Detail->json('data.items.0.line_total'))->toBe('100.00');
});

test('deactivating a product removes it from POS search and blocks new POS sales while retaining catalog visibility', function () {
    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'sku' => 'SYNC-DEACT-01',
        'name' => 'Woven Jute Pendant',
        'sell_price' => 65.00,
        'stock_qty' => 9,
        'is_active' => true,
    ]);

    // Deactivate via toggle-active
    $toggleRes = $this->actingAs($this->manager, 'sanctum')
        ->patchJson("/api/v1/products/{$product->id}/toggle-active")
        ->assertOk()
        ->assertJsonPath('data.is_active', false)
        ->assertJsonPath('data.category.id', $category->id);

    // POS search no longer lists deactivated product
    $this->actingAs($this->cashier, 'sanctum')
        ->getJson('/api/v1/products/pos-search?q=SYNC-DEACT-01')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    // Products management catalog still displays the inactive product
    $this->actingAs($this->manager, 'sanctum')
        ->getJson('/api/v1/products?search=SYNC-DEACT-01')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.is_active', false);

    // Direct checkout attempt against inactive product fails with 422
    $this->actingAs($this->cashier, 'sanctum')
        ->postJson('/api/v1/sales', [
            'payment_method' => 'cash',
            'amount_paid' => 100,
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertStatus(422);

    // Reactivating restores it to POS search
    $this->actingAs($this->manager, 'sanctum')
        ->patchJson("/api/v1/products/{$product->id}/toggle-active")
        ->assertOk()
        ->assertJsonPath('data.is_active', true);

    $this->actingAs($this->cashier, 'sanctum')
        ->getJson('/api/v1/products/pos-search?q=SYNC-DEACT-01')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('deleting a product with existing sales or purchase history soft-deletes and deactivates without destroying historical records', function () {
    $category = Category::factory()->create(['name' => 'Mirrors']);
    $supplier = Supplier::create(['name' => 'Atelier Glassworks']);

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'supplier_id' => $supplier->id,
        'sku' => 'MIR-HIST-01',
        'name' => 'Arched Brass Wall Mirror',
        'cost_price' => 80.00,
        'sell_price' => 160.00,
        'stock_qty' => 10,
        'is_active' => true,
    ]);

    // Record a Purchase reference
    $purchase = Purchase::create([
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-HIST-2026-01',
        'status' => Purchase::STATUS_RECEIVED,
        'total' => 800.00,
        'created_by' => $this->manager->id,
        'received_at' => now(),
    ]);
    $purchase->items()->create([
        'product_id' => $product->id,
        'qty' => 10,
        'unit_cost' => 80.00,
        'line_total' => 800.00,
    ]);

    // Record a Sale + Invoice reference
    $saleRes = $this->actingAs($this->cashier, 'sanctum')
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'items' => [
                ['product_id' => $product->id, 'qty' => 2],
            ],
        ])
        ->assertCreated();

    $saleId = $saleRes->json('data.id');
    $invoiceId = $saleRes->json('data.invoice.id');

    // Delete the product
    $deleteRes = $this->actingAs($this->manager, 'sanctum')
        ->deleteJson("/api/v1/products/{$product->id}")
        ->assertOk()
        ->assertJsonPath('has_transaction_history', true)
        ->assertJsonPath('soft_deleted', true);

    // Record exists as soft-deleted and inactive
    $archived = Product::withTrashed()->find($product->id);
    expect($archived)->not->toBeNull();
    expect($archived->trashed())->toBeTrue();
    expect($archived->is_active)->toBeFalse();

    // Excluded from active Products catalog and POS search
    $this->actingAs($this->manager, 'sanctum')
        ->getJson('/api/v1/products?search=MIR-HIST-01')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->actingAs($this->cashier, 'sanctum')
        ->getJson('/api/v1/products/pos-search?q=MIR-HIST-01')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    // New POS sales cannot select this product
    $this->actingAs($this->cashier, 'sanctum')
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertStatus(422);

    // Historical Sale, SaleItem product relation, PurchaseItem relation, and Invoice PDF remain intact
    $saleDetail = $this->actingAs($this->manager, 'sanctum')
        ->getJson("/api/v1/sales/{$saleId}")
        ->assertOk()
        ->assertJsonPath('data.subtotal', '320.00')
        ->assertJsonPath('data.items.0.unit_price', '160.00')
        ->assertJsonPath('data.items.0.line_total', '320.00')
        ->assertJsonPath('data.items.0.product.name', 'Arched Brass Wall Mirror')
        ->assertJsonPath('data.items.0.product.sku', 'MIR-HIST-01');

    expect($purchase->fresh()->items->first()->product->name)->toBe('Arched Brass Wall Mirror');
    expect(Sale::find($saleId))->not->toBeNull();

    $this->actingAs($this->manager, 'sanctum')
        ->get("/api/v1/invoices/{$invoiceId}/pdf")
        ->assertOk();
});
