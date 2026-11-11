<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $taxonomy = [
            [
                'name' => 'Lighting',
                'slug' => 'lighting',
                'description' => 'Table, floor, ceiling, pendant, wall and LED accent lighting',
                'sort_order' => 1,
                'children' => [
                    ['name' => 'Table Lamps', 'slug' => 'table-lamps', 'description' => 'Bedside, desk and accent table lamps'],
                    ['name' => 'Floor Lamps', 'slug' => 'floor-lamps', 'description' => 'Arc, tripod and standing ambient floor lamps'],
                    ['name' => 'Ceiling Lights', 'slug' => 'ceiling-lights', 'description' => 'Flush-mount and statement ceiling fixtures'],
                    ['name' => 'Pendant Lights', 'slug' => 'pendant-lights', 'description' => 'Dining, island and foyer suspended pendants'],
                    ['name' => 'Wall Lamps', 'slug' => 'wall-lamps', 'description' => 'Sconces and bedside wall-mounted lighting'],
                    ['name' => 'LED Strip Lights', 'slug' => 'led-strip-lights', 'description' => 'Warm ambient cove, shelf and architectural LED strips'],
                ],
            ],
            [
                'name' => 'Wall Decor',
                'slug' => 'wall-decor',
                'description' => 'Art canvases, decorative mirrors, wall clocks, decals and frames',
                'sort_order' => 2,
                'children' => [
                    ['name' => 'Wall Art', 'slug' => 'wall-art', 'description' => 'Framed canvases, minimal prints and textural art'],
                    ['name' => 'Decorative Mirrors', 'slug' => 'decorative-mirrors', 'description' => 'Arch, round and frameless accent wall mirrors'],
                    ['name' => 'Wall Clocks', 'slug' => 'wall-clocks', 'description' => 'Minimalist silent-sweep and sculptural clocks'],
                    ['name' => 'Wall Stickers', 'slug' => 'wall-stickers', 'description' => 'Peel-and-stick botanical and architectural decals'],
                    ['name' => 'Wall Shelves', 'slug' => 'wall-shelves', 'description' => 'Floating wood and metal display ledges'],
                    ['name' => 'Photo Frames', 'slug' => 'photo-frames', 'description' => 'Gallery wall picture frames in oak, brass and matte black'],
                ],
            ],
            [
                'name' => 'Vases & Pottery',
                'slug' => 'vases-pottery',
                'description' => 'Handcrafted stoneware vases, glassware, pots and sculptural pottery',
                'sort_order' => 3,
                'children' => [
                    ['name' => 'Ceramic Vases', 'slug' => 'ceramic-vases', 'description' => 'Matte glazed and raw terracotta ceramic vases'],
                    ['name' => 'Glass Vases', 'slug' => 'glass-vases', 'description' => 'Blown tinted and clear artisanal glass vessels'],
                    ['name' => 'Decorative Pots', 'slug' => 'decorative-pots', 'description' => 'Accent cachepots and shelf vessels'],
                    ['name' => 'Ceramic Sculptures', 'slug' => 'ceramic-sculptures', 'description' => 'Kiln-fired organic ceramic tabletop forms'],
                    ['name' => 'Flower Vases', 'slug' => 'flower-vases', 'description' => 'Stem and bouquet vessels for dried and fresh florals'],
                ],
            ],
            [
                'name' => 'Plants & Flowers',
                'slug' => 'plants-flowers',
                'description' => 'Botanicals, faux stems, succulents and architectural planters',
                'sort_order' => 4,
                'children' => [
                    ['name' => 'Artificial Plants', 'slug' => 'artificial-plants', 'description' => 'Lifelike olive trees, monstera and indoor foliage'],
                    ['name' => 'Artificial Flowers', 'slug' => 'artificial-flowers', 'description' => 'Preserved and faux botanical floral stems'],
                    ['name' => 'Indoor Plants', 'slug' => 'indoor-plants', 'description' => 'Statement potted houseplants for bright interiors'],
                    ['name' => 'Succulents', 'slug' => 'succulents', 'description' => 'Low-maintenance tabletop succulent arrangements'],
                    ['name' => 'Decorative Planters', 'slug' => 'decorative-planters', 'description' => 'Stoneware, woven and pedestal floor planters'],
                ],
            ],
            [
                'name' => 'Candles & Fragrance',
                'slug' => 'candles-fragrance',
                'description' => 'Artisan soy candles, holders, diffusers and home scents',
                'sort_order' => 5,
                'children' => [
                    ['name' => 'Scented Candles', 'slug' => 'scented-candles', 'description' => 'Hand-poured botanical wax candles in glass and ceramic'],
                    ['name' => 'Candle Holders', 'slug' => 'candle-holders', 'description' => 'Brass tapers, hurricanes and travertine pillars'],
                    ['name' => 'Reed Diffusers', 'slug' => 'reed-diffusers', 'description' => 'Flamless rattan reed scent diffusers'],
                    ['name' => 'Essential Oil Diffusers', 'slug' => 'essential-oil-diffusers', 'description' => 'Stone-finish ultrasonic mist diffusers'],
                    ['name' => 'Room Sprays', 'slug' => 'room-sprays', 'description' => 'Fine mist linen and interior room perfumes'],
                    ['name' => 'Fragrance Oils', 'slug' => 'fragrance-oils', 'description' => 'Pure essential and signature blended aroma oils'],
                ],
            ],
            [
                'name' => 'Cushions & Textiles',
                'slug' => 'cushions-textiles',
                'description' => 'Soft furnishings including pillows, throws, curtains, rugs and runners',
                'sort_order' => 6,
                'children' => [
                    ['name' => 'Throw Pillows', 'slug' => 'throw-pillows', 'description' => 'Linen, boucle and velvet accent cushions with inserts'],
                    ['name' => 'Cushion Covers', 'slug' => 'cushion-covers', 'description' => 'Textured seasonal decorative pillow covers'],
                    ['name' => 'Blankets & Throws', 'slug' => 'blankets-throws', 'description' => 'Woven merino, organic cotton and chunky knit throws'],
                    ['name' => 'Curtains', 'slug' => 'curtains', 'description' => 'Sheer Belgian linen and blackout drapery panels'],
                    ['name' => 'Rugs & Carpets', 'slug' => 'rugs-carpets', 'description' => 'Hand-tufted wool, jute and flatweave area rugs'],
                    ['name' => 'Table Runners', 'slug' => 'cushions-textiles-table-runners', 'description' => 'Woven textile and linen runners'],
                ],
            ],
            [
                'name' => 'Decorative Accessories',
                'slug' => 'decorative-accessories',
                'description' => 'Sculptures, trays, bowls, bookends and shelf objects',
                'sort_order' => 7,
                'children' => [
                    ['name' => 'Decorative Sculptures', 'slug' => 'decorative-sculptures', 'description' => 'Abstract resin, stone and metal accent pieces'],
                    ['name' => 'Figurines', 'slug' => 'figurines', 'description' => 'Collectible silhouette figurines for mantels and desks'],
                    ['name' => 'Decorative Trays', 'slug' => 'decorative-trays', 'description' => 'Vanity, coffee table and console styling trays'],
                    ['name' => 'Decorative Bowls', 'slug' => 'decorative-bowls', 'description' => 'Fluted travertine, teak wood and ceramic bowls'],
                    ['name' => 'Bookends', 'slug' => 'bookends', 'description' => 'Marble and cast iron architectural bookends'],
                    ['name' => 'Ornaments', 'slug' => 'ornaments', 'description' => 'Seasonal and year-round curated accent ornaments'],
                ],
            ],
            [
                'name' => 'Storage & Organization',
                'slug' => 'storage-organization',
                'description' => 'Baskets, decorative boxes, jewelry storage and home organizers',
                'sort_order' => 8,
                'children' => [
                    ['name' => 'Storage Baskets', 'slug' => 'storage-baskets', 'description' => 'Hand-woven seagrass, hyacinth and rope baskets'],
                    ['name' => 'Decorative Boxes', 'slug' => 'decorative-boxes', 'description' => 'Linen and walnut keepsake storage boxes'],
                    ['name' => 'Storage Bins', 'slug' => 'storage-bins', 'description' => 'Modular pantry and closet fabric/woven bins'],
                    ['name' => 'Jewelry Boxes', 'slug' => 'jewelry-boxes', 'description' => 'Velvet-lined glass and lacquer jewelry cases'],
                    ['name' => 'Desk Organizers', 'slug' => 'desk-organizers', 'description' => 'Minimalist wooden and leather workspace trays'],
                    ['name' => 'Decorative Shelves', 'slug' => 'decorative-shelves', 'description' => 'Freestanding corner and ladder display shelving'],
                ],
            ],
            [
                'name' => 'Table Decor',
                'slug' => 'table-decor',
                'description' => 'Centerpieces, dining accents, serving trays and coasters',
                'sort_order' => 9,
                'children' => [
                    ['name' => 'Table Centerpieces', 'slug' => 'table-centerpieces', 'description' => 'Marble plinths, sculptural bowls and dining anchors'],
                    ['name' => 'Decorative Plates', 'slug' => 'decorative-plates', 'description' => 'Artisan charger and display ceramic plates'],
                    ['name' => 'Serving Trays', 'slug' => 'serving-trays', 'description' => 'Acacia wood, brass and stone entertaining trays'],
                    ['name' => 'Table Runners', 'slug' => 'table-decor-table-runners', 'description' => 'Dining centerpiece runners in cotton and ramie'],
                    ['name' => 'Napkin Holders', 'slug' => 'napkin-holders', 'description' => 'Minimal brass and walnut napkin rings & caddies'],
                    ['name' => 'Coasters', 'slug' => 'coasters', 'description' => 'Terrazzo, marble and cork drink coaster sets'],
                ],
            ],
            [
                'name' => 'Bathroom Decor',
                'slug' => 'bathroom-decor',
                'description' => 'Spa-inspired dispensers, trays, organizers and matching bath sets',
                'sort_order' => 10,
                'children' => [
                    ['name' => 'Soap Dispensers', 'slug' => 'soap-dispensers', 'description' => 'Refillable ceramic, amber glass and matte pump bottles'],
                    ['name' => 'Toothbrush Holders', 'slug' => 'toothbrush-holders', 'description' => 'Minimalist countertop tumbler and brush stands'],
                    ['name' => 'Bathroom Trays', 'slug' => 'bathroom-trays', 'description' => 'Water-resistant stone and resin vanity trays'],
                    ['name' => 'Bathroom Organizers', 'slug' => 'bathroom-organizers', 'description' => 'Cotton swab jars, canisters and countertop caddies'],
                    ['name' => 'Towel Holders', 'slug' => 'towel-holders', 'description' => 'Freestanding and wall rings in brushed brass and matte black'],
                    ['name' => 'Bathroom Sets', 'slug' => 'bathroom-sets', 'description' => 'Coordinated 4-piece soap, tray, tumbler and jar sets'],
                ],
            ],
        ];

        $legacySlugs = [
            'electronics',
            'office-supplies',
            'networking-infrastructure',
            'computers-workstations',
            'audio-gear',
            'computer-peripherals',
            'print-supplies',
            'desk-equipment',
            'wireless-networking',
            'cables-wiring',
            'enterprise-laptops',
            'desktop-workstations',
            'noise-canceling-headphones',
            'wireless-earbuds',
            'mechanical-keyboards',
            'laser-toner-cartridges',
            'wifi-6-access-points',
            'cat6a-patch-cords',
        ];

        DB::transaction(function () use ($taxonomy, $legacySlugs) {
            $fallbackCategory = null;

            foreach ($taxonomy as $parentData) {
                $parent = Category::withTrashed()->updateOrCreate(
                    ['slug' => $parentData['slug']],
                    [
                        'name' => $parentData['name'],
                        'description' => $parentData['description'],
                        'parent_id' => null,
                        'sort_order' => $parentData['sort_order'],
                        'deleted_at' => null,
                    ]
                );

                foreach ($parentData['children'] as $index => $childData) {
                    $child = Category::withTrashed()->updateOrCreate(
                        ['slug' => $childData['slug']],
                        [
                            'name' => $childData['name'],
                            'description' => $childData['description'],
                            'parent_id' => $parent->id,
                            'sort_order' => $index + 1,
                            'deleted_at' => null,
                        ]
                    );

                    if ($childData['slug'] === 'desk-organizers' || $fallbackCategory === null) {
                        $fallbackCategory = $child;
                    }
                }
            }

            // Cleanly archive any legacy IT hardware products & remove legacy categories without violating RESTRICT FKs
            $oldCategories = Category::withTrashed()->whereIn('slug', $legacySlugs)->get();
            if ($oldCategories->isNotEmpty() && $fallbackCategory) {
                $oldIds = $oldCategories->pluck('id')->all();

                Product::withTrashed()
                    ->whereIn('category_id', $oldIds)
                    ->get()
                    ->each(function (Product $legacyProduct) use ($fallbackCategory) {
                        $legacyProduct->category_id = $fallbackCategory->id;
                        $legacyProduct->is_active = false;
                        $legacyProduct->save();

                        if (! $legacyProduct->trashed()) {
                            $legacyProduct->delete();
                        }
                    });

                // Delete leaves before parents so self-referential parent_id RESTRICT FK never fails
                $remaining = Category::withTrashed()->whereIn('id', $oldIds)->get();
                $guard = 0;
                while ($remaining->isNotEmpty() && $guard < 10) {
                    $guard++;
                    $deletedAny = false;
                    foreach ($remaining as $cat) {
                        $hasChildren = Category::withTrashed()->where('parent_id', $cat->id)->exists();
                        $hasProducts = Product::withTrashed()->where('category_id', $cat->id)->exists();
                        if (! $hasChildren && ! $hasProducts) {
                            $cat->forceDelete();
                            $deletedAny = true;
                        }
                    }
                    if (! $deletedAny) {
                        break;
                    }
                    $remaining = Category::withTrashed()->whereIn('id', $oldIds)->get();
                }
            }
        });
    }
}
