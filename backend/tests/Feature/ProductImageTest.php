<?php

use App\Models\Product;
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
