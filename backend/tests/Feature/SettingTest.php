<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('all authenticated users can read settings', function () {
    $cashier = User::factory()->cashier()->create();

    $response = $this->actingAs($cashier, 'sanctum')->getJson('/api/v1/settings');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'business_name',
                'currency_code',
                'currency_symbol',
                'tax_rate',
                'default_reorder_level',
                'invoice_prefix',
                'date_format',
            ],
        ]);
});

test('admin can update settings', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')->putJson('/api/v1/settings', [
        'business_name' => 'Metro Retail Enterprise',
        'currency_code' => 'EUR',
        'currency_symbol' => '€',
        'tax_rate' => 19.5,
        'default_reorder_level' => 15,
        'invoice_prefix' => 'INV-EU',
        'date_format' => 'DD/MM/YYYY',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.business_name', 'Metro Retail Enterprise')
        ->assertJsonPath('data.currency_symbol', '€');

    $this->assertDatabaseHas('settings', [
        'key' => 'currency_symbol',
        'value' => '€',
    ]);
});

test('settings test: changing currency symbol changes what /me returns', function () {
    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create();

    // Initially currency_symbol is default '$'
    $initialMe = $this->actingAs($cashier, 'sanctum')->getJson('/api/v1/me');
    $initialMe->assertStatus(200)
        ->assertJsonPath('settings.currency_symbol', '$');

    // Admin updates currency symbol to '£'
    $this->actingAs($admin, 'sanctum')->putJson('/api/v1/settings', [
        'business_name' => 'British Emporium',
        'currency_code' => 'GBP',
        'currency_symbol' => '£',
        'tax_rate' => 20,
        'default_reorder_level' => 12,
        'invoice_prefix' => 'UK',
        'date_format' => 'DD/MM/YYYY',
    ])->assertStatus(200);

    // Now cashier calls /me again; it must immediately reflect '£' due to cache invalidation
    $updatedMe = $this->actingAs($cashier, 'sanctum')->getJson('/api/v1/me');
    $updatedMe->assertStatus(200)
        ->assertJsonPath('settings.currency_symbol', '£')
        ->assertJsonPath('settings.business_name', 'British Emporium');
});

test('manager and cashier cannot update settings', function () {
    $manager = User::factory()->manager()->create();
    $cashier = User::factory()->cashier()->create();

    $this->actingAs($manager, 'sanctum')->putJson('/api/v1/settings', [
        'business_name' => 'Hacked Name',
        'currency_code' => 'USD',
        'currency_symbol' => '$',
        'tax_rate' => 10,
        'default_reorder_level' => 10,
        'invoice_prefix' => 'INV',
        'date_format' => 'YYYY-MM-DD',
    ])->assertStatus(403);

    $this->actingAs($cashier, 'sanctum')->putJson('/api/v1/settings', [
        'business_name' => 'Hacked Name',
        'currency_code' => 'USD',
        'currency_symbol' => '$',
        'tax_rate' => 10,
        'default_reorder_level' => 10,
        'invoice_prefix' => 'INV',
        'date_format' => 'YYYY-MM-DD',
    ])->assertStatus(403);
});

test('admin can upload business logo', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();

    $logo = UploadedFile::fake()->image('logo.png', 400, 200);

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/settings/logo', [
        'logo' => $logo,
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['message', 'data' => ['business_logo', 'business_logo_url']]);

    $path = $response->json('data.business_logo');
    Storage::disk('public')->assertExists($path);
});
