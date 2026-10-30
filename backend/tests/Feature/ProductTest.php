<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated users can list products with pagination and search', function () {
    $user = User::factory()->cashier()->create();
    $cat = Category::factory()->create(['name' => 'Audio']);

    Product::factory()->create([
        'sku' => 'SKU-FIND-ME',
        'name' => 'Special Acoustic Headphones',
        'category_id' => $cat->id,
    ]);
    Product::factory()->count(5)->create();

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/products?search=Special');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.sku', 'SKU-FIND-ME');
});

test('admin and manager can create product', function () {
    $manager = User::factory()->manager()->create();
    $cat = Category::factory()->create();

    $response = $this->actingAs($manager, 'sanctum')
        ->postJson('/api/v1/products', [
            'sku' => 'TEST-SKU-001',
            'name' => 'Test Gaming Mouse',
            'category_id' => $cat->id,
            'cost_price' => 35.50,
            'sell_price' => 69.99,
            'stock_qty' => 20,
            'reorder_level' => 5,
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.sku', 'TEST-SKU-001')
        ->assertJsonPath('data.cost_price', '35.50')
        ->assertJsonPath('data.sell_price', '69.99')
        ->assertJsonPath('data.stock_qty', 20);

    $this->assertDatabaseHas('products', [
        'sku' => 'TEST-SKU-001',
        'stock_qty' => 20,
    ]);
});

test('product creation validates required fields and unique sku', function () {
    $admin = User::factory()->admin()->create();
    $existing = Product::factory()->create(['sku' => 'DUPLICATE-SKU']);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/products', [
            'sku' => 'DUPLICATE-SKU',
            'name' => '',
            'cost_price' => -5,
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['sku', 'name', 'category_id', 'cost_price', 'sell_price']);
});

test('cashier cannot create product', function () {
    $cashier = User::factory()->cashier()->create();
    $cat = Category::factory()->create();

    $response = $this->actingAs($cashier, 'sanctum')
        ->postJson('/api/v1/products', [
            'sku' => 'UNAUTH-SKU',
            'name' => 'Unauthorized Product',
            'category_id' => $cat->id,
            'cost_price' => 10,
            'sell_price' => 20,
        ]);

    $response->assertStatus(403);
});

test('admin can update product', function () {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create(['sell_price' => 50.00]);

    $response = $this->actingAs($admin, 'sanctum')
        ->putJson("/api/v1/products/{$product->id}", [
            'sell_price' => 59.99,
            'reorder_level' => 15,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.sell_price', '59.99')
        ->assertJsonPath('data.reorder_level', 15);

    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'sell_price' => 59.99,
        'reorder_level' => 15,
    ]);
});

test('cashier cannot update product', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create();

    $response = $this->actingAs($cashier, 'sanctum')
        ->putJson("/api/v1/products/{$product->id}", [
            'name' => 'Hacked Name',
        ]);

    $response->assertStatus(403);
});

test('admin can soft delete product', function () {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $response = $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/v1/products/{$product->id}");

    $response->assertStatus(200);

    $this->assertSoftDeleted('products', ['id' => $product->id]);

    // Product should no longer appear in standard index
    $indexResponse = $this->actingAs($admin, 'sanctum')
        ->getJson('/api/v1/products');

    $indexResponse->assertJsonMissing(['id' => $product->id]);
});

test('low stock endpoint returns only products at or below reorder level', function () {
    $user = User::factory()->cashier()->create();

    Product::factory()->create([
        'sku' => 'LOW-STOCK-1',
        'stock_qty' => 3,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    Product::factory()->create([
        'sku' => 'NORMAL-STOCK-1',
        'stock_qty' => 50,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/products/low-stock');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.sku', 'LOW-STOCK-1')
        ->assertJsonPath('data.0.is_low_stock', true);
});
