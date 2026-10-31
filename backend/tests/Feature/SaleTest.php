<?php

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Services\StockService;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(SettingSeeder::class);

    $this->admin = User::factory()->admin()->create();
    $this->manager = User::factory()->manager()->create();
    $this->cashier = User::factory()->cashier()->create();
    $this->otherCashier = User::factory()->cashier()->create();

    $this->stockService = app(StockService::class);
});

test('cashier can create a completed sale which decrements stock and writes negative movement', function () {
    $productA = Product::factory()->create([
        'sell_price' => 50.00,
        'cost_price' => 30.00,
        'avg_cost' => 30.00,
        'stock_qty' => 20,
    ]);
    $productB = Product::factory()->create([
        'sell_price' => 25.00,
        'cost_price' => 15.00,
        'avg_cost' => 15.00,
        'stock_qty' => 10,
    ]);
    $customer = Customer::factory()->create();

    $response = $this->actingAs($this->cashier)
        ->postJson('/api/v1/sales', [
            'customer_id' => $customer->id,
            'payment_method' => 'cash',
            'amount_paid' => 200.00,
            'items' => [
                ['product_id' => $productA->id, 'qty' => 2],
                ['product_id' => $productB->id, 'qty' => 1],
            ],
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.status', 'completed')
        ->assertJsonPath('data.payment_method', 'cash')
        ->assertJsonPath('data.subtotal', '125.00')
        ->assertJsonPath('data.tax', '12.50') // 10% tax in seeder
        ->assertJsonPath('data.total', '137.50')
        ->assertJsonPath('data.amount_paid', '200.00')
        ->assertJsonPath('data.change_due', '62.50');

    $saleId = $response->json('data.id');

    // Product stock decreased
    expect($productA->fresh()->stock_qty)->toBe(18);
    expect($productB->fresh()->stock_qty)->toBe(9);

    // Negative stock movements written
    $this->assertDatabaseHas('stock_movements', [
        'product_id' => $productA->id,
        'type' => 'sale',
        'qty_change' => -2,
        'unit_cost' => 30.00,
        'reference_type' => Sale::class,
        'reference_id' => $saleId,
    ]);

    $this->assertDatabaseHas('stock_movements', [
        'product_id' => $productB->id,
        'type' => 'sale',
        'qty_change' => -1,
        'unit_cost' => 15.00,
        'reference_type' => Sale::class,
        'reference_id' => $saleId,
    ]);

    // Invoice generated
    $currentYear = (int) now()->format('Y');
    $expectedInv = sprintf('INV-%d-000001', $currentYear);
    $this->assertDatabaseHas('invoices', [
        'sale_id' => $saleId,
        'number' => $expectedInv,
    ]);
});

test('server computes totals and ignores client-submitted totals', function () {
    $product = Product::factory()->create([
        'sell_price' => 100.00,
        'stock_qty' => 10,
    ]);

    // Client maliciously passes arbitrary totals
    $response = $this->actingAs($this->cashier)
        ->postJson('/api/v1/sales', [
            'payment_method' => 'cash',
            'amount_paid' => 150.00,
            'subtotal' => 1.00, // fake
            'tax' => 0.00,      // fake
            'total' => 1.00,    // fake
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.subtotal', '100.00')
        ->assertJsonPath('data.tax', '10.00')
        ->assertJsonPath('data.total', '110.00')
        ->assertJsonPath('data.change_due', '40.00');
});

test('manager can override product unit price and provide discount', function () {
    $product = Product::factory()->create([
        'sell_price' => 100.00,
        'stock_qty' => 10,
    ]);

    $response = $this->actingAs($this->manager)
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'discount' => 20.00,
            'items' => [
                [
                    'product_id' => $product->id,
                    'qty' => 2,
                    'unit_price' => 90.00, // custom price override
                ],
            ],
        ]);

    // subtotal = 180.00, discount = 20.00, taxable = 160.00, tax 10% = 16.00, total = 176.00
    $response->assertCreated()
        ->assertJsonPath('data.subtotal', '180.00')
        ->assertJsonPath('data.discount', '20.00')
        ->assertJsonPath('data.tax', '16.00')
        ->assertJsonPath('data.total', '176.00');
});

test('cashier cannot override product unit price or provide discount', function () {
    $product = Product::factory()->create([
        'sell_price' => 100.00,
        'stock_qty' => 10,
    ]);

    $response = $this->actingAs($this->cashier)
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'discount' => 50.00, // cashier discount should be ignored
            'items' => [
                [
                    'product_id' => $product->id,
                    'qty' => 1,
                    'unit_price' => 10.00, // cashier price override should be ignored
                ],
            ],
        ]);

    // Cashier price override and discount ignored: subtotal = 100.00, tax = 10.00, total = 110.00
    $response->assertCreated()
        ->assertJsonPath('data.subtotal', '100.00')
        ->assertJsonPath('data.discount', '0.00')
        ->assertJsonPath('data.tax', '10.00')
        ->assertJsonPath('data.total', '110.00');
});

test('discount cannot exceed subtotal', function () {
    $product = Product::factory()->create([
        'sell_price' => 50.00,
        'stock_qty' => 10,
    ]);

    $response = $this->actingAs($this->manager)
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'discount' => 999.00, // huge discount
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ]);

    // Subtotal is 50, discount clamped to 50, taxable 0, tax 0, total 0
    $response->assertCreated()
        ->assertJsonPath('data.subtotal', '50.00')
        ->assertJsonPath('data.discount', '50.00')
        ->assertJsonPath('data.tax', '0.00')
        ->assertJsonPath('data.total', '0.00');
});

test('sale fails atomically if product has insufficient stock', function () {
    $product = Product::factory()->create([
        'name' => 'High Demand Gadget',
        'stock_qty' => 3,
        'sell_price' => 100.00,
    ]);

    $response = $this->actingAs($this->cashier)
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'items' => [
                ['product_id' => $product->id, 'qty' => 5],
            ],
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['items']);

    // Stock must be intact
    expect($product->fresh()->stock_qty)->toBe(3);

    // No sales or stock movements created
    $this->assertDatabaseEmpty('sales');
    $this->assertDatabaseEmpty('sale_items');
    $this->assertDatabaseEmpty('stock_movements');
    $this->assertDatabaseEmpty('invoices');
});

test('sale fails if product is inactive', function () {
    $product = Product::factory()->inactive()->create([
        'stock_qty' => 10,
        'sell_price' => 20.00,
    ]);

    $response = $this->actingAs($this->cashier)
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['items']);
});

test('cashier sees only own sales in list while admin and manager see all', function () {
    $product = Product::factory()->create(['sell_price' => 10.00, 'stock_qty' => 50]);

    // Cashier 1 makes sale
    $this->actingAs($this->cashier)->postJson('/api/v1/sales', [
        'payment_method' => 'card',
        'items' => [['product_id' => $product->id, 'qty' => 1]],
    ])->assertCreated();

    // Cashier 2 makes sale
    $this->actingAs($this->otherCashier)->postJson('/api/v1/sales', [
        'payment_method' => 'card',
        'items' => [['product_id' => $product->id, 'qty' => 1]],
    ])->assertCreated();

    // Cashier 1 lists sales: only 1 sale returned
    $cashier1List = $this->actingAs($this->cashier)->getJson('/api/v1/sales');
    $cashier1List->assertOk()->assertJsonCount(1, 'data');

    // Admin lists sales: both 2 sales returned
    $adminList = $this->actingAs($this->admin)->getJson('/api/v1/sales');
    $adminList->assertOk()->assertJsonCount(2, 'data');
});

test('cashier cannot see unit_cost in sale items but admin and manager can', function () {
    $product = Product::factory()->create([
        'sell_price' => 100.00,
        'cost_price' => 60.00,
        'avg_cost' => 60.00,
        'stock_qty' => 10,
    ]);

    $createResponse = $this->actingAs($this->cashier)->postJson('/api/v1/sales', [
        'payment_method' => 'card',
        'items' => [['product_id' => $product->id, 'qty' => 1]],
    ]);
    $saleId = $createResponse->json('data.id');

    // Cashier views sale detail: unit_cost is absent
    $cashierView = $this->actingAs($this->cashier)->getJson("/api/v1/sales/{$saleId}");
    $cashierView->assertOk()
        ->assertJsonMissing(['unit_cost'])
        ->assertJsonPath('data.items.0.unit_price', '100.00');

    // Admin views sale detail: unit_cost is visible
    $adminView = $this->actingAs($this->admin)->getJson("/api/v1/sales/{$saleId}");
    $adminView->assertOk()
        ->assertJsonPath('data.items.0.unit_cost', '60.00');
});

test('manager and admin can void a sale with reason which restores stock and marks sale void', function () {
    $product = Product::factory()->create([
        'sell_price' => 100.00,
        'cost_price' => 50.00,
        'avg_cost' => 50.00,
        'stock_qty' => 10,
    ]);

    $saleResponse = $this->actingAs($this->cashier)->postJson('/api/v1/sales', [
        'payment_method' => 'card',
        'items' => [['product_id' => $product->id, 'qty' => 3]],
    ]);
    $saleId = $saleResponse->json('data.id');
    expect($product->fresh()->stock_qty)->toBe(7);

    // Void sale as manager
    $voidResponse = $this->actingAs($this->manager)->postJson("/api/v1/sales/{$saleId}/void", [
        'reason' => 'Customer changed mind and walked out',
    ]);

    $voidResponse->assertOk()
        ->assertJsonPath('data.status', 'void')
        ->assertJsonPath('data.void_reason', 'Customer changed mind and walked out')
        ->assertJsonPath('data.voided_by', $this->manager->id);

    // Stock restored back to 10
    expect($product->fresh()->stock_qty)->toBe(10);

    // Reversing void stock movement created
    $this->assertDatabaseHas('stock_movements', [
        'product_id' => $product->id,
        'type' => 'void',
        'qty_change' => 3,
        'reference_type' => Sale::class,
        'reference_id' => $saleId,
    ]);

    // Cannot void an already voided sale
    $secondVoidResponse = $this->actingAs($this->manager)->postJson("/api/v1/sales/{$saleId}/void", [
        'reason' => 'Second attempt',
    ]);
    $secondVoidResponse->assertStatus(422);
});

test('cashier cannot void a sale', function () {
    $product = Product::factory()->create(['sell_price' => 50.00, 'stock_qty' => 10]);

    $saleResponse = $this->actingAs($this->cashier)->postJson('/api/v1/sales', [
        'payment_method' => 'card',
        'items' => [['product_id' => $product->id, 'qty' => 1]],
    ]);
    $saleId = $saleResponse->json('data.id');

    $voidResponse = $this->actingAs($this->cashier)->postJson("/api/v1/sales/{$saleId}/void", [
        'reason' => 'Cashier trying to void',
    ]);
    $voidResponse->assertForbidden();
});

test('idempotency key prevents duplicate sale creation', function () {
    $product = Product::factory()->create(['sell_price' => 25.00, 'stock_qty' => 10]);
    $idempotencyKey = 'unique-key-xyz-12345';

    // First request with header
    $response1 = $this->actingAs($this->cashier)
        ->withHeader('Idempotency-Key', $idempotencyKey)
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'items' => [['product_id' => $product->id, 'qty' => 2]],
        ]);
    $response1->assertCreated();
    $saleId1 = $response1->json('data.id');

    // Repeated request with same header
    $response2 = $this->actingAs($this->cashier)
        ->withHeader('Idempotency-Key', $idempotencyKey)
        ->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'items' => [['product_id' => $product->id, 'qty' => 2]],
        ]);
    $response2->assertCreated();
    $saleId2 = $response2->json('data.id');

    expect($saleId2)->toBe($saleId1);
    expect($product->fresh()->stock_qty)->toBe(8); // decremented once only
    expect(Sale::count())->toBe(1);
});

test('subsequent price and settings changes do not alter historical sale data', function () {
    $product = Product::factory()->create([
        'sell_price' => 100.00,
        'stock_qty' => 10,
    ]);

    $createResponse = $this->actingAs($this->cashier)->postJson('/api/v1/sales', [
        'payment_method' => 'card',
        'items' => [['product_id' => $product->id, 'qty' => 1]],
    ]);
    $saleId = $createResponse->json('data.id');

    // Historical sale has 100.00 subtotal, 10.00 tax, 110.00 total
    expect($createResponse->json('data.total'))->toBe('110.00');

    // Now update product price and tax settings
    $product->update(['sell_price' => 500.00]);
    $this->actingAs($this->admin)->putJson('/api/v1/settings', [
        'business_name' => 'Demo Store',
        'currency_code' => 'USD',
        'currency_symbol' => '$',
        'tax_rate' => 25.00,
        'default_reorder_level' => 10,
        'invoice_prefix' => 'INV',
        'date_format' => 'Y-m-d',
    ])->assertOk();

    // Fetch the historical sale again
    $fetchResponse = $this->actingAs($this->cashier)->getJson("/api/v1/sales/{$saleId}");
    $fetchResponse->assertOk()
        ->assertJsonPath('data.subtotal', '100.00')
        ->assertJsonPath('data.tax', '10.00')
        ->assertJsonPath('data.total', '110.00')
        ->assertJsonPath('data.items.0.unit_price', '100.00');
});

test('sequential invoice numbering increments without gaps across multiple sales', function () {
    $product = Product::factory()->create(['sell_price' => 10.00, 'stock_qty' => 500]);
    $currentYear = (int) now()->format('Y');

    for ($i = 1; $i <= 25; $i++) {
        $res = $this->actingAs($this->cashier)->postJson('/api/v1/sales', [
            'payment_method' => 'card',
            'items' => [['product_id' => $product->id, 'qty' => 1]],
        ]);
        $res->assertCreated();

        $expectedNumber = sprintf('INV-%d-%06d', $currentYear, $i);
        expect($res->json('data.invoice.number'))->toBe($expectedNumber);
    }
});

test('pos search returns active products with stock > 0 and exact sku match prioritized', function () {
    $matchExact = Product::factory()->create([
        'sku' => 'APPLE',
        'name' => 'Fuji Apple',
        'stock_qty' => 10,
        'is_active' => true,
    ]);
    $matchPartial = Product::factory()->create([
        'sku' => 'APPLE-RED',
        'name' => 'Red Delicious',
        'stock_qty' => 5,
        'is_active' => true,
    ]);
    $outOfStock = Product::factory()->create([
        'sku' => 'APPLE-GREEN',
        'name' => 'Green Apple',
        'stock_qty' => 0,
        'is_active' => true,
    ]);
    $inactive = Product::factory()->inactive()->create([
        'sku' => 'APPLE-DRIED',
        'name' => 'Dried Apple',
        'stock_qty' => 20,
    ]);

    $response = $this->actingAs($this->cashier)->getJson('/api/v1/products/pos-search?q=APPLE');

    $response->assertOk()
        ->assertJsonCount(2, 'data'); // out of stock and inactive excluded

    // Exact SKU match is first
    expect($response->json('data.0.sku'))->toBe('APPLE');
    expect($response->json('data.1.sku'))->toBe('APPLE-RED');
});
