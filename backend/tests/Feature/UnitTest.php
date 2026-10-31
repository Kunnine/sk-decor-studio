<?php

use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated users can list units', function () {
    $cashier = User::factory()->cashier()->create();
    Unit::factory()->create(['name' => 'Piece', 'short_name' => 'pc']);
    Unit::factory()->create(['name' => 'Kilogram', 'short_name' => 'kg']);

    $response = $this->actingAs($cashier, 'sanctum')->getJson('/api/v1/units');

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

test('admin and manager can create and update units', function () {
    $manager = User::factory()->manager()->create();

    $response = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/units', [
        'name' => 'Metric Ton',
        'short_name' => 't',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Metric Ton')
        ->assertJsonPath('data.short_name', 't');

    $unitId = $response->json('data.id');

    $updateResponse = $this->actingAs($manager, 'sanctum')->putJson("/api/v1/units/{$unitId}", [
        'name' => 'Metric Tonne',
        'short_name' => 'tonne',
    ]);

    $updateResponse->assertStatus(200)
        ->assertJsonPath('data.name', 'Metric Tonne');
});

test('cashier cannot create or update units', function () {
    $cashier = User::factory()->cashier()->create();
    $unit = Unit::factory()->create();

    $this->actingAs($cashier, 'sanctum')->postJson('/api/v1/units', [
        'name' => 'Forbidden Unit',
        'short_name' => 'fb',
    ])->assertStatus(403);

    $this->actingAs($cashier, 'sanctum')->putJson("/api/v1/units/{$unit->id}", [
        'name' => 'Hacked',
    ])->assertStatus(403);
});

test('cannot delete unit that is in use by products', function () {
    $admin = User::factory()->admin()->create();
    $unit = Unit::factory()->create();
    Product::factory()->create(['unit_id' => $unit->id]);

    $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/units/{$unit->id}");

    $response->assertStatus(422)
        ->assertJsonPath('message', 'Cannot delete unit because it is currently assigned to one or more products.');

    $this->assertDatabaseHas('units', ['id' => $unit->id]);
});
