<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

test('admin can import products from valid csv file', function () {
    $admin = User::factory()->admin()->create();

    $csvContent = implode("\n", [
        'sku,name,category,cost_price,sell_price,stock_qty,reorder_level,description',
        'CSV-001,Wireless Mouse,Peripherals,15.00,29.99,50,10,Ergonomic wireless optical mouse',
        'CSV-002,Mechanical Keyboard,Peripherals,45.00,89.99,20,5,RGB Backlit mechanical keyboard',
    ]);

    $file = UploadedFile::fake()->createWithContent('products.csv', $csvContent);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/products/import', [
            'file' => $file,
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'imported_count' => 2,
            'error_count' => 0,
        ]);

    $this->assertDatabaseHas('products', [
        'sku' => 'CSV-001',
        'stock_qty' => 50,
    ]);

    $this->assertDatabaseHas('products', [
        'sku' => 'CSV-002',
        'stock_qty' => 20,
    ]);

    $this->assertDatabaseHas('categories', [
        'name' => 'Peripherals',
    ]);
});

test('csv import validates missing required headers', function () {
    $admin = User::factory()->admin()->create();

    $csvContent = implode("\n", [
        'name,category,cost_price',
        'Missing SKU Item,Peripherals,10.00',
    ]);

    $file = UploadedFile::fake()->createWithContent('invalid_headers.csv', $csvContent);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/products/import', [
            'file' => $file,
        ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => "CSV is missing the required 'sku' column."]);
});

test('csv import reports row errors but imports valid rows', function () {
    $admin = User::factory()->admin()->create();

    $csvContent = implode("\n", [
        'sku,name,category,cost_price,sell_price,stock_qty,reorder_level,description',
        'CSV-VALID-01,Valid Item,Hardware,10.00,20.00,10,5,Valid product',
        ',Missing SKU Name,Hardware,10.00,20.00,10,5,Invalid',
        'CSV-INVALID-PRICE,Bad Price,Hardware,-5.00,20.00,10,5,Invalid cost',
    ]);

    $file = UploadedFile::fake()->createWithContent('products.csv', $csvContent);

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/products/import', [
            'file' => $file,
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'imported_count' => 1,
            'error_count' => 2,
        ]);

    $this->assertDatabaseHas('products', ['sku' => 'CSV-VALID-01']);
    $this->assertDatabaseMissing('products', ['sku' => 'CSV-INVALID-PRICE']);
});

test('cashier cannot import products', function () {
    $cashier = User::factory()->cashier()->create();

    $file = UploadedFile::fake()->createWithContent('products.csv', "sku,name,category,cost_price,sell_price\n");

    $response = $this->actingAs($cashier, 'sanctum')
        ->postJson('/api/v1/products/import', [
            'file' => $file,
        ]);

    $response->assertStatus(403);
});

test('template endpoint downloads sample csv', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')
        ->get('/api/v1/products/csv-template');

    $response->assertStatus(200);
    expect($response->headers->get('Content-Disposition'))->toContain('product_import_template.csv');
    expect($response->headers->get('Content-Type'))->toContain('text/csv');
});
