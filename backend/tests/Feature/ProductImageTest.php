<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('valid image upload creates main and thumbnail WebP files on public disk', function () {
    Storage::fake('public');

    $manager = User::factory()->manager()->create();
    $product = Product::factory()->create();

    $file = UploadedFile::fake()->image('laptop.jpg', 600, 600);

    $response = $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/image", [
            'image' => $file,
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'data' => ['id', 'image_url', 'thumb_url'],
        ]);

    $product->refresh();
    expect($product->image_path)->not->toBeNull();
    expect($product->thumb_path)->not->toBeNull();
    expect($product->image_path)->toEndWith('.webp');
    expect($product->thumb_path)->toEndWith('.webp');

    Storage::disk('public')->assertExists($product->image_path);
    Storage::disk('public')->assertExists($product->thumb_path);
});

test('image upload rejects wrong mime type, oversize file, and undersized dimensions', function () {
    Storage::fake('public');

    $manager = User::factory()->manager()->create();
    $product = Product::factory()->create();

    // 1. Wrong type (text file with fake image extension)
    $fakeText = UploadedFile::fake()->create('fake.jpg', 100, 'text/plain');
    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/image", ['image' => $fakeText])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['image']);

    // 2. Oversize (> 2MB = 2048 KB)
    $oversize = UploadedFile::fake()->image('huge.png', 800, 800)->size(2500);
    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/image", ['image' => $oversize])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['image']);

    // 3. Undersized dimensions (< 200x200 px)
    $tiny = UploadedFile::fake()->image('tiny.png', 150, 150);
    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/image", ['image' => $tiny])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['image']);
});

test('replacing product image deletes old files from storage', function () {
    Storage::fake('public');

    $manager = User::factory()->manager()->create();
    $product = Product::factory()->create();

    // First image upload
    $file1 = UploadedFile::fake()->image('first.png', 400, 400);
    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/image", ['image' => $file1]);

    $product->refresh();
    $oldMain = $product->image_path;
    $oldThumb = $product->thumb_path;

    Storage::disk('public')->assertExists($oldMain);
    Storage::disk('public')->assertExists($oldThumb);

    // Second image upload (replacement)
    $file2 = UploadedFile::fake()->image('second.png', 500, 500);
    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/image", ['image' => $file2]);

    $product->refresh();
    $newMain = $product->image_path;
    $newThumb = $product->thumb_path;

    // Old files must be removed
    Storage::disk('public')->assertMissing($oldMain);
    Storage::disk('public')->assertMissing($oldThumb);

    // New files must exist
    Storage::disk('public')->assertExists($newMain);
    Storage::disk('public')->assertExists($newThumb);
});

test('deleting product image removes files from storage and clears database fields', function () {
    Storage::fake('public');

    $manager = User::factory()->manager()->create();
    $product = Product::factory()->create();

    $file = UploadedFile::fake()->image('delete_me.png', 400, 400);
    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/image", ['image' => $file]);

    $product->refresh();
    $mainPath = $product->image_path;
    $thumbPath = $product->thumb_path;

    // Delete image
    $response = $this->actingAs($manager, 'sanctum')
        ->deleteJson("/api/v1/products/{$product->id}/image");

    $response->assertStatus(200);

    $product->refresh();
    expect($product->image_path)->toBeNull();
    expect($product->thumb_path)->toBeNull();

    Storage::disk('public')->assertMissing($mainPath);
    Storage::disk('public')->assertMissing($thumbPath);
});

test('soft deleting product preserves its image files', function () {
    Storage::fake('public');

    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create();

    $file = UploadedFile::fake()->image('keep_me.png', 400, 400);
    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/image", ['image' => $file]);

    $product->refresh();
    $mainPath = $product->image_path;

    // Delete product (soft delete)
    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/v1/products/{$product->id}")
        ->assertStatus(200);

    // Files are preserved according to spec
    Storage::disk('public')->assertExists($mainPath);
});

test('product update endpoint with remove_image clears stored image files', function () {
    Storage::fake('public');

    $manager = User::factory()->manager()->create();
    $product = Product::factory()->create();

    $file = UploadedFile::fake()->image('temporary.png', 400, 400);
    $this->actingAs($manager, 'sanctum')
        ->postJson("/api/v1/products/{$product->id}/image", ['image' => $file]);

    $product->refresh();
    $mainPath = $product->image_path;
    $thumbPath = $product->thumb_path;
    expect($mainPath)->not->toBeNull();

    // Now update product with remove_image=1
    $response = $this->actingAs($manager, 'sanctum')
        ->putJson("/api/v1/products/{$product->id}", [
            'sku' => $product->sku,
            'name' => $product->name,
            'category_id' => $product->category_id,
            'cost_price' => $product->cost_price,
            'sell_price' => $product->sell_price,
            'stock_qty' => $product->stock_qty,
            'reorder_level' => $product->reorder_level,
            'is_active' => true,
            'remove_image' => true,
        ]);

    $response->assertStatus(200);

    $product->refresh();
    expect($product->image_path)->toBeNull();
    expect($product->thumb_path)->toBeNull();
    Storage::disk('public')->assertMissing($mainPath);
    Storage::disk('public')->assertMissing($thumbPath);
});

test('creating a product with an image stores image and thumbnail files', function () {
    Storage::fake('public');

    $manager = User::factory()->manager()->create();
    $cat = Category::factory()->create();
    $file = UploadedFile::fake()->image('create_product.png', 400, 400);

    $response = $this->actingAs($manager, 'sanctum')
        ->postJson('/api/v1/products', [
            'sku' => 'SKU-IMG-001',
            'name' => 'Product With Image',
            'category_id' => $cat->id,
            'cost_price' => 20.00,
            'sell_price' => 45.00,
            'stock_qty' => 10,
            'reorder_level' => 3,
            'is_active' => true,
            'image' => $file,
        ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'message',
            'data' => ['id', 'sku', 'name', 'image_url', 'thumb_url'],
        ]);

    $product = Product::where('sku', 'SKU-IMG-001')->firstOrFail();
    expect($product->image_path)->not->toBeNull();
    expect($product->thumb_path)->not->toBeNull();
    expect($response->json('data.image_url'))->not->toBeNull();
    expect($response->json('data.thumb_url'))->not->toBeNull();

    Storage::disk('public')->assertExists($product->image_path);
    Storage::disk('public')->assertExists($product->thumb_path);
});

test('creating products supports jpg, jpeg, png, and webp images and logs initial stock movement', function () {
    Storage::fake('public');

    $manager = User::factory()->manager()->create();
    $cat = Category::factory()->create();

    foreach (['jpg', 'jpeg', 'png', 'webp'] as $idx => $ext) {
        $file = UploadedFile::fake()->image("decor_{$idx}.{$ext}", 350, 350);
        $sku = 'SKU-FMT-'.strtoupper($ext);

        $response = $this->actingAs($manager, 'sanctum')
            ->post('/api/v1/products', [
                'sku' => $sku,
                'name' => "Decor Item {$ext}",
                'description' => "Finish {$ext}",
                'category_id' => $cat->id,
                'cost_price' => 25.00,
                'sell_price' => 60.00,
                'stock_qty' => 7,
                'reorder_level' => 2,
                'is_active' => '1',
                'image' => $file,
            ], ['Accept' => 'application/json']);

        $response->assertStatus(201);

        $product = Product::where('sku', $sku)->firstOrFail();
        expect($product->image_path)->toEndWith('.webp');
        expect($product->thumb_path)->toEndWith('.webp');
        Storage::disk('public')->assertExists($product->image_path);
        Storage::disk('public')->assertExists($product->thumb_path);

        $movementSum = (int) StockMovement::where('product_id', $product->id)->sum('qty_change');
        expect($movementSum)->toBe(7);
        expect($product->stock_qty)->toBe(7);
    }
});

test('editing product via multipart _method=PUT replaces image, removes old files, updates all fields without duplicate, and supports remove_image=1', function () {
    Storage::fake('public');

    $manager = User::factory()->manager()->create();
    $parent1 = Category::factory()->create(['name' => 'Lighting']);
    $subcat1 = Category::factory()->create(['name' => 'Table Lamps', 'parent_id' => $parent1->id]);
    $parent2 = Category::factory()->create(['name' => 'Vases']);
    $subcat2 = Category::factory()->create(['name' => 'Ceramic Vases', 'parent_id' => $parent2->id]);
    $sup1 = Supplier::create(['name' => 'Supplier One']);
    $sup2 = Supplier::create(['name' => 'Supplier Two']);

    $firstImage = UploadedFile::fake()->image('initial.png', 400, 400);
    $createRes = $this->actingAs($manager, 'sanctum')
        ->post('/api/v1/products', [
            'sku' => 'EDIT-SKU-01',
            'name' => 'Original Table Lamp',
            'description' => 'Warm brass finish',
            'category_id' => $subcat1->id,
            'supplier_id' => $sup1->id,
            'cost_price' => 30.00,
            'sell_price' => 75.00,
            'stock_qty' => 10,
            'reorder_level' => 3,
            'is_active' => '1',
            'image' => $firstImage,
        ], ['Accept' => 'application/json']);
    $createRes->assertStatus(201);

    $product = Product::firstOrFail();
    $oldMain = $product->image_path;
    $oldThumb = $product->thumb_path;
    Storage::disk('public')->assertExists($oldMain);
    Storage::disk('public')->assertExists($oldThumb);

    // Replace image and update all product fields via multipart _method=PUT (same as frontend FormData)
    $replacementImage = UploadedFile::fake()->image('updated.jpg', 500, 500);
    $updateRes = $this->actingAs($manager, 'sanctum')
        ->post("/api/v1/products/{$product->id}", [
            '_method' => 'PUT',
            'sku' => 'EDIT-SKU-01-REV',
            'name' => 'Fluted Ceramic Vase',
            'description' => 'Hand-glazed travertine stone',
            'category_id' => $subcat2->id,
            'supplier_id' => $sup2->id,
            'cost_price' => 42.50,
            'sell_price' => 115.00,
            'stock_qty' => 18,
            'reorder_level' => 6,
            'is_active' => '1',
            'image' => $replacementImage,
        ], ['Accept' => 'application/json']);

    $updateRes->assertStatus(200)
        ->assertJsonPath('data.id', $product->id)
        ->assertJsonPath('data.sku', 'EDIT-SKU-01-REV')
        ->assertJsonPath('data.name', 'Fluted Ceramic Vase')
        ->assertJsonPath('data.description', 'Hand-glazed travertine stone')
        ->assertJsonPath('data.category_id', $subcat2->id)
        ->assertJsonPath('data.supplier_id', $sup2->id)
        ->assertJsonPath('data.cost_price', '42.50')
        ->assertJsonPath('data.sell_price', '115.00')
        ->assertJsonPath('data.stock_qty', 18)
        ->assertJsonPath('data.reorder_level', 6);

    expect(Product::count())->toBe(1);
    $product->refresh();

    Storage::disk('public')->assertMissing($oldMain);
    Storage::disk('public')->assertMissing($oldThumb);
    Storage::disk('public')->assertExists($product->image_path);
    Storage::disk('public')->assertExists($product->thumb_path);

    $newMain = $product->image_path;
    $newThumb = $product->thumb_path;

    // Now reduce stock and remove image via FormData remove_image=1
    $removeRes = $this->actingAs($manager, 'sanctum')
        ->post("/api/v1/products/{$product->id}", [
            '_method' => 'PUT',
            'sku' => 'EDIT-SKU-01-REV',
            'name' => 'Fluted Ceramic Vase',
            'description' => '',
            'category_id' => $subcat2->id,
            'supplier_id' => $sup2->id,
            'cost_price' => 42.50,
            'sell_price' => 115.00,
            'stock_qty' => 5,
            'reorder_level' => 6,
            'is_active' => '1',
            'remove_image' => '1',
        ], ['Accept' => 'application/json']);

    $removeRes->assertStatus(200)
        ->assertJsonPath('data.image_url', null)
        ->assertJsonPath('data.thumb_url', null)
        ->assertJsonPath('data.stock_qty', 5)
        ->assertJsonPath('data.description', null);

    $product->refresh();
    expect($product->image_path)->toBeNull();
    expect($product->thumb_path)->toBeNull();
    Storage::disk('public')->assertMissing($newMain);
    Storage::disk('public')->assertMissing($newThumb);

    $ledgerSum = (int) StockMovement::where('product_id', $product->id)->sum('qty_change');
    expect($ledgerSum)->toBe(5);
});
