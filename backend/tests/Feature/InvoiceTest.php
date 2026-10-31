<?php

use App\Models\Product;
use App\Models\User;
use App\Services\SaleService;
use App\Services\SettingService;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(SettingSeeder::class);

    $this->admin = User::factory()->admin()->create();
    $this->manager = User::factory()->manager()->create();
    $this->cashier = User::factory()->cashier()->create();
    $this->otherCashier = User::factory()->cashier()->create();

    $this->product = Product::factory()->create([
        'sell_price' => 75.00,
        'cost_price' => 45.00,
        'avg_cost' => 45.00,
        'stock_qty' => 50,
    ]);

    $this->saleService = app(SaleService::class);
});

test('cashier can view own invoice pdf', function () {
    $sale = $this->saleService->create([
        'payment_method' => 'cash',
        'amount_paid' => 100.00,
        'items' => [
            ['product_id' => $this->product->id, 'qty' => 1],
        ],
    ], $this->cashier);

    $invoice = $sale->invoice;

    $response = $this->actingAs($this->cashier)->get("/api/v1/invoices/{$invoice->id}/pdf");

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');

    $content = file_get_contents($response->getFile()->getPathname());
    expect(str_starts_with($content, '%PDF'))->toBeTrue();
});

test('cashier cannot view invoice pdf of another cashier', function () {
    $sale = $this->saleService->create([
        'payment_method' => 'card',
        'items' => [
            ['product_id' => $this->product->id, 'qty' => 1],
        ],
    ], $this->otherCashier);

    $invoice = $sale->invoice;

    $response = $this->actingAs($this->cashier)->get("/api/v1/invoices/{$invoice->id}/pdf");

    $response->assertForbidden();
});

test('manager and admin can view any invoice pdf', function () {
    $sale = $this->saleService->create([
        'payment_method' => 'card',
        'items' => [
            ['product_id' => $this->product->id, 'qty' => 1],
        ],
    ], $this->cashier);

    $invoice = $sale->invoice;

    // Manager can view
    $responseManager = $this->actingAs($this->manager)->get("/api/v1/invoices/{$invoice->id}/pdf");
    $responseManager->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');

    // Admin can view
    $responseAdmin = $this->actingAs($this->admin)->get("/api/v1/invoices/{$invoice->id}/pdf");
    $responseAdmin->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');
});

test('download parameter triggers attachment content disposition', function () {
    $sale = $this->saleService->create([
        'payment_method' => 'cash',
        'amount_paid' => 100.00,
        'items' => [
            ['product_id' => $this->product->id, 'qty' => 1],
        ],
    ], $this->cashier);

    $invoice = $sale->invoice;

    $response = $this->actingAs($this->cashier)->get("/api/v1/invoices/{$invoice->id}/pdf?download=1");

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');

    $disposition = $response->headers->get('Content-Disposition');
    expect($disposition)->toContain('attachment');
    expect($disposition)->toContain("{$invoice->number}.pdf");
});

test('voided sale invoice pdf includes void watermark in content', function () {
    $sale = $this->saleService->create([
        'payment_method' => 'card',
        'items' => [
            ['product_id' => $this->product->id, 'qty' => 1],
        ],
    ], $this->cashier);

    $this->saleService->void($sale, 'Customer returned merchandise', $this->manager);

    $invoice = $sale->fresh()->invoice;

    $response = $this->actingAs($this->manager)->get("/api/v1/invoices/{$invoice->id}/pdf");

    $response->assertOk();
    $content = file_get_contents($response->getFile()->getPathname());

    expect(str_starts_with($content, '%PDF'))->toBeTrue();
    expect(strlen($content))->toBeGreaterThan(1000);

    // Verify blade template includes watermark when voided
    $renderedHtml = view('invoices.template', [
        'invoice' => $invoice,
        'sale' => $sale->fresh(),
        'settings' => app(SettingService::class)->all(),
        'currencySymbol' => '$',
        'taxRate' => 10,
    ])->render();

    expect($renderedHtml)->toContain('watermark">VOID');
    expect($renderedHtml)->toContain('THIS SALE HAS BEEN VOIDED');
});
