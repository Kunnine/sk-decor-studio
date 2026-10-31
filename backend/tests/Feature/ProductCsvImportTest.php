<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

test('template endpoint downloads sample csv with correct headers', function () {
    $user = User::factory()->cashier()->create();

    $response = $this->actingAs($user, 'sanctum')->get('/api/v1/products/import/template');

    $response->assertStatus(200);
    expect($response->headers->get('content-type'))->toContain('text/csv');
    expect($response->streamedContent())->toContain('sku,name,description,category,unit,cost_price,sell_price,stock_qty,reorder_level');
});

test('csv import preview reports row errors and returns valid preview token', function () {
    $admin = User::factory()->admin()->create();

    $csvContent = implode("\n", [
        'sku,name,description,category,unit,cost_price,sell_price,stock_qty,reorder_level',
        'SKU-GOOD-01,Valid Mouse,Good mouse,Electronics,Piece,25.00,45.00,10,5',
        'SKU-BAD-02,,Missing name,Electronics,Piece,20.00,30.00,5,2', // bad row (missing name)
        'SKU-BAD-03,Negative Price,Desc,Electronics,Piece,-5.00,10.00,5,2', // bad row (negative cost)
    ]);

    $file = UploadedFile::fake()->createWithContent('import.csv', $csvContent);

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products/import/preview', [
        'file' => $file,
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'preview_token',
            'total_rows',
            'valid_rows_count',
            'error_count',
            'errors',
            'new_categories',
            'sample_rows',
        ])
        ->assertJsonPath('valid_rows_count', 1)
        ->assertJsonPath('error_count', 2);

    expect($response->json('errors'))->toHaveCount(2);
});

test('csv import commit imports valid rows and auto-creates missing categories and units', function () {
    $admin = User::factory()->admin()->create();

    $csvContent = implode("\n", [
        'sku,name,description,category,unit,cost_price,sell_price,stock_qty,reorder_level',
        'SKU-NEW-01,Ergonomic Chair,Comfortable chair,Office Furniture,Piece,150.00,249.00,20,5',
    ]);

    $file = UploadedFile::fake()->createWithContent('import.csv', $csvContent);

    // Step 1: Preview
    $preview = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products/import/preview', [
        'file' => $file,
    ])->assertStatus(200);

    $token = $preview->json('preview_token');

    // Step 2: Commit
    $commit = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products/import', [
        'preview_token' => $token,
        'create_missing_categories' => true,
        'create_missing_units' => true,
        'duplicate_sku_action' => 'skip',
    ]);

    $commit->assertStatus(200)
        ->assertJsonPath('imported_count', 1);

    $this->assertDatabaseHas('products', [
        'sku' => 'SKU-NEW-01',
        'name' => 'Ergonomic Chair',
    ]);

    $this->assertDatabaseHas('categories', [
        'name' => 'Office Furniture',
    ]);
});

test('csv import duplicate sku handling: skip vs update', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::factory()->create(['name' => 'Hardware']);

    // Existing product in DB
    $existing = Product::factory()->create([
        'sku' => 'SKU-EXIST-01',
        'name' => 'Old Name',
        'cost_price' => 10.00,
        'sell_price' => 20.00,
        'category_id' => $cat->id,
    ]);

    $csvContent = implode("\n", [
        'sku,name,description,category,unit,cost_price,sell_price,stock_qty,reorder_level',
        'SKU-EXIST-01,Updated Name,New desc,Hardware,Piece,15.00,29.99,10,5',
    ]);

    $file = UploadedFile::fake()->createWithContent('dupes.csv', $csvContent);

    // Preview
    $preview = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products/import/preview', [
        'file' => $file,
    ])->assertStatus(200);

    $token = $preview->json('preview_token');
    expect($preview->json('duplicate_skus'))->toContain('SKU-EXIST-01');

    // Commit with duplicate_sku_action => 'update'
    $commit = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/products/import', [
        'preview_token' => $token,
        'duplicate_sku_action' => 'update',
    ]);

    $commit->assertStatus(200)
        ->assertJsonPath('updated_count', 1)
        ->assertJsonPath('imported_count', 0);

    expect($existing->fresh()->name)->toBe('Updated Name');
    expect((float) $existing->fresh()->sell_price)->toBe(29.99);
});

test('cashier cannot preview or commit csv import', function () {
    $cashier = User::factory()->cashier()->create();
    $file = UploadedFile::fake()->create('test.csv', 10);

    $this->actingAs($cashier, 'sanctum')
        ->postJson('/api/v1/products/import/preview', ['file' => $file])
        ->assertStatus(403);

    $this->actingAs($cashier, 'sanctum')
        ->postJson('/api/v1/products/import', ['preview_token' => 'fake', 'duplicate_sku_action' => 'skip'])
        ->assertStatus(403);
});
