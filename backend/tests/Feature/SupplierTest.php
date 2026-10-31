<?php

use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin and manager can list suppliers with search', function () {
    $manager = User::factory()->manager()->create();
    Supplier::create(['name' => 'Acme Supplies', 'phone' => '123-456']);
    Supplier::create(['name' => 'Zenith Tech', 'phone' => '987-654']);

    $response = $this->actingAs($manager, 'sanctum')
        ->getJson('/api/v1/suppliers?search=Acme');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Acme Supplies');
});

test('admin and manager can create supplier', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson('/api/v1/suppliers', [
            'name' => 'Global Micro Distribution',
            'phone' => '+1-555-9000',
            'email' => 'sales@globalmicro.test',
            'address' => '500 Logistics Blvd, Dallas, TX',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Global Micro Distribution')
        ->assertJsonPath('data.phone', '+1-555-9000');

    $this->assertDatabaseHas('suppliers', [
        'name' => 'Global Micro Distribution',
    ]);
});

test('cashier cannot access suppliers', function () {
    $cashier = User::factory()->cashier()->create();
    $supplier = Supplier::create(['name' => 'Forbidden Supplier']);

    $this->actingAs($cashier, 'sanctum')
        ->getJson('/api/v1/suppliers')
        ->assertStatus(403);

    $this->actingAs($cashier, 'sanctum')
        ->postJson('/api/v1/suppliers', ['name' => 'New'])
        ->assertStatus(403);

    $this->actingAs($cashier, 'sanctum')
        ->putJson("/api/v1/suppliers/{$supplier->id}", ['name' => 'Edit'])
        ->assertStatus(403);

    $this->actingAs($cashier, 'sanctum')
        ->deleteJson("/api/v1/suppliers/{$supplier->id}")
        ->assertStatus(403);
});

test('admin can update and soft delete supplier', function () {
    $admin = User::factory()->admin()->create();
    $supplier = Supplier::create(['name' => 'Old Supplier Name']);

    $this->actingAs($admin, 'sanctum')
        ->putJson("/api/v1/suppliers/{$supplier->id}", [
            'name' => 'Renamed Supplier Inc',
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.name', 'Renamed Supplier Inc');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/v1/suppliers/{$supplier->id}")
        ->assertStatus(200);

    $this->assertSoftDeleted('suppliers', ['id' => $supplier->id]);
});
