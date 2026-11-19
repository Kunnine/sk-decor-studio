<?php

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('cron low stock digest endpoint requires valid bearer secret', function () {
    Config::set('app.cron_secret', 'super-secret-cron-token');

    $this->getJson('/api/v1/cron/low-stock-digest')
        ->assertStatus(401);

    $this->withHeader('Authorization', 'Bearer wrong-token')
        ->getJson('/api/v1/cron/low-stock-digest')
        ->assertStatus(401);

    $this->withHeader('Authorization', 'Bearer super-secret-cron-token')
        ->getJson('/api/v1/cron/low-stock-digest')
        ->assertStatus(200)
        ->assertJsonStructure(['status', 'output'])
        ->assertJsonPath('status', 'ok');
});

test('cron endpoint rejects requests when cron secret is not configured', function () {
    Config::set('app.cron_secret', null);

    $this->withHeader('Authorization', 'Bearer anything')
        ->getJson('/api/v1/cron/low-stock-digest')
        ->assertStatus(401);
});

test('product media urls resolve directly on s3 public disk without remote exists check', function () {
    Storage::forgetDisk('public');

    Config::set('filesystems.disks.public', [
        'driver' => 's3',
        'key' => 'test-key',
        'secret' => 'test-secret',
        'region' => 'auto',
        'bucket' => 'inventory-media',
        'url' => 'https://cdn.example.com',
        'endpoint' => 'https://account.r2.cloudflarestorage.com',
        'use_path_style_endpoint' => true,
        'throw' => false,
    ]);

    $product = Product::factory()->create([
        'image_path' => 'products/2026/11/lamp.webp',
        'thumb_path' => 'products/2026/11/lamp_thumb.webp',
    ]);

    expect($product->image_url)->toBe('https://cdn.example.com/products/2026/11/lamp.webp');
    expect($product->thumb_url)->toBe('https://cdn.example.com/products/2026/11/lamp_thumb.webp');

    Storage::forgetDisk('public');
});

test('product media urls return null on local disk when file does not exist', function () {
    Storage::fake('public');

    $product = Product::factory()->create([
        'image_path' => 'products/2026/11/missing.webp',
        'thumb_path' => 'products/2026/11/missing_thumb.webp',
    ]);

    expect($product->image_url)->toBeNull();
    expect($product->thumb_url)->toBeNull();
});

test('local filesystem disk resolves configured root path for ephemeral deployments', function () {
    expect(config('filesystems.disks.local.root'))->toBeString()->not->toBeEmpty();
});
