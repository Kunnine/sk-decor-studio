<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin and manager can list purchases with status filter', function () {
    $manager = User::factory()->manager()->create();
    $supplier = Supplier::create(['name' => 'Supplier A']);

    Purchase::create([
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-001',
        'status' => Purchase::STATUS_DRAFT,
        'total' => 200.00,
        'created_by' => $manager->id,
    ]);

    Purchase::create([
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-002',
        'status' => Purchase::STATUS_RECEIVED,
        'total' => 500.00,
        'created_by' => $manager->id,
        'received_at' => now(),
    ]);

    $response = $this->actingAs($manager, 'sanctum')
        ->getJson('/api/v1/purchases?status=draft');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.ref_no', 'PO-001');
});

test('admin can create draft purchase with multiple distinct items', function () {
    $admin = User::factory()->admin()->create();
    $supplier = Supplier::create(['name' => 'Supplier B']);
    $cat = Category::factory()->create();

    $p1 = Product::factory()->create(['category_id' => $cat->id]);
    $p2 = Product::factory()->create(['category_id' => $cat->id]);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/purchases', [
            'supplier_id' => $supplier->id,
            'ref_no' => 'PO-2026-MULTI-01',
            'notes' => 'Q4 restock order',
            'items' => [
                ['product_id' => $p1->id, 'qty' => 10, 'unit_cost' => 50.00],
                ['product_id' => $p2->id, 'qty' => 5, 'unit_cost' => 120.00],
            ],
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.ref_no', 'PO-2026-MULTI-01')
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.total', '1100.00'); // 10*50 + 5*120 = 500 + 600 = 1100

    $this->assertDatabaseHas('purchases', [
        'ref_no' => 'PO-2026-MULTI-01',
        'status' => 'draft',
        'total' => 1100.00,
    ]);

    $this->assertDatabaseCount('purchase_items', 2);
});

test('purchase creation validates positive qty, non-negative cost, and distinct products', function () {
    $admin = User::factory()->admin()->create();
    $supplier = Supplier::create(['name' => 'Supplier C']);
    $cat = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $cat->id]);

    // Test zero qty, negative cost, duplicate product_id
    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/purchases', [
            'supplier_id' => $supplier->id,
            'ref_no' => 'PO-INVALID',
            'items' => [
                ['product_id' => $product->id, 'qty' => 0, 'unit_cost' => -10.00],
                ['product_id' => $product->id, 'qty' => 5, 'unit_cost' => 20.00],
            ],
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors([
            'items.0.qty',
            'items.0.unit_cost',
            'items.0.product_id',
            'items.1.product_id',
        ]);
});

test('admin can update draft purchase but cannot update received purchase', function () {
    $admin = User::factory()->admin()->create();
    $supplier = Supplier::create(['name' => 'Supplier D']);
    $cat = Category::factory()->create();
    $prod = Product::factory()->create(['category_id' => $cat->id]);

    $draft = Purchase::create([
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-DRAFT-01',
        'status' => Purchase::STATUS_DRAFT,
        'total' => 100.00,
        'created_by' => $admin->id,
    ]);

    $this->actingAs($admin, 'sanctum')
        ->putJson("/api/v1/purchases/{$draft->id}", [
            'notes' => 'Updated draft notes',
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.notes', 'Updated draft notes');

    // Change status to received
    $draft->update(['status' => Purchase::STATUS_RECEIVED]);

    $this->actingAs($admin, 'sanctum')
        ->putJson("/api/v1/purchases/{$draft->id}", [
            'notes' => 'Should fail update',
        ])
        ->assertStatus(422)
        ->assertJsonFragment(['message' => 'Only draft purchases can be modified. Received purchases are read-only.']);
});

test('receiving purchase triggers stock service atomically and is idempotent', function () {
    $admin = User::factory()->admin()->create();
    $supplier = Supplier::create(['name' => 'Supplier E']);
    $cat = Category::factory()->create();

    $product = Product::create([
        'sku' => 'RCV-PROD-01',
        'name' => 'Monitor 4K',
        'category_id' => $cat->id,
        'cost_price' => 200.00,
        'avg_cost' => 200.00,
        'sell_price' => 350.00,
        'stock_qty' => 10,
        'reorder_level' => 5,
        'is_active' => true,
    ]);

    $purchase = Purchase::create([
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-RCV-01',
        'status' => Purchase::STATUS_DRAFT,
        'total' => 3000.00,
        'created_by' => $admin->id,
    ]);

    $purchase->items()->create([
        'product_id' => $product->id,
        'qty' => 10,
        'unit_cost' => 300.00,
    ]);

    // First receive: stock 10 + 10 = 20, avg_cost: (10*200 + 10*300)/20 = 250.00
    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/v1/purchases/{$purchase->id}/receive");

    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'received');

    $product->refresh();
    expect($product->stock_qty)->toBe(20);
    expect((float) $product->avg_cost)->toBe(250.00);

    // Second receive: must fail with 422
    $response2 = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/v1/purchases/{$purchase->id}/receive");

    $response2->assertStatus(422)
        ->assertJsonFragment(['message' => "Purchase 'PO-RCV-01' has already been received."]);

    $product->refresh();
    expect($product->stock_qty)->toBe(20); // Unchanged!
});

test('cashier cannot access purchase endpoints', function () {
    $cashier = User::factory()->cashier()->create();
    $supplier = Supplier::create(['name' => 'Supplier F']);

    $purchase = Purchase::create([
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-FORBIDDEN',
        'status' => Purchase::STATUS_DRAFT,
        'total' => 100.00,
        'created_by' => $cashier->id,
    ]);

    $this->actingAs($cashier, 'sanctum')->getJson('/api/v1/purchases')->assertStatus(403);
    $this->actingAs($cashier, 'sanctum')->postJson('/api/v1/purchases', [])->assertStatus(403);
    $this->actingAs($cashier, 'sanctum')->getJson("/api/v1/purchases/{$purchase->id}")->assertStatus(403);
    $this->actingAs($cashier, 'sanctum')->putJson("/api/v1/purchases/{$purchase->id}", [])->assertStatus(403);
    $this->actingAs($cashier, 'sanctum')->deleteJson("/api/v1/purchases/{$purchase->id}")->assertStatus(403);
    $this->actingAs($cashier, 'sanctum')->postJson("/api/v1/purchases/{$purchase->id}/receive")->assertStatus(403);
});
