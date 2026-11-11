<?php

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Unit;
use App\Models\User;
use App\Services\SaleService;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('cashier and manager get 403 on audit logs endpoint', function () {
    $cashier = User::factory()->cashier()->create();
    $manager = User::factory()->manager()->create();

    $this->actingAs($cashier)->getJson('/api/v1/audit-logs')->assertStatus(403);
    $this->actingAs($manager)->getJson('/api/v1/audit-logs')->assertStatus(403);
});

test('audit log records product price and cost changes, settings changes, user changes, stock adjustments, and voids', function () {
    $admin = User::factory()->admin()->create(['email' => 'admin_audit@test.com']);
    $cat = Category::create(['name' => 'Audit Cat', 'slug' => 'audit-cat']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    // 1. User Changes (Create & Toggle Active)
    $this->actingAs($admin)->postJson('/api/v1/users', [
        'name' => 'New Audit Staff',
        'email' => 'staff_audit@test.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'cashier',
        'is_active' => true,
    ])->assertCreated();

    $staffUser = User::where('email', 'staff_audit@test.com')->firstOrFail();
    $this->actingAs($admin)->patchJson("/api/v1/users/{$staffUser->id}/toggle-active")->assertOk();

    // 2. Settings Changes
    $this->actingAs($admin)->putJson('/api/v1/settings', [
        'business_name' => 'New Audited Business',
        'currency_code' => 'USD',
        'currency_symbol' => '$',
        'tax_rate' => 12.50,
        'default_reorder_level' => 15,
        'invoice_prefix' => 'AUDIT',
        'date_format' => 'YYYY-MM-DD',
    ])->assertOk();

    // 3. Product price and cost changes
    $product = Product::create([
        'sku' => 'AUDIT-P1',
        'name' => 'Audited Product',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 10.00,
        'sell_price' => 20.00,
        'stock_qty' => 50,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    $this->actingAs($admin)->putJson("/api/v1/products/{$product->id}", [
        'sku' => 'AUDIT-P1',
        'name' => 'Audited Product Updated',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 15.00, // Changed from 10 to 15
        'sell_price' => 28.00, // Changed from 20 to 28
        'reorder_level' => 10,
    ])->assertOk();

    // 4. Stock Adjustment
    app(StockService::class)->adjust($product, 5, 'Audit count correction', $admin);

    // 5. Void Sale
    $sale = Sale::create([
        'user_id' => $admin->id,
        'status' => Sale::STATUS_COMPLETED,
        'subtotal' => 28.00,
        'total' => 28.00,
        'payment_method' => 'cash',
        'amount_paid' => 28.00,
        'sold_at' => now(),
    ]);
    SaleItem::create(['sale_id' => $sale->id, 'product_id' => $product->id, 'qty' => 1, 'unit_price' => 28.00, 'unit_cost' => 15.00, 'line_total' => 28.00]);
    app(SaleService::class)->void($sale, 'Testing void audit', $admin);

    // Verify all actions exist in audit_logs table
    $logsRes = $this->actingAs($admin)->getJson('/api/v1/audit-logs');
    $logsRes->assertOk();

    $actions = collect($logsRes->json('data'))->pluck('action')->toArray();
    $entities = collect($logsRes->json('data'))->pluck('entity')->toArray();

    expect($entities)->toContain('User');
    expect($entities)->toContain('Setting');
    expect($entities)->toContain('Product');
    expect($entities)->toContain('StockAdjustment');
    expect($entities)->toContain('Sale');

    expect($actions)->toContain('created');
    expect($actions)->toContain('deactivated');
    expect($actions)->toContain('updated');
    expect($actions)->toContain('price_changed');
    expect($actions)->toContain('adjusted');
    expect($actions)->toContain('voided');
});

test('admin can filter audit logs by entity and action', function () {
    $admin = User::factory()->admin()->create();

    AuditLog::create([
        'user_id' => $admin->id,
        'action' => 'price_changed',
        'entity' => 'Product',
        'entity_id' => 101,
        'changes' => ['cost_price' => ['old' => 10, 'new' => 15]],
        'ip' => '127.0.0.1',
        'created_at' => now(),
    ]);

    AuditLog::create([
        'user_id' => $admin->id,
        'action' => 'voided',
        'entity' => 'Sale',
        'entity_id' => 202,
        'changes' => ['reason' => 'Customer return'],
        'ip' => '127.0.0.1',
        'created_at' => now(),
    ]);

    $res1 = $this->actingAs($admin)->getJson('/api/v1/audit-logs?entity=Sale');
    $res1->assertOk();
    expect($res1->json('data'))->toHaveCount(1);
    expect($res1->json('data.0.entity'))->toBe('Sale');

    $res2 = $this->actingAs($admin)->getJson('/api/v1/audit-logs?action=price_changed');
    $res2->assertOk();
    expect($res2->json('data'))->toHaveCount(1);
    expect($res2->json('data.0.action'))->toBe('price_changed');
});
