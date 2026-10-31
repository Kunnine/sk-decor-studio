<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated users can list products with pagination and search', function () {
    $cashier = User::factory()->cashier()->create();
    $cat = Category::factory()->create(['name' => 'Audio']);

    Product::factory()->create([
        'sku' => 'SKU-FIND-ME',
        'name' => 'Special Acoustic Headphones',
        'category_id' => $cat->id,
    ]);
    Product::factory()->count(5)->create();

    $response = $this->actingAs($cashier, 'sanctum')
        ->getJson('/api/v1/products?search=Special');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.sku', 'SKU-FIND-ME');
});

test('cashier can read stock and sell price but cost_price is masked', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create([
        'cost_price' => 50.00,
        'sell_price' => 89.99,
        'stock_qty' => 15,
    ]);

    $response = $this->actingAs($cashier, 'sanctum')->getJson("/api/v1/products/{$product->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.sell_price', '89.99')
        ->assertJsonPath('data.stock_qty', 15);

    expect($response->json('data'))->not->toHaveKey('cost_price');
});

test('admin and manager can read cost_price', function () {
    $manager = User::factory()->manager()->create();
    $product = Product::factory()->create([
        'cost_price' => 50.00,
        'sell_price' => 89.99,
    ]);

    $response = $this->actingAs($manager, 'sanctum')->getJson("/api/v1/products/{$product->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.cost_price', '50.00');
});

test('admin and manager can create product with unit', function () {
    $manager = User::factory()->manager()->create();
    $cat = Category::factory()->create();
    $unit = Unit::factory()->create();

    $response = $this->actingAs($manager, 'sanctum')
        ->postJson('/api/v1/products', [
            'sku' => 'TEST-SKU-001',
            'name' => 'Test Gaming Mouse',
            'category_id' => $cat->id,
            'unit_id' => $unit->id,
            'cost_price' => 35.50,
            'sell_price' => 69.99,
            'stock_qty' => 20,
            'reorder_level' => 5,
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.sku', 'TEST-SKU-001')
        ->assertJsonPath('data.unit_id', $unit->id);

    $this->assertDatabaseHas('products', [
        'sku' => 'TEST-SKU-001',
        'unit_id' => $unit->id,
    ]);
});

test('cashier cannot create, update, or delete product', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create();

    $this->actingAs($cashier, 'sanctum')->postJson('/api/v1/products', [
        'sku' => 'HACK-SKU',
        'name' => 'Hacked',
    ])->assertStatus(403);

    $this->actingAs($cashier, 'sanctum')->putJson("/api/v1/products/{$product->id}", [
        'name' => 'Hacked',
    ])->assertStatus(403);

    $this->actingAs($cashier, 'sanctum')->deleteJson("/api/v1/products/{$product->id}")->assertStatus(403);
});

test('manager can optimistically toggle active status of product', function () {
    $manager = User::factory()->manager()->create();
    $product = Product::factory()->create(['is_active' => true]);

    $response = $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/products/{$product->id}/toggle-active");

    $response->assertStatus(200)
        ->assertJsonPath('data.is_active', false);

    expect($product->fresh()->is_active)->toBeFalse();
});

test('low stock endpoint returns only products at or below reorder level', function () {
    $user = User::factory()->cashier()->create();
    Product::factory()->create(['stock_qty' => 25, 'reorder_level' => 10]);
    Product::factory()->create(['stock_qty' => 5, 'reorder_level' => 10]); // low stock

    $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/products/low-stock');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data');
});
