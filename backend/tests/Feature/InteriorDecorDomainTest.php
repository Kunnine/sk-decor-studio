<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\SettingSeeder;
use Database\Seeders\SupplierSeeder;
use Database\Seeders\UnitSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('category seeder builds exact 10 parent categories and 57 subcategories while archiving legacy items without breaking history', function () {
    $admin = User::factory()->admin()->create();
    $supplier = Supplier::create(['name' => 'Legacy Tech Wholesale']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    // Simulate existing legacy IT categories + historical purchase/sale before transformation
    $oldRoot = Category::create(['name' => 'Electronics', 'slug' => 'electronics']);
    $oldChild = Category::create(['name' => 'Computers & Workstations', 'slug' => 'computers-workstations', 'parent_id' => $oldRoot->id]);
    $oldLeaf = Category::create(['name' => 'Enterprise Laptops', 'slug' => 'enterprise-laptops', 'parent_id' => $oldChild->id]);

    $legacyProduct = Product::create([
        'sku' => 'LAP-OLD-01',
        'name' => 'Legacy Business Laptop',
        'category_id' => $oldLeaf->id,
        'unit_id' => $unit->id,
        'cost_price' => 500.00,
        'avg_cost' => 500.00,
        'sell_price' => 899.00,
        'stock_qty' => 4,
        'reorder_level' => 2,
        'is_active' => true,
    ]);

    $purchase = Purchase::create([
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-LEGACY-01',
        'status' => Purchase::STATUS_RECEIVED,
        'total' => 2000.00,
        'created_by' => $admin->id,
        'received_at' => now()->subDays(10),
    ]);
    PurchaseItem::create([
        'purchase_id' => $purchase->id,
        'product_id' => $legacyProduct->id,
        'qty' => 4,
        'unit_cost' => 500.00,
    ]);

    $sale = Sale::create([
        'user_id' => $admin->id,
        'status' => Sale::STATUS_COMPLETED,
        'subtotal' => 899.00,
        'discount' => 0.00,
        'tax' => 0.00,
        'total' => 899.00,
        'payment_method' => 'card',
        'amount_paid' => 899.00,
        'change_due' => 0.00,
        'sold_at' => now()->subDays(5),
    ]);
    SaleItem::create([
        'sale_id' => $sale->id,
        'product_id' => $legacyProduct->id,
        'qty' => 1,
        'unit_price' => 899.00,
        'unit_cost' => 500.00,
        'line_total' => 899.00,
    ]);

    (new CategorySeeder)->run();

    expect(Category::whereNull('parent_id')->count())->toBe(10);
    expect(Category::whereNotNull('parent_id')->count())->toBe(58);
    expect(Category::count())->toBe(68);

    // Table Runners appears cleanly under both Cushions & Textiles and Table Decor
    $tableRunnersCount = Category::where('name', 'Table Runners')->count();
    expect($tableRunnersCount)->toBe(2);

    // Legacy categories are removed and historical sale/purchase remain intact
    expect(Category::withTrashed()->where('slug', 'electronics')->exists())->toBeFalse();
    expect(Product::withTrashed()->find($legacyProduct->id)?->trashed())->toBeTrue();
    expect(Sale::find($sale->id))->not->toBeNull();
    expect(Purchase::find($purchase->id))->not->toBeNull();
});

test('home decor products support flexible attributes, multiple variants, and cashier cost masking', function () {
    $manager = User::factory()->manager()->create();
    $cashier = User::factory()->cashier()->create();
    $supplier = Supplier::create(['name' => 'Lumiere Atelier']);
    $parentCat = Category::create(['name' => 'Lighting', 'slug' => 'lighting']);
    $subCat = Category::create(['name' => 'Table Lamps', 'slug' => 'table-lamps', 'parent_id' => $parentCat->id]);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    $variantsJson = json_encode([
        [
            'sku' => 'LMP-ALAB-SM-WHT',
            'name' => 'Small Warm White',
            'color' => 'White',
            'size' => 'Small',
            'material' => 'Ceramic',
            'style' => 'Modern',
            'cost_price' => 30.00,
            'sell_price' => 68.00,
            'stock_qty' => 10,
            'reorder_level' => 3,
            'is_active' => true,
        ],
        [
            'sku' => 'LMP-ALAB-LG-BGE',
            'name' => 'Large Warm Beige',
            'color' => 'Beige',
            'size' => 'Large',
            'material' => 'Ceramic',
            'style' => 'Nordic',
            'cost_price' => 42.00,
            'sell_price' => 92.00,
            'stock_qty' => 6,
            'reorder_level' => 2,
            'is_active' => true,
        ],
    ]);

    $response = $this->actingAs($manager, 'sanctum')->post('/api/v1/products', [
        'sku' => 'LMP-ALAB-01',
        'name' => 'Alabaster Pleated Table Lamp',
        'category_id' => $subCat->id,
        'unit_id' => $unit->id,
        'supplier_id' => $supplier->id,
        'description' => 'Warm linen shade with glazed ceramic base.',
        'cost_price' => 30.00,
        'sell_price' => 68.00,
        'stock_qty' => 0,
        'reorder_level' => 4,
        'color' => 'White',
        'size' => 'Medium',
        'material' => 'Ceramic',
        'style' => 'Modern',
        'has_variants' => '1',
        'variants' => $variantsJson,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.supplier.name', 'Lumiere Atelier')
        ->assertJsonPath('data.parent_category.name', 'Lighting')
        ->assertJsonPath('data.category.name', 'Table Lamps')
        ->assertJsonPath('data.has_variants', true)
        ->assertJsonPath('data.stock_qty', 16)
        ->assertJsonCount(2, 'data.variants');

    $productId = $response->json('data.id');

    // Cashier must see variant stock and sell_price, but NOT cost_price/avg_cost
    $cashierRes = $this->actingAs($cashier, 'sanctum')->getJson("/api/v1/products/{$productId}");
    $cashierRes->assertStatus(200)
        ->assertJsonPath('data.variants.0.sell_price', '68.00')
        ->assertJsonPath('data.variants.0.stock_qty', 10);

    expect($cashierRes->json('data'))->not->toHaveKey('cost_price');
    expect($cashierRes->json('data.variants.0'))->not->toHaveKey('cost_price');
    expect($cashierRes->json('data.variants.0'))->not->toHaveKey('avg_cost');
});

test('product listing supports price range, stock status, parent category, supplier, and attribute filters', function () {
    $manager = User::factory()->manager()->create();
    $sup1 = Supplier::create(['name' => 'Studio A']);
    $sup2 = Supplier::create(['name' => 'Studio B']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    $lighting = Category::create(['name' => 'Lighting', 'slug' => 'lighting']);
    $lamps = Category::create(['name' => 'Table Lamps', 'slug' => 'table-lamps', 'parent_id' => $lighting->id]);
    $vases = Category::create(['name' => 'Vases & Pottery', 'slug' => 'vases-pottery']);

    Product::create([
        'sku' => 'DEC-01',
        'name' => 'Ceramic Ribbed Vase',
        'category_id' => $vases->id,
        'unit_id' => $unit->id,
        'supplier_id' => $sup1->id,
        'cost_price' => 15.00,
        'sell_price' => 45.00,
        'stock_qty' => 25,
        'reorder_level' => 5,
        'color' => 'White',
        'material' => 'Ceramic',
        'style' => 'Minimalist',
        'is_active' => true,
    ]);

    Product::create([
        'sku' => 'DEC-02',
        'name' => 'Nordic Walnut Table Lamp',
        'category_id' => $lamps->id,
        'unit_id' => $unit->id,
        'supplier_id' => $sup2->id,
        'cost_price' => 40.00,
        'sell_price' => 125.00,
        'stock_qty' => 3,
        'reorder_level' => 5,
        'color' => 'Brown',
        'material' => 'Wood',
        'style' => 'Nordic',
        'is_active' => true,
    ]);

    Product::create([
        'sku' => 'DEC-03',
        'name' => 'Glass Dome Pendulum',
        'category_id' => $lamps->id,
        'unit_id' => $unit->id,
        'supplier_id' => $sup2->id,
        'cost_price' => 60.00,
        'sell_price' => 180.00,
        'stock_qty' => 0,
        'reorder_level' => 4,
        'color' => 'Black',
        'material' => 'Glass',
        'style' => 'Modern',
        'is_active' => true,
    ]);

    // Filter by parent category + price range
    $this->actingAs($manager, 'sanctum')
        ->getJson("/api/v1/products?parent_category_id={$lighting->id}&min_price=100&max_price=150")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.sku', 'DEC-02');

    // Filter by stock_status=out_of_stock
    $this->actingAs($manager, 'sanctum')
        ->getJson('/api/v1/products?stock_status=out_of_stock')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.sku', 'DEC-03');

    // Filter by stock_status=low_stock (includes stock > 0 and <= reorder_level)
    $this->actingAs($manager, 'sanctum')
        ->getJson('/api/v1/products?stock_status=low_stock')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.sku', 'DEC-02');

    // Filter by supplier + material
    $this->actingAs($manager, 'sanctum')
        ->getJson("/api/v1/products?supplier_id={$sup1->id}&material=Ceramic")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.sku', 'DEC-01');
});

test('purchases, adjustments, and pos sales operate atomically at variant granularity and generate invoices', function () {
    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create();
    $supplier = Supplier::create(['name' => 'TerraCraft Studio']);
    $cat = Category::create(['name' => 'Cushions & Textiles', 'slug' => 'cushions-textiles']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    $product = Product::create([
        'sku' => 'PLW-BGE-01',
        'name' => 'Beige Throw Pillow',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'supplier_id' => $supplier->id,
        'cost_price' => 10.00,
        'avg_cost' => 10.00,
        'sell_price' => 32.00,
        'stock_qty' => 0,
        'reorder_level' => 5,
        'has_variants' => true,
        'is_active' => true,
    ]);

    $vSmall = ProductVariant::create([
        'product_id' => $product->id,
        'sku' => 'PLW-BGE-SM',
        'name' => 'Small Beige',
        'color' => 'Beige',
        'size' => 'Small',
        'material' => 'Fabric',
        'style' => 'Nordic',
        'cost_price' => 10.00,
        'avg_cost' => 10.00,
        'sell_price' => 30.00,
        'stock_qty' => 0,
        'reorder_level' => 3,
        'is_active' => true,
    ]);

    $vLarge = ProductVariant::create([
        'product_id' => $product->id,
        'sku' => 'PLW-BLK-LG',
        'name' => 'Large Black',
        'color' => 'Black',
        'size' => 'Large',
        'material' => 'Fabric',
        'style' => 'Modern',
        'cost_price' => 14.00,
        'avg_cost' => 14.00,
        'sell_price' => 42.00,
        'stock_qty' => 0,
        'reorder_level' => 3,
        'is_active' => true,
    ]);

    // Purchase both variants in a single PO
    $poRes = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/purchases', [
        'supplier_id' => $supplier->id,
        'ref_no' => 'PO-DECOR-VAR-01',
        'items' => [
            ['product_id' => $product->id, 'product_variant_id' => $vSmall->id, 'qty' => 5, 'unit_cost' => 12.00],
            ['product_id' => $product->id, 'product_variant_id' => $vLarge->id, 'qty' => 3, 'unit_cost' => 16.00],
        ],
    ]);
    $poRes->assertStatus(201);
    $purchaseId = $poRes->json('data.id');

    $this->actingAs($admin, 'sanctum')->postJson("/api/v1/purchases/{$purchaseId}/receive")->assertStatus(200);

    expect($vSmall->fresh()->stock_qty)->toBe(5);
    expect($vLarge->fresh()->stock_qty)->toBe(3);
    expect($product->fresh()->stock_qty)->toBe(8);

    // Adjust Small variant by +1
    $this->actingAs($admin, 'sanctum')->postJson('/api/v1/stock-adjustments', [
        'product_id' => $product->id,
        'product_variant_id' => $vSmall->id,
        'delta' => 1,
        'reason' => 'Showroom sample returned',
    ])->assertStatus(201);

    expect($vSmall->fresh()->stock_qty)->toBe(6);
    expect($product->fresh()->stock_qty)->toBe(9);

    // Selling without selecting variant must fail for has_variants=true product
    $this->actingAs($cashier, 'sanctum')->postJson('/api/v1/sales', [
        'payment_method' => 'cash',
        'amount_paid' => 50,
        'items' => [
            ['product_id' => $product->id, 'qty' => 1],
        ],
    ])->assertStatus(422);

    // Selling exceeding variant stock (7 > 6) must fail cleanly
    $this->actingAs($cashier, 'sanctum')->postJson('/api/v1/sales', [
        'payment_method' => 'cash',
        'amount_paid' => 500,
        'items' => [
            ['product_id' => $product->id, 'product_variant_id' => $vSmall->id, 'qty' => 7],
        ],
    ])->assertStatus(422);

    // Valid variant checkout: 2x vSmall (2 * 30 = 60)
    $saleRes = $this->actingAs($cashier, 'sanctum')->postJson('/api/v1/sales', [
        'payment_method' => 'card',
        'items' => [
            ['product_id' => $product->id, 'product_variant_id' => $vSmall->id, 'qty' => 2],
        ],
    ]);
    $saleRes->assertStatus(201)
        ->assertJsonPath('data.items.0.product_variant_id', $vSmall->id)
        ->assertJsonPath('data.items.0.line_total', '60.00');

    expect($vSmall->fresh()->stock_qty)->toBe(4);
    expect($product->fresh()->stock_qty)->toBe(7);

    // PDF Invoice endpoint works for variant sale
    $saleId = $saleRes->json('data.id');
    $invoiceId = $saleRes->json('data.invoice.id');
    $pdfRes = $this->actingAs($admin, 'sanctum')->get("/api/v1/invoices/{$invoiceId}/pdf");
    $pdfRes->assertStatus(200);

    // Voiding restores exact variant stock & parent total stock
    $this->actingAs($admin, 'sanctum')->postJson("/api/v1/sales/{$saleId}/void", [
        'reason' => 'Customer exchanged for larger cushion',
    ])->assertStatus(200);

    expect($vSmall->fresh()->stock_qty)->toBe(6);
    expect($product->fresh()->stock_qty)->toBe(9);
    expect((int) StockMovement::where('product_id', $product->id)->sum('qty_change'))->toBe(9);
});

test('analytics summary includes home decor catalog and inventory valuation totals', function () {
    $admin = User::factory()->admin()->create();
    $cat = Category::create(['name' => 'Wall Decor', 'slug' => 'wall-decor']);
    $unit = Unit::create(['name' => 'Piece', 'short_name' => 'pc']);

    Product::create([
        'sku' => 'WAL-01',
        'name' => 'Minimalist Wall Art',
        'category_id' => $cat->id,
        'unit_id' => $unit->id,
        'cost_price' => 25.00,
        'avg_cost' => 25.00,
        'sell_price' => 75.00,
        'stock_qty' => 10,
        'reorder_level' => 2,
        'is_active' => true,
    ]);

    $res = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/analytics/summary');
    $res->assertOk()
        ->assertJsonPath('data.total_products', 1)
        ->assertJsonPath('data.total_categories', 1);

    expect((float) $res->json('data.total_stock_value'))->toEqual(250.00);
});

test('decor seeders populate all 10 parent categories with realistic products and generated images', function () {
    Storage::fake('public');
    User::factory()->admin()->create(['email' => 'admin@decor.local']);

    (new SettingSeeder)->run();
    (new UnitSeeder)->run();
    (new SupplierSeeder)->run();
    (new CategorySeeder)->run();
    (new ProductSeeder)->run();

    expect(Category::whereNull('parent_id')->count())->toBe(10);
    expect(Category::whereNotNull('parent_id')->count())->toBe(58);
    expect(Product::count())->toBeGreaterThanOrEqual(20);
    expect(ProductVariant::count())->toBeGreaterThanOrEqual(10);

    foreach ([
        'Modern LED Table Lamp',
        'Minimalist Wall Art',
        'Ceramic Decorative Vase',
        'Artificial Green Plant',
        'Vanilla Scented Candle',
        'Beige Throw Pillow',
        'Modern Decorative Sculpture',
        'Woven Storage Basket',
        'Marble Table Centerpiece',
        'Ceramic Bathroom Set',
    ] as $requiredName) {
        $prod = Product::where('name', $requiredName)->first();
        expect($prod)->not->toBeNull();
        expect($prod->image_path)->not->toBeNull();
        Storage::disk('public')->assertExists($prod->image_path);
    }
});
