<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can adjust stock up and down with reason', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::factory()->create();

    $product = Product::create([
        'sku' => 'ADJ-TEST-01',
        'name' => 'Adjustable Item',
        'category_id' => $cat->id,
        'cost_price' => 50.00,
        'avg_cost' => 50.00,
        'sell_price' => 75.00,
        'stock_qty' => 10,
        'reorder_level' => 2,
        'is_active' => true,
    ]);

    // 1. Positive adjustment: +5 => 15
    $res1 = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/stock-adjustments', [
            'product_id' => $product->id,
            'delta' => 5,
            'reason' => 'Annual physical count found 5 extra units',
        ]);

    $res1->assertStatus(201)
        ->assertJsonPath('data.qty_change', 5)
        ->assertJsonPath('data.type', 'adjustment');

    $product->refresh();
    expect($product->stock_qty)->toBe(15);

    // 2. Negative adjustment: -3 => 12
    $res2 = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/stock-adjustments', [
            'product_id' => $product->id,
            'delta' => -3,
            'reason' => 'Water damage during storm',
        ]);

    $res2->assertStatus(201)
        ->assertJsonPath('data.qty_change', -3);

    $product->refresh();
    expect($product->stock_qty)->toBe(12);
});

test('adjustment that would make stock negative is rejected', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::factory()->create();

    $product = Product::create([
        'sku' => 'ADJ-NEG-01',
        'name' => 'Limited Item',
        'category_id' => $cat->id,
        'cost_price' => 20.00,
        'avg_cost' => 20.00,
        'sell_price' => 30.00,
        'stock_qty' => 4,
        'reorder_level' => 2,
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/stock-adjustments', [
            'product_id' => $product->id,
            'delta' => -10, // Exceeds 4
            'reason' => 'Massive shrinkage',
        ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => "Stock operation rejected: Insufficient stock for 'Limited Item' (ADJ-NEG-01). Current: 4, Delta: -10."]);

    $product->refresh();
    expect($product->stock_qty)->toBe(4);
});

test('adjustment requires valid reason and non-zero delta', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $cat->id]);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/stock-adjustments', [
            'product_id' => $product->id,
            'delta' => 0,
            'reason' => '',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['delta', 'reason']);
});

test('cashier cannot make stock adjustments', function () {
    $cashier = User::factory()->cashier()->create();
    $cat = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $cat->id]);

    $response = $this->actingAs($cashier, 'sanctum')
        ->postJson('/api/v1/stock-adjustments', [
            'product_id' => $product->id,
            'delta' => 10,
            'reason' => 'Unauthorized increase',
        ]);

    $response->assertStatus(403);
});
