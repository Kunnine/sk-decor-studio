<?php

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->manager = User::factory()->manager()->create();
    $this->cashier = User::factory()->cashier()->create();
});

test('authenticated users can list customers with search and pagination', function () {
    Customer::factory()->create(['name' => 'Alice Walker', 'phone' => '123456789']);
    Customer::factory()->create(['name' => 'Bob Smith', 'phone' => '987654321']);

    $response = $this->actingAs($this->cashier)
        ->getJson('/api/v1/customers?search=Alice');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Alice Walker');
});

test('fast search endpoint returns matching customers for autocomplete', function () {
    Customer::factory()->create(['name' => 'Jane Doe', 'phone' => '555-0199', 'email' => 'jane@example.com']);
    Customer::factory()->create(['name' => 'John Wayne', 'phone' => '555-0188', 'email' => 'john@example.com']);

    $response = $this->actingAs($this->cashier)
        ->getJson('/api/v1/customers/search?q=Jane');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Jane Doe');
});

test('cashier can create a customer', function () {
    $response = $this->actingAs($this->cashier)
        ->postJson('/api/v1/customers', [
            'name' => 'Michael Scott',
            'phone' => '555-1234',
            'email' => 'michael@dundermifflin.com',
            'address' => 'Scranton, PA',
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Michael Scott');

    $this->assertDatabaseHas('customers', [
        'name' => 'Michael Scott',
        'email' => 'michael@dundermifflin.com',
    ]);
});

test('cashier cannot update or delete customer', function () {
    $customer = Customer::factory()->create();

    $updateResponse = $this->actingAs($this->cashier)
        ->putJson("/api/v1/customers/{$customer->id}", [
            'name' => 'Changed Name',
        ]);
    $updateResponse->assertForbidden();

    $deleteResponse = $this->actingAs($this->cashier)
        ->deleteJson("/api/v1/customers/{$customer->id}");
    $deleteResponse->assertForbidden();
});

test('manager and admin can update customer', function () {
    $customer = Customer::factory()->create(['name' => 'Dwight Schrute']);

    $response = $this->actingAs($this->manager)
        ->putJson("/api/v1/customers/{$customer->id}", [
            'name' => 'Dwight K. Schrute',
            'phone' => '555-9999',
        ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'Dwight K. Schrute');

    $this->assertDatabaseHas('customers', [
        'id' => $customer->id,
        'name' => 'Dwight K. Schrute',
    ]);
});

test('admin can soft delete customer', function () {
    $customer = Customer::factory()->create();

    $response = $this->actingAs($this->admin)
        ->deleteJson("/api/v1/customers/{$customer->id}");

    $response->assertOk();
    $this->assertSoftDeleted('customers', ['id' => $customer->id]);
});
