<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $slugMap = Category::pluck('id', 'slug')->toArray();

        $piece = Unit::where('short_name', 'pc')->first()?->id ?? Unit::first()?->id;
        $set = Unit::where('short_name', 'set')->first()?->id ?? $piece;
        $pair = Unit::where('short_name', 'pr')->first()?->id ?? $piece;
        $pack = Unit::where('short_name', 'pk')->first()?->id ?? $piece;

        $suppliers = Supplier::pluck('id', 'name')->toArray();
        $supLighting = $suppliers['Lumiere Lighting Studio'] ?? Supplier::first()?->id;
        $supNordic = $suppliers['Nordic Home Atelier'] ?? $supLighting;
        $supBotanica = $suppliers['Botanica & Clay Living'] ?? $supLighting;
        $supTextiles = $suppliers['Atelier Linen & Textiles'] ?? $supLighting;
        $supMarble = $suppliers['Marble & Bath Artisans'] ?? $supLighting;

        $cat = fn (string $slug): int => $slugMap[$slug] ?? Category::first()->id;

        $productsSpec = [
            // 1. Lighting
            [
                'sku' => 'LMP-MOD-LED01',
                'name' => 'Modern LED Table Lamp',
                'description' => 'Warm 2700K touch-dimming LED table lamp with spun aluminum shade and weighted matte base.',
                'category_id' => $cat('table-lamps'),
                'unit_id' => $piece,
                'supplier_id' => $supLighting,
                'cost_price' => 42.00,
                'sell_price' => 89.00,
                'reorder_level' => 6,
                'color' => 'Black',
                'size' => 'Medium',
                'material' => 'Metal',
                'style' => 'Modern',
                'artwork' => 'lamp',
                'variants' => [
                    ['sku' => 'LMP-MOD-LED01-BLK', 'color' => 'Black', 'size' => 'Medium', 'material' => 'Metal', 'style' => 'Modern', 'cost_price' => 42.00, 'sell_price' => 89.00, 'qty' => 14, 'reorder_level' => 4],
                    ['sku' => 'LMP-MOD-LED01-WHT', 'color' => 'White', 'size' => 'Medium', 'material' => 'Metal', 'style' => 'Minimalist', 'cost_price' => 42.00, 'sell_price' => 89.00, 'qty' => 10, 'reorder_level' => 4],
                    ['sku' => 'LMP-MOD-LED01-GLD', 'color' => 'Gold', 'size' => 'Medium', 'material' => 'Metal', 'style' => 'Luxury', 'cost_price' => 48.00, 'sell_price' => 98.00, 'qty' => 6, 'reorder_level' => 3],
                ],
            ],
            [
                'sku' => 'LMP-ARC-FLR02',
                'name' => 'Nordic Arc Floor Lamp',
                'description' => 'Slender cantilevered steel floor lamp anchored with a honed marble cylinder base for reading corners.',
                'category_id' => $cat('floor-lamps'),
                'unit_id' => $piece,
                'supplier_id' => $supLighting,
                'cost_price' => 115.00,
                'sell_price' => 235.00,
                'initial_stock' => 9,
                'reorder_level' => 3,
                'color' => 'Black',
                'size' => 'Large',
                'material' => 'Metal',
                'style' => 'Nordic',
                'artwork' => 'lamp',
            ],
            [
                'sku' => 'LMP-PND-GLS03',
                'name' => 'Fluted Amber Glass Pendant Light',
                'description' => 'Hand-blown ribbed glass dome pendant with warm brass canopy fitting for dining tables.',
                'category_id' => $cat('pendant-lights'),
                'unit_id' => $piece,
                'supplier_id' => $supLighting,
                'cost_price' => 68.00,
                'sell_price' => 149.00,
                'initial_stock' => 4,
                'reorder_level' => 5, // Intentional low stock
                'color' => 'Beige',
                'size' => 'Medium',
                'material' => 'Glass',
                'style' => 'Luxury',
                'artwork' => 'lamp',
            ],

            // 2. Wall Decor
            [
                'sku' => 'WAL-MIN-ART01',
                'name' => 'Minimalist Wall Art',
                'description' => 'Hand-layered linen-textured neutral relief artwork mounted in a solid kiln-dried ash float frame.',
                'category_id' => $cat('wall-art'),
                'unit_id' => $piece,
                'supplier_id' => $supNordic,
                'cost_price' => 48.00,
                'sell_price' => 115.00,
                'reorder_level' => 5,
                'color' => 'Beige',
                'size' => 'Large',
                'material' => 'Fabric',
                'style' => 'Minimalist',
                'artwork' => 'frame',
                'variants' => [
                    ['sku' => 'WAL-MIN-ART01-M', 'color' => 'Beige', 'size' => 'Medium', 'material' => 'Fabric', 'style' => 'Minimalist', 'cost_price' => 38.00, 'sell_price' => 89.00, 'qty' => 12, 'reorder_level' => 4],
                    ['sku' => 'WAL-MIN-ART01-L', 'color' => 'Beige', 'size' => 'Large', 'material' => 'Fabric', 'style' => 'Minimalist', 'cost_price' => 48.00, 'sell_price' => 115.00, 'qty' => 8, 'reorder_level' => 3],
                ],
            ],
            [
                'sku' => 'WAL-MIR-ARC02',
                'name' => 'Brushed Brass Arch Mirror',
                'description' => 'Arched hallway and dressing wall mirror framed in slim hand-finished metal.',
                'category_id' => $cat('decorative-mirrors'),
                'unit_id' => $piece,
                'supplier_id' => $supNordic,
                'cost_price' => 82.00,
                'sell_price' => 179.00,
                'initial_stock' => 11,
                'reorder_level' => 4,
                'color' => 'Gold',
                'size' => 'Large',
                'material' => 'Glass',
                'style' => 'Luxury',
                'artwork' => 'mirror',
            ],
            [
                'sku' => 'WAL-CLK-SIL03',
                'name' => 'Matte Slate Silent Wall Clock',
                'description' => '14-inch sweep-movement wall clock crafted with brushed walnut hands and minimalist baton markers.',
                'category_id' => $cat('wall-clocks'),
                'unit_id' => $piece,
                'supplier_id' => $supNordic,
                'cost_price' => 24.00,
                'sell_price' => 58.00,
                'initial_stock' => 16,
                'reorder_level' => 5,
                'color' => 'Grey',
                'size' => 'Medium',
                'material' => 'Wood',
                'style' => 'Minimalist',
                'artwork' => 'clock',
            ],

            // 3. Vases & Pottery
            [
                'sku' => 'VAS-CER-DEC01',
                'name' => 'Ceramic Decorative Vase',
                'description' => 'Matte unglazed stoneware vessel with organic silhouette, waterproof interior lining for fresh stems.',
                'category_id' => $cat('ceramic-vases'),
                'unit_id' => $piece,
                'supplier_id' => $supBotanica,
                'cost_price' => 22.00,
                'sell_price' => 54.00,
                'reorder_level' => 6,
                'color' => 'White',
                'size' => 'Medium',
                'material' => 'Ceramic',
                'style' => 'Nordic',
                'artwork' => 'vase',
                'variants' => [
                    ['sku' => 'VAS-CER-DEC01-WHT-S', 'color' => 'White', 'size' => 'Small', 'material' => 'Ceramic', 'style' => 'Nordic', 'cost_price' => 16.00, 'sell_price' => 39.00, 'qty' => 15, 'reorder_level' => 5],
                    ['sku' => 'VAS-CER-DEC01-BGE-M', 'color' => 'Beige', 'size' => 'Medium', 'material' => 'Ceramic', 'style' => 'Minimalist', 'cost_price' => 22.00, 'sell_price' => 54.00, 'qty' => 18, 'reorder_level' => 5],
                    ['sku' => 'VAS-CER-DEC01-BRN-L', 'color' => 'Brown', 'size' => 'Large', 'material' => 'Ceramic', 'style' => 'Vintage', 'cost_price' => 29.00, 'sell_price' => 69.00, 'qty' => 7, 'reorder_level' => 4],
                ],
            ],
            [
                'sku' => 'VAS-GLS-SMK02',
                'name' => 'Ribbed Smoke Glass Vase',
                'description' => 'Mouth-blown translucent smoky grey cylindrical flower vase for long-stem botanicals.',
                'category_id' => $cat('glass-vases'),
                'unit_id' => $piece,
                'supplier_id' => $supBotanica,
                'cost_price' => 19.00,
                'sell_price' => 46.00,
                'initial_stock' => 21,
                'reorder_level' => 6,
                'color' => 'Grey',
                'size' => 'Medium',
                'material' => 'Glass',
                'style' => 'Modern',
                'artwork' => 'vase',
            ],
            [
                'sku' => 'VAS-POT-TRA03',
                'name' => 'Travertine Finish Decorative Pot',
                'description' => 'Textured mineral-finish cachepot suited for console shelves and small indoor botanicals.',
                'category_id' => $cat('decorative-pots'),
                'unit_id' => $piece,
                'supplier_id' => $supBotanica,
                'cost_price' => 14.00,
                'sell_price' => 34.00,
                'initial_stock' => 3,
                'reorder_level' => 5, // Intentional low stock
                'color' => 'Beige',
                'size' => 'Small',
                'material' => 'Ceramic',
                'style' => 'Minimalist',
                'artwork' => 'vase',
            ],

            // 4. Plants & Flowers
            [
                'sku' => 'PLT-ART-GRN01',
                'name' => 'Artificial Green Plant',
                'description' => 'Realistic silk-leaf Mediterranean olive branch foliage pre-potted in a weighted matte planter.',
                'category_id' => $cat('artificial-plants'),
                'unit_id' => $piece,
                'supplier_id' => $supBotanica,
                'cost_price' => 32.00,
                'sell_price' => 74.00,
                'reorder_level' => 5,
                'color' => 'Grey',
                'size' => 'Large',
                'material' => 'Ceramic',
                'style' => 'Modern',
                'artwork' => 'plant',
                'variants' => [
                    ['sku' => 'PLT-ART-GRN01-M', 'color' => 'White', 'size' => 'Medium', 'material' => 'Ceramic', 'style' => 'Nordic', 'cost_price' => 24.00, 'sell_price' => 56.00, 'qty' => 14, 'reorder_level' => 4],
                    ['sku' => 'PLT-ART-GRN01-L', 'color' => 'Grey', 'size' => 'Large', 'material' => 'Ceramic', 'style' => 'Modern', 'cost_price' => 36.00, 'sell_price' => 84.00, 'qty' => 11, 'reorder_level' => 4],
                ],
            ],
            [
                'sku' => 'PLT-SUC-SET02',
                'name' => 'Trio Terracotta Succulents',
                'description' => 'Set of three miniature sculpted succulents nestled in warm stoneware nursery pots.',
                'category_id' => $cat('succulents'),
                'unit_id' => $set,
                'supplier_id' => $supBotanica,
                'cost_price' => 12.50,
                'sell_price' => 29.00,
                'initial_stock' => 26,
                'reorder_level' => 8,
                'color' => 'Brown',
                'size' => 'Small',
                'material' => 'Ceramic',
                'style' => 'Nordic',
                'artwork' => 'plant',
            ],
            [
                'sku' => 'PLT-FLW-DRM03',
                'name' => 'Preserved Ivory Hydrangea Stems',
                'description' => 'Three natural-touch faux stems curated for tall dining and foyer ceramic vessels.',
                'category_id' => $cat('artificial-flowers'),
                'unit_id' => $pack,
                'supplier_id' => $supBotanica,
                'cost_price' => 11.00,
                'sell_price' => 28.00,
                'initial_stock' => 30,
                'reorder_level' => 8,
                'color' => 'White',
                'size' => 'Medium',
                'material' => 'Fabric',
                'style' => 'Vintage',
                'artwork' => 'plant',
            ],

            // 5. Candles & Fragrance
            [
                'sku' => 'CND-VAN-SCT01',
                'name' => 'Vanilla Scented Candle',
                'description' => 'Madagascar vanilla bean, warm cedar and sandalwood soy-coconut wax candle in amber apothecary glass (50 hr burn).',
                'category_id' => $cat('scented-candles'),
                'unit_id' => $piece,
                'supplier_id' => $supTextiles,
                'cost_price' => 13.00,
                'sell_price' => 32.00,
                'initial_stock' => 40,
                'reorder_level' => 10,
                'color' => 'Beige',
                'size' => 'Medium',
                'material' => 'Glass',
                'style' => 'Minimalist',
                'artwork' => 'candle',
            ],
            [
                'sku' => 'CND-RED-DIF02',
                'name' => 'Bergamot & Cedar Reed Diffuser',
                'description' => 'Botanical cold-throw diffuser oil with 8 matte charcoal rattan reeds in frosted glass bottle.',
                'category_id' => $cat('reed-diffusers'),
                'unit_id' => $piece,
                'supplier_id' => $supTextiles,
                'cost_price' => 16.00,
                'sell_price' => 38.00,
                'initial_stock' => 24,
                'reorder_level' => 6,
                'color' => 'White',
                'size' => 'Small',
                'material' => 'Glass',
                'style' => 'Modern',
                'artwork' => 'candle',
            ],
            [
                'sku' => 'CND-HLD-BRS03',
                'name' => 'Sculpted Brass Taper Holders (Pair)',
                'description' => 'Turned solid brass candle stick holders with satin antique brushed patina.',
                'category_id' => $cat('candle-holders'),
                'unit_id' => $pair,
                'supplier_id' => $supNordic,
                'cost_price' => 20.00,
                'sell_price' => 48.00,
                'initial_stock' => 15,
                'reorder_level' => 5,
                'color' => 'Gold',
                'size' => 'Small',
                'material' => 'Metal',
                'style' => 'Luxury',
                'artwork' => 'candle',
            ],

            // 6. Cushions & Textiles
            [
                'sku' => 'TXT-PLW-BGE01',
                'name' => 'Beige Throw Pillow',
                'description' => 'Washed stone-soft Belgian linen sofa cushion with feather-down insert and hidden brass zipper.',
                'category_id' => $cat('throw-pillows'),
                'unit_id' => $piece,
                'supplier_id' => $supTextiles,
                'cost_price' => 18.00,
                'sell_price' => 45.00,
                'reorder_level' => 6,
                'color' => 'Beige',
                'size' => 'Medium',
                'material' => 'Fabric',
                'style' => 'Nordic',
                'artwork' => 'textile',
                'variants' => [
                    ['sku' => 'TXT-PLW-BGE01-S', 'color' => 'Beige', 'size' => 'Small', 'material' => 'Fabric', 'style' => 'Nordic', 'cost_price' => 15.00, 'sell_price' => 38.00, 'qty' => 20, 'reorder_level' => 5],
                    ['sku' => 'TXT-PLW-BGE01-M', 'color' => 'Beige', 'size' => 'Medium', 'material' => 'Fabric', 'style' => 'Nordic', 'cost_price' => 18.00, 'sell_price' => 45.00, 'qty' => 22, 'reorder_level' => 6],
                    ['sku' => 'TXT-PLW-GRY01-L', 'color' => 'Grey', 'size' => 'Large', 'material' => 'Fabric', 'style' => 'Minimalist', 'cost_price' => 22.00, 'sell_price' => 54.00, 'qty' => 12, 'reorder_level' => 4],
                ],
            ],
            [
                'sku' => 'TXT-THR-WOL02',
                'name' => 'Herringbone Merino Throw Blanket',
                'description' => 'Lightweight breathable woven merino wool and organic cotton sofa throw with hand-knotted fringe.',
                'category_id' => $cat('blankets-throws'),
                'unit_id' => $piece,
                'supplier_id' => $supTextiles,
                'cost_price' => 35.00,
                'sell_price' => 79.00,
                'initial_stock' => 18,
                'reorder_level' => 5,
                'color' => 'Grey',
                'size' => 'Large',
                'material' => 'Fabric',
                'style' => 'Nordic',
                'artwork' => 'textile',
            ],
            [
                'sku' => 'TXT-CRT-LIN03',
                'name' => 'Oatmeal Linen Drapery Panels',
                'description' => 'Floor-length light-filtering linen curtains with pleated hidden rod pocket.',
                'category_id' => $cat('curtains'),
                'unit_id' => $pair,
                'supplier_id' => $supTextiles,
                'cost_price' => 58.00,
                'sell_price' => 129.00,
                'initial_stock' => 12,
                'reorder_level' => 4,
                'color' => 'Beige',
                'size' => 'Large',
                'material' => 'Fabric',
                'style' => 'Minimalist',
                'artwork' => 'textile',
            ],
            [
                'sku' => 'TXT-RUN-SLB04',
                'name' => 'Woven Slub Linen Bench & Console Runner',
                'description' => 'Textured neutral runner crafted for entryway consoles, ottomans and textile layering.',
                'category_id' => $cat('cushions-textiles-table-runners'),
                'unit_id' => $piece,
                'supplier_id' => $supTextiles,
                'cost_price' => 16.50,
                'sell_price' => 39.00,
                'initial_stock' => 14,
                'reorder_level' => 4,
                'color' => 'White',
                'size' => 'Medium',
                'material' => 'Fabric',
                'style' => 'Nordic',
                'artwork' => 'textile',
            ],

            // 7. Decorative Accessories
            [
                'sku' => 'DEC-SCP-MOD01',
                'name' => 'Modern Decorative Sculpture',
                'description' => 'Interlocking matte mineral-composite knot sculpture engineered for bookshelves and mantel styling.',
                'category_id' => $cat('decorative-sculptures'),
                'unit_id' => $piece,
                'supplier_id' => $supNordic,
                'cost_price' => 28.00,
                'sell_price' => 68.00,
                'initial_stock' => 17,
                'reorder_level' => 5,
                'color' => 'White',
                'size' => 'Medium',
                'material' => 'Ceramic',
                'style' => 'Modern',
                'artwork' => 'sculpture',
            ],
            [
                'sku' => 'DEC-BKE-MRB02',
                'name' => 'Honed Arch Marble Bookends',
                'description' => 'Hand-cut natural veined marble arch bookends with felt base pads.',
                'category_id' => $cat('bookends'),
                'unit_id' => $pair,
                'supplier_id' => $supMarble,
                'cost_price' => 34.00,
                'sell_price' => 76.00,
                'initial_stock' => 4,
                'reorder_level' => 5, // Intentional low stock
                'color' => 'White',
                'size' => 'Medium',
                'material' => 'Stone',
                'style' => 'Luxury',
                'artwork' => 'sculpture',
            ],

            // 8. Storage & Organization
            [
                'sku' => 'STR-BSK-WVN01',
                'name' => 'Woven Storage Basket',
                'description' => 'Hand-braided natural seagrass belly storage basket with reinforced loop handles for throws and toys.',
                'category_id' => $cat('storage-baskets'),
                'unit_id' => $piece,
                'supplier_id' => $supBotanica,
                'cost_price' => 20.00,
                'sell_price' => 49.00,
                'reorder_level' => 6,
                'color' => 'Brown',
                'size' => 'Medium',
                'material' => 'Wood',
                'style' => 'Nordic',
                'artwork' => 'basket',
                'variants' => [
                    ['sku' => 'STR-BSK-WVN01-S', 'color' => 'Brown', 'size' => 'Small', 'material' => 'Wood', 'style' => 'Nordic', 'cost_price' => 15.00, 'sell_price' => 36.00, 'qty' => 16, 'reorder_level' => 5],
                    ['sku' => 'STR-BSK-WVN01-L', 'color' => 'Brown', 'size' => 'Large', 'material' => 'Wood', 'style' => 'Nordic', 'cost_price' => 24.00, 'sell_price' => 58.00, 'qty' => 12, 'reorder_level' => 4],
                ],
            ],
            [
                'sku' => 'STR-JWL-LQR02',
                'name' => 'Walnut & Velvet Jewelry Box',
                'description' => 'Two-tier solid walnut jewelry organizer with divided ring channels and soft stone velvet lining.',
                'category_id' => $cat('jewelry-boxes'),
                'unit_id' => $piece,
                'supplier_id' => $supNordic,
                'cost_price' => 36.00,
                'sell_price' => 84.00,
                'initial_stock' => 13,
                'reorder_level' => 4,
                'color' => 'Brown',
                'size' => 'Small',
                'material' => 'Wood',
                'style' => 'Luxury',
                'artwork' => 'basket',
            ],
            [
                'sku' => 'STR-DSK-ORG03',
                'name' => 'Ash Wood Modular Desk Organizer',
                'description' => 'Three-compartment desk valet crafted from sustainably harvested American ash wood.',
                'category_id' => $cat('desk-organizers'),
                'unit_id' => $piece,
                'supplier_id' => $supNordic,
                'cost_price' => 19.00,
                'sell_price' => 44.00,
                'initial_stock' => 22,
                'reorder_level' => 6,
                'color' => 'Brown',
                'size' => 'Small',
                'material' => 'Wood',
                'style' => 'Minimalist',
                'artwork' => 'basket',
            ],

            // 9. Table Decor
            [
                'sku' => 'TBL-CTR-MRB01',
                'name' => 'Marble Table Centerpiece',
                'description' => 'Carved Calacatta marble pedestal fruit & floral centerpiece bowl with honed satin finish.',
                'category_id' => $cat('table-centerpieces'),
                'unit_id' => $piece,
                'supplier_id' => $supMarble,
                'cost_price' => 55.00,
                'sell_price' => 128.00,
                'initial_stock' => 10,
                'reorder_level' => 4,
                'color' => 'White',
                'size' => 'Large',
                'material' => 'Stone',
                'style' => 'Luxury',
                'artwork' => 'table',
            ],
            [
                'sku' => 'TBL-RUN-DIN02',
                'name' => 'Raw Hemmed Dining Table Runner',
                'description' => 'Breathable heavyweight cotton-ramie dining table runner designed to ground formal table settings.',
                'category_id' => $cat('table-decor-table-runners'),
                'unit_id' => $piece,
                'supplier_id' => $supTextiles,
                'cost_price' => 17.00,
                'sell_price' => 42.00,
                'initial_stock' => 19,
                'reorder_level' => 5,
                'color' => 'Beige',
                'size' => 'Large',
                'material' => 'Fabric',
                'style' => 'Minimalist',
                'artwork' => 'textile',
            ],
            [
                'sku' => 'TBL-CST-TRZ03',
                'name' => 'Terrazzo & Cork Coasters (Set of 4)',
                'description' => 'Sealed mineral terrazzo drink coasters backed with natural cork to protect dining surfaces.',
                'category_id' => $cat('coasters'),
                'unit_id' => $set,
                'supplier_id' => $supMarble,
                'cost_price' => 10.50,
                'sell_price' => 26.00,
                'initial_stock' => 35,
                'reorder_level' => 10,
                'color' => 'Grey',
                'size' => 'Small',
                'material' => 'Stone',
                'style' => 'Modern',
                'artwork' => 'table',
            ],

            // 10. Bathroom Decor
            [
                'sku' => 'BTH-SET-CER01',
                'name' => 'Ceramic Bathroom Set',
                'description' => 'Coordinated 4-piece matte glazed bathroom set: pump soap dispenser, tumbler, tray and covered jar.',
                'category_id' => $cat('bathroom-sets'),
                'unit_id' => $set,
                'supplier_id' => $supMarble,
                'cost_price' => 32.00,
                'sell_price' => 75.00,
                'reorder_level' => 5,
                'color' => 'White',
                'size' => 'Medium',
                'material' => 'Ceramic',
                'style' => 'Minimalist',
                'artwork' => 'bath',
                'variants' => [
                    ['sku' => 'BTH-SET-CER01-WHT', 'color' => 'White', 'size' => 'Medium', 'material' => 'Ceramic', 'style' => 'Minimalist', 'cost_price' => 32.00, 'sell_price' => 75.00, 'qty' => 15, 'reorder_level' => 4],
                    ['sku' => 'BTH-SET-CER01-GRY', 'color' => 'Grey', 'size' => 'Medium', 'material' => 'Ceramic', 'style' => 'Modern', 'cost_price' => 32.00, 'sell_price' => 75.00, 'qty' => 9, 'reorder_level' => 4],
                ],
            ],
            [
                'sku' => 'BTH-DSP-MAT02',
                'name' => 'Matte Stoneware Soap Dispenser',
                'description' => 'Refillable ceramic hand soap bottle with corrosion-resistant brushed stainless pump.',
                'category_id' => $cat('soap-dispensers'),
                'unit_id' => $piece,
                'supplier_id' => $supMarble,
                'cost_price' => 11.00,
                'sell_price' => 28.00,
                'initial_stock' => 28,
                'reorder_level' => 8,
                'color' => 'Black',
                'size' => 'Small',
                'material' => 'Ceramic',
                'style' => 'Modern',
                'artwork' => 'bath',
            ],
        ];

        $adminUser = User::where('role', User::ROLE_ADMIN)->first() ?? User::factory()->admin()->create();
        $categoryNames = Category::pluck('name', 'id')->toArray();

        $existingPurchase = Purchase::where('ref_no', 'PO-DECOR-INIT-2026')->first();
        $isAlreadyReceived = $existingPurchase && $existingPurchase->status === Purchase::STATUS_RECEIVED;

        $intakeLines = [];

        foreach ($productsSpec as $spec) {
            $artwork = $spec['artwork'] ?? 'vase';
            $variantsSpec = $spec['variants'] ?? [];
            $initialStock = $spec['initial_stock'] ?? 0;

            unset($spec['artwork'], $spec['variants'], $spec['initial_stock']);

            $hasVariants = ! empty($variantsSpec);
            $spec['has_variants'] = $hasVariants;
            $spec['is_active'] = true;

            if (! $isAlreadyReceived) {
                $spec['stock_qty'] = 0;
                $spec['avg_cost'] = $spec['cost_price'];
            }

            $product = Product::withTrashed()->updateOrCreate(
                ['sku' => $spec['sku']],
                array_merge($spec, ['deleted_at' => null])
            );

            $this->createDemoImage($product, $categoryNames[$product->category_id] ?? 'Home Decor', $artwork);

            if ($hasVariants) {
                foreach ($variantsSpec as $vSpec) {
                    $vQty = $vSpec['qty'];
                    $vCost = $vSpec['cost_price'];

                    $variantData = [
                        'product_id' => $product->id,
                        'color' => $vSpec['color'] ?? null,
                        'size' => $vSpec['size'] ?? null,
                        'material' => $vSpec['material'] ?? null,
                        'style' => $vSpec['style'] ?? null,
                        'cost_price' => $vCost,
                        'sell_price' => $vSpec['sell_price'],
                        'reorder_level' => $vSpec['reorder_level'] ?? 4,
                        'is_active' => true,
                        'deleted_at' => null,
                    ];

                    if (! $isAlreadyReceived) {
                        $variantData['stock_qty'] = 0;
                        $variantData['avg_cost'] = $vCost;
                    }

                    $variant = ProductVariant::withTrashed()->updateOrCreate(
                        ['sku' => $vSpec['sku']],
                        $variantData
                    );

                    $intakeLines[] = [
                        'product' => $product,
                        'variant' => $variant,
                        'variant_label' => $variant->label(),
                        'qty' => $vQty,
                        'cost' => $vCost,
                    ];
                }
            } else {
                $intakeLines[] = [
                    'product' => $product,
                    'variant' => null,
                    'variant_label' => null,
                    'qty' => $initialStock,
                    'cost' => $spec['cost_price'],
                ];
            }
        }

        if ($isAlreadyReceived) {
            return;
        }

        $initialPurchase = Purchase::updateOrCreate(
            ['ref_no' => 'PO-DECOR-INIT-2026'],
            [
                'supplier_id' => $supNordic,
                'status' => Purchase::STATUS_DRAFT,
                'total' => 0.00,
                'notes' => 'Initial Interior Home Decoration boutique showroom inventory intake',
                'created_by' => $adminUser->id,
            ]
        );

        $totalCost = 0.00;
        foreach ($intakeLines as $line) {
            if ($line['qty'] <= 0) {
                continue;
            }

            PurchaseItem::updateOrCreate(
                [
                    'purchase_id' => $initialPurchase->id,
                    'product_id' => $line['product']->id,
                    'product_variant_id' => $line['variant']?->id,
                ],
                [
                    'variant_label' => $line['variant_label'],
                    'qty' => $line['qty'],
                    'unit_cost' => $line['cost'],
                ]
            );
            $totalCost += ($line['qty'] * $line['cost']);
        }

        $initialPurchase->total = $totalCost;
        $initialPurchase->save();

        /** @var StockService $stockService */
        $stockService = app(StockService::class);
        $stockService->receive($initialPurchase, $adminUser);
    }

    protected function createDemoImage(Product $product, string $categoryName, string $artwork): void
    {
        $year = now()->format('Y');
        $month = now()->format('m');
        $dir = "products/{$year}/{$month}";
        $hash = md5($product->sku.'-decor-v1');
        $mainPath = "{$dir}/{$hash}.webp";
        $thumbPath = "{$dir}/{$hash}_thumb.webp";

        if (! Storage::disk('public')->exists($mainPath) && function_exists('imagecreatetruecolor') && function_exists('imagewebp')) {
            $img = imagecreatetruecolor(800, 800);
            imageantialias($img, true);

            $bg = imagecolorallocate($img, 248, 250, 252);
            $card = imagecolorallocate($img, 255, 255, 255);
            $sand = imagecolorallocate($img, 241, 245, 249);
            $border = imagecolorallocate($img, 226, 232, 240);
            $indigo = imagecolorallocate($img, 67, 56, 202);
            $indigoSoft = imagecolorallocate($img, 224, 231, 255);
            $amber = imagecolorallocate($img, 245, 158, 11);
            $amberSoft = imagecolorallocate($img, 254, 243, 199);
            $slateDark = imagecolorallocate($img, 15, 23, 42);
            $slateMid = imagecolorallocate($img, 100, 116, 139);
            $charcoal = imagecolorallocate($img, 51, 65, 85);

            imagefill($img, 0, 0, $bg);
            imagefilledrectangle($img, 48, 48, 752, 752, $card);
            imagerectangle($img, 48, 48, 752, 752, $border);
            imagefilledrectangle($img, 48, 48, 752, 60, $indigo);

            // Soft backdrop medallion
            imagefilledellipse($img, 400, 305, 340, 340, $sand);

            switch ($artwork) {
                case 'lamp':
                    imagefilledpolygon($img, [300, 290, 500, 290, 455, 175, 345, 175], $indigo);
                    imagefilledrectangle($img, 392, 290, 408, 425, $charcoal);
                    imagefilledellipse($img, 400, 432, 130, 28, $amber);
                    imagefilledellipse($img, 400, 310, 44, 24, $amberSoft);
                    break;

                case 'frame':
                    imagerectangle($img, 285, 165, 515, 430, $charcoal);
                    imagefilledrectangle($img, 300, 180, 500, 415, $amberSoft);
                    imagefilledellipse($img, 400, 275, 115, 115, $indigo);
                    imagefilledrectangle($img, 335, 340, 465, 392, $charcoal);
                    break;

                case 'mirror':
                    imagefilledellipse($img, 400, 260, 190, 190, $amber);
                    imagefilledrectangle($img, 305, 260, 495, 430, $amber);
                    imagefilledellipse($img, 400, 265, 166, 166, $indigoSoft);
                    imagefilledrectangle($img, 317, 265, 483, 418, $indigoSoft);
                    break;

                case 'clock':
                    imagefilledellipse($img, 400, 300, 240, 240, $charcoal);
                    imagefilledellipse($img, 400, 300, 212, 212, $card);
                    imageline($img, 400, 300, 400, 222, $indigo);
                    imageline($img, 400, 300, 462, 318, $amber);
                    imagefilledellipse($img, 400, 300, 18, 18, $slateDark);
                    break;

                case 'vase':
                    imagefilledrectangle($img, 366, 185, 434, 240, $indigo);
                    imagefilledellipse($img, 400, 340, 175, 215, $indigo);
                    imagefilledrectangle($img, 355, 432, 445, 446, $amber);
                    break;

                case 'plant':
                    imagefilledpolygon($img, [340, 355, 460, 355, 440, 445, 360, 445], $amber);
                    imagefilledellipse($img, 400, 250, 90, 145, $indigo);
                    imagefilledellipse($img, 340, 285, 95, 70, $charcoal);
                    imagefilledellipse($img, 460, 285, 95, 70, $charcoal);
                    break;

                case 'candle':
                    imagefilledellipse($img, 400, 200, 30, 56, $amber);
                    imagefilledrectangle($img, 330, 265, 470, 430, $indigoSoft);
                    imagerectangle($img, 330, 265, 470, 430, $indigo);
                    imagefilledrectangle($img, 355, 315, 445, 375, $card);
                    break;

                case 'textile':
                    imagefilledrectangle($img, 290, 200, 510, 410, $indigo);
                    imagerectangle($img, 310, 220, 490, 390, $amberSoft);
                    imagefilledrectangle($img, 335, 245, 465, 365, $card);
                    break;

                case 'basket':
                    imagefilledpolygon($img, [305, 275, 495, 275, 465, 435, 335, 435], $amber);
                    imagearc($img, 400, 275, 110, 80, 180, 360, $charcoal);
                    imagefilledrectangle($img, 318, 335, 482, 355, $indigo);
                    break;

                case 'table':
                case 'sculpture':
                    imagefilledellipse($img, 400, 275, 185, 90, $indigoSoft);
                    imagefilledellipse($img, 400, 285, 175, 75, $indigo);
                    imagefilledpolygon($img, [365, 320, 435, 320, 455, 430, 345, 430], $charcoal);
                    break;

                case 'bath':
                default:
                    imagefilledrectangle($img, 335, 250, 415, 415, $indigo);
                    imagefilledrectangle($img, 366, 212, 384, 250, $charcoal);
                    imagefilledrectangle($img, 355, 205, 418, 215, $charcoal);
                    imagefilledrectangle($img, 430, 315, 490, 415, $amber);
                    imagefilledrectangle($img, 305, 415, 515, 435, $slateMid);
                    break;
            }

            imagestring($img, 5, 95, 535, substr($product->name, 0, 46), $slateDark);
            imagestring($img, 4, 95, 575, 'Category: '.$categoryName, $slateMid);
            imagestring($img, 4, 95, 608, 'SKU: '.$product->sku, $indigo);
            imagestring($img, 4, 95, 642, 'Retail: $'.number_format((float) $product->sell_price, 2), $slateDark);

            ob_start();
            imagewebp($img, null, 85);
            $mainData = ob_get_clean();
            imagedestroy($img);

            // 200x200 thumbnail
            $thumb = imagecreatetruecolor(200, 200);
            $tBg = imagecolorallocate($thumb, 248, 250, 252);
            $tCard = imagecolorallocate($thumb, 255, 255, 255);
            $tBorder = imagecolorallocate($thumb, 226, 232, 240);
            $tIndigo = imagecolorallocate($thumb, 67, 56, 202);
            $tAmber = imagecolorallocate($thumb, 245, 158, 11);
            $tDark = imagecolorallocate($thumb, 15, 23, 42);
            $tSand = imagecolorallocate($thumb, 241, 245, 249);

            imagefill($thumb, 0, 0, $tBg);
            imagefilledrectangle($thumb, 8, 8, 192, 192, $tCard);
            imagerectangle($thumb, 8, 8, 192, 192, $tBorder);
            imagefilledrectangle($thumb, 8, 8, 192, 14, $tIndigo);
            imagefilledellipse($thumb, 100, 76, 78, 78, $tSand);
            imagefilledellipse($thumb, 100, 76, 48, 48, $tIndigo);
            imagefilledellipse($thumb, 120, 92, 20, 20, $tAmber);

            imagestring($thumb, 2, 16, 134, substr($product->name, 0, 23), $tDark);
            imagestring($thumb, 2, 16, 154, '$'.number_format((float) $product->sell_price, 2), $tIndigo);

            ob_start();
            imagewebp($thumb, null, 85);
            $thumbData = ob_get_clean();
            imagedestroy($thumb);

            Storage::disk('public')->put($mainPath, $mainData);
            Storage::disk('public')->put($thumbPath, $thumbData);
        }

        if (Storage::disk('public')->exists($mainPath) && Storage::disk('public')->exists($thumbPath)) {
            $product->update([
                'image_path' => $mainPath,
                'thumb_path' => $thumbPath,
            ]);
        }
    }
}
