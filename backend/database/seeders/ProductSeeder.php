<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $categories = Category::pluck('id', 'name')->toArray();
        $slugMap = Category::pluck('id', 'slug')->toArray();

        $piece = Unit::where('short_name', 'pc')->first()?->id;
        $box = Unit::where('short_name', 'box')->first()?->id ?? $piece;
        $meter = Unit::where('short_name', 'm')->first()?->id ?? $piece;
        $pack = Unit::where('short_name', 'pk')->first()?->id ?? $piece;

        $catLaptop = $slugMap['enterprise-laptops'] ?? Category::first()->id;
        $catDesktop = $slugMap['desktop-workstations'] ?? $catLaptop;
        $catHeadphones = $slugMap['noise-canceling-headphones'] ?? $catLaptop;
        $catEarbuds = $slugMap['wireless-earbuds'] ?? $catLaptop;
        $catKeyboards = $slugMap['mechanical-keyboards'] ?? $catLaptop;
        $catPeripherals = $slugMap['computer-peripherals'] ?? $catLaptop;
        $catToner = $slugMap['laser-toner-cartridges'] ?? $catLaptop;
        $catDesk = $slugMap['desk-equipment'] ?? $catLaptop;
        $catWifi = $slugMap['wifi-6-access-points'] ?? $catLaptop;
        $catCables = $slugMap['cat6a-patch-cords'] ?? $catLaptop;

        $products = [
            // 1-5 Laptops
            ['sku' => 'LAP-DELL-XPS15', 'name' => 'Dell XPS 15 9530 Core i7 32GB 1TB', 'description' => '15.6" OLED 3.5K display, Intel Core i7-13700H, 32GB DDR5, 1TB NVMe SSD', 'category_id' => $catLaptop, 'unit_id' => $piece, 'cost_price' => 1450.00, 'sell_price' => 1899.00, 'initial_stock' => 18, 'reorder_level' => 5],
            ['sku' => 'LAP-LEN-T14G4', 'name' => 'Lenovo ThinkPad T14 Gen 4 Ryzen 7', 'description' => 'Enterprise business laptop, AMD Ryzen 7 PRO 7840U, 16GB RAM, 512GB SSD', 'category_id' => $catLaptop, 'unit_id' => $piece, 'cost_price' => 950.00, 'sell_price' => 1249.00, 'initial_stock' => 12, 'reorder_level' => 5],
            ['sku' => 'LAP-APP-MBP14', 'name' => 'Apple MacBook Pro 14 M3 Pro 18GB 512GB', 'description' => 'Liquid Retina XDR, Apple M3 Pro 11-core CPU, 14-core GPU, Space Black', 'category_id' => $catLaptop, 'unit_id' => $piece, 'cost_price' => 1650.00, 'sell_price' => 1999.00, 'initial_stock' => 4, 'reorder_level' => 5],
            ['sku' => 'LAP-HP-EB840G10', 'name' => 'HP EliteBook 840 G10 Core i5 16GB 512GB', 'description' => 'Commercial ultrabook with HP Sure View reflect privacy screen and Wi-Fi 6E', 'category_id' => $catLaptop, 'unit_id' => $piece, 'cost_price' => 880.00, 'sell_price' => 1149.00, 'initial_stock' => 15, 'reorder_level' => 5],
            ['sku' => 'LAP-ASU-ZEN14', 'name' => 'ASUS ZenBook 14 OLED Ultra 7 32GB 1TB', 'description' => 'Intel Core Ultra 7 155H, 14-inch 120Hz 3K OLED, 75Wh battery life', 'category_id' => $catLaptop, 'unit_id' => $piece, 'cost_price' => 1020.00, 'sell_price' => 1299.00, 'initial_stock' => 7, 'reorder_level' => 4],

            // 6-10 Desktops & Workstations
            ['sku' => 'DSK-APP-STUDIO', 'name' => 'Apple Mac Studio M2 Max 32GB 512GB', 'description' => 'Compact desktop powerhouse with 12-core CPU, 30-core GPU, 4x Thunderbolt 4', 'category_id' => $catDesktop, 'unit_id' => $piece, 'cost_price' => 1700.00, 'sell_price' => 1999.00, 'initial_stock' => 6, 'reorder_level' => 3],
            ['sku' => 'DSK-DEL-PREC3660', 'name' => 'Dell Precision 3660 Tower i7 RTX 4000', 'description' => 'CAD & 3D workstation tower, Intel i7-13700K, 64GB DDR5, RTX 4000 Ada 20GB', 'category_id' => $catDesktop, 'unit_id' => $piece, 'cost_price' => 2400.00, 'sell_price' => 2999.00, 'initial_stock' => 3, 'reorder_level' => 2],
            ['sku' => 'DSK-LEN-P3TINY', 'name' => 'Lenovo ThinkStation P3 Tiny Workstation', 'description' => 'Ultra small form factor workstation with Intel i7-13700 and NVIDIA T1000 8GB', 'category_id' => $catDesktop, 'unit_id' => $piece, 'cost_price' => 1150.00, 'sell_price' => 1499.00, 'initial_stock' => 9, 'reorder_level' => 4],
            ['sku' => 'DSK-HP-Z2MINIG9', 'name' => 'HP Z2 Mini G9 Workstation i7 32GB 1TB', 'description' => 'Fits behind monitors, enterprise certs for Autodesk, Solidworks, Adobe', 'category_id' => $catDesktop, 'unit_id' => $piece, 'cost_price' => 1350.00, 'sell_price' => 1699.00, 'initial_stock' => 5, 'reorder_level' => 3],
            ['sku' => 'DSK-INT-NUC13', 'name' => 'Intel NUC 13 Pro Desk Edition i5 16GB', 'description' => 'Compact office micro PC with dual HDMI 2.1, dual Thunderbolt 4, 2.5GbE LAN', 'category_id' => $catDesktop, 'unit_id' => $piece, 'cost_price' => 480.00, 'sell_price' => 649.00, 'initial_stock' => 14, 'reorder_level' => 5],

            // 11-15 Headphones
            ['sku' => 'AUD-SNY-WH1000XM5', 'name' => 'Sony WH-1000XM5 Wireless Noise Canceling Headphones', 'description' => 'Industry-leading noise canceling over-ear headphones, 30-hour battery, LDAC', 'category_id' => $catHeadphones, 'unit_id' => $piece, 'cost_price' => 260.00, 'sell_price' => 399.00, 'initial_stock' => 28, 'reorder_level' => 10],
            ['sku' => 'AUD-BOS-QC45', 'name' => 'Bose QuietComfort 45 Bluetooth Headphones', 'description' => 'Acoustic Noise Cancelling, TriPort acoustic headphone architecture', 'category_id' => $catHeadphones, 'unit_id' => $piece, 'cost_price' => 210.00, 'sell_price' => 329.00, 'initial_stock' => 16, 'reorder_level' => 8],
            ['sku' => 'AUD-SEN-MOM4', 'name' => 'Sennheiser Momentum 4 Wireless Headphones', 'description' => 'Audiophile-inspired 42mm transducer system, exceptional 60-hour battery life', 'category_id' => $catHeadphones, 'unit_id' => $piece, 'cost_price' => 220.00, 'sell_price' => 349.95, 'initial_stock' => 11, 'reorder_level' => 6],
            ['sku' => 'AUD-APP-MAX', 'name' => 'Apple AirPods Max - Silver', 'description' => 'Apple-designed dynamic driver, computational audio with H1 chips in each ear cup', 'category_id' => $catHeadphones, 'unit_id' => $piece, 'cost_price' => 420.00, 'sell_price' => 549.00, 'initial_stock' => 5, 'reorder_level' => 4],
            ['sku' => 'AUD-ATH-M50XBT2', 'name' => 'Audio-Technica ATH-M50xBT2 Studio Monitor Headphones', 'description' => 'Legendary studio sonic signature with wireless Bluetooth convenience', 'category_id' => $catHeadphones, 'unit_id' => $piece, 'cost_price' => 130.00, 'sell_price' => 199.00, 'initial_stock' => 22, 'reorder_level' => 8],

            // 16-19 Earbuds
            ['sku' => 'AUD-APP-APP2', 'name' => 'Apple AirPods Pro (2nd generation) USB-C', 'description' => 'Up to 2x more active noise cancellation, adaptive audio, USB-C MagSafe case', 'category_id' => $catEarbuds, 'unit_id' => $piece, 'cost_price' => 180.00, 'sell_price' => 249.00, 'initial_stock' => 35, 'reorder_level' => 15],
            ['sku' => 'AUD-SNY-WF1000XM5', 'name' => 'Sony WF-1000XM5 Truly Wireless Earbuds', 'description' => 'Dual feedback microphones, integrated V2 processor, premium sound quality', 'category_id' => $catEarbuds, 'unit_id' => $piece, 'cost_price' => 195.00, 'sell_price' => 299.00, 'initial_stock' => 19, 'reorder_level' => 10],
            ['sku' => 'AUD-JAB-EL8ACT', 'name' => 'Jabra Elite 8 Active Rugged Earbuds', 'description' => 'Dustproof, waterproof IP68 earbuds tested to military standards (MIL-STD-810h)', 'category_id' => $catEarbuds, 'unit_id' => $piece, 'cost_price' => 125.00, 'sell_price' => 199.99, 'initial_stock' => 14, 'reorder_level' => 5],
            ['sku' => 'AUD-GOO-BUDSPRO', 'name' => 'Google Pixel Buds Pro - Charcoal', 'description' => 'Silent Seal active noise cancellation, volume EQ, real-time translations', 'category_id' => $catEarbuds, 'unit_id' => $piece, 'cost_price' => 120.00, 'sell_price' => 199.00, 'initial_stock' => 18, 'reorder_level' => 6],

            // 20-24 Mechanical Keyboards
            ['sku' => 'PER-KEY-Q1PRO', 'name' => 'Keychron Q1 Pro QMK/VIA Wireless Custom Keyboard', 'description' => '75% full metal mechanical keyboard with double-gasket design and PBT keycaps', 'category_id' => $catKeyboards, 'unit_id' => $piece, 'cost_price' => 140.00, 'sell_price' => 219.00, 'initial_stock' => 12, 'reorder_level' => 5],
            ['sku' => 'PER-LOG-MXMECH', 'name' => 'Logitech MX Mechanical Wireless Illuminated Keyboard', 'description' => 'Low-profile mechanical switches, tactile quiet, multi-OS Bluetooth and Bolt', 'category_id' => $catKeyboards, 'unit_id' => $piece, 'cost_price' => 110.00, 'sell_price' => 169.99, 'initial_stock' => 24, 'reorder_level' => 8],
            ['sku' => 'PER-COR-K70RGB', 'name' => 'Corsair K70 RGB PRO Mechanical Gaming Keyboard', 'description' => 'Cherry MX Red linear switches, durable aluminum frame, 8000Hz hyper-polling', 'category_id' => $catKeyboards, 'unit_id' => $piece, 'cost_price' => 95.00, 'sell_price' => 159.99, 'initial_stock' => 15, 'reorder_level' => 6],
            ['sku' => 'PER-DUC-ONE3', 'name' => 'Ducky One 3 Daybreak TKL Hot-Swap Mechanical Keyboard', 'description' => 'QUACK mechanics, dual-layer hotswap PCB, silicone acoustic padding', 'category_id' => $catKeyboards, 'unit_id' => $piece, 'cost_price' => 85.00, 'sell_price' => 139.00, 'initial_stock' => 8, 'reorder_level' => 4],
            ['sku' => 'PER-NUP-AIR75', 'name' => 'NuPhy Air75 V2 Ultra-Slim Wireless Keyboard', 'description' => 'Ultra-thin mechanical keyboard supporting 1000Hz 2.4G wireless polling rate', 'category_id' => $catKeyboards, 'unit_id' => $piece, 'cost_price' => 80.00, 'sell_price' => 129.95, 'initial_stock' => 17, 'reorder_level' => 5],

            // 25-28 Mice & Docks
            ['sku' => 'PER-LOG-MXMAS3S', 'name' => 'Logitech MX Master 3S Wireless Performance Mouse', 'description' => 'Quiet 8K DPI tracking on glass, electromagnetic MagSpeed scrolling wheel', 'category_id' => $catPeripherals, 'unit_id' => $piece, 'cost_price' => 65.00, 'sell_price' => 99.99, 'initial_stock' => 42, 'reorder_level' => 15],
            ['sku' => 'PER-RAZ-DETHV3', 'name' => 'Razer DeathAdder V3 Pro Wireless Ergonomic Mouse', 'description' => 'Focus Pro 30K optical sensor, 63g ultra-lightweight design, 90hr battery', 'category_id' => $catPeripherals, 'unit_id' => $piece, 'cost_price' => 90.00, 'sell_price' => 149.99, 'initial_stock' => 16, 'reorder_level' => 6],
            ['sku' => 'PER-CAL-TS4', 'name' => 'CalDigit TS4 Thunderbolt 4 Station 18-Port Dock', 'description' => '98W host charging, 2.5GbE, 8x USB ports, DisplayPort 1.4, SD UHS-II slot', 'category_id' => $catPeripherals, 'unit_id' => $piece, 'cost_price' => 280.00, 'sell_price' => 399.99, 'initial_stock' => 9, 'reorder_level' => 4],
            ['sku' => 'PER-DEL-D6000', 'name' => 'Dell Universal Dock D6000S USB-C / USB-A', 'description' => 'DisplayLink technology supporting triple 4K displays or single 5K monitor', 'category_id' => $catPeripherals, 'unit_id' => $piece, 'cost_price' => 160.00, 'sell_price' => 249.00, 'initial_stock' => 20, 'reorder_level' => 8],

            // 29-32 Toner Cartridges
            ['sku' => 'TON-HP-148A', 'name' => 'HP 148A Black Original LaserJet Toner Cartridge', 'description' => 'Standard yield black toner cartridge, approx 2,900 pages ISO/IEC 19752', 'category_id' => $catToner, 'unit_id' => $box, 'cost_price' => 55.00, 'sell_price' => 89.99, 'initial_stock' => 30, 'reorder_level' => 10],
            ['sku' => 'TON-CAN-057', 'name' => 'Canon 057 Black High Capacity Toner Cartridge', 'description' => 'Original all-in-one cartridge for imageCLASS laser printers, 3,100 pages', 'category_id' => $catToner, 'unit_id' => $box, 'cost_price' => 60.00, 'sell_price' => 94.50, 'initial_stock' => 18, 'reorder_level' => 8],
            ['sku' => 'TON-BRO-TN760', 'name' => 'Brother TN-760 High Yield Black Toner', 'description' => 'Prints up to 3,000 pages for Brother monochrome laser printers and all-in-ones', 'category_id' => $catToner, 'unit_id' => $box, 'cost_price' => 48.00, 'sell_price' => 79.99, 'initial_stock' => 35, 'reorder_level' => 12],
            ['sku' => 'TON-SAM-D111S', 'name' => 'Samsung MLT-D111S Standard Toner Cartridge', 'description' => 'Clean black output for Xpress laser printers, 1,000 pages yield', 'category_id' => $catToner, 'unit_id' => $box, 'cost_price' => 38.00, 'sell_price' => 59.99, 'initial_stock' => 22, 'reorder_level' => 8],

            // 33-36 Desk Equipment
            ['sku' => 'OFF-ARM-DUAL', 'name' => 'Heavy-Duty Gas Spring Dual Monitor Arm', 'description' => 'Holds two screens 17"-32" up to 9kg each, integrated cable management', 'category_id' => $catDesk, 'unit_id' => $piece, 'cost_price' => 45.00, 'sell_price' => 79.99, 'initial_stock' => 25, 'reorder_level' => 8],
            ['sku' => 'OFF-PAD-FELT', 'name' => 'Large Merino Wool Felt Desk Pad 36x16"', 'description' => 'Non-slip natural rubber base, anti-static water-resistant wool felt mat', 'category_id' => $catDesk, 'unit_id' => $piece, 'cost_price' => 15.00, 'sell_price' => 34.99, 'initial_stock' => 50, 'reorder_level' => 15],
            ['sku' => 'OFF-STN-ALUM', 'name' => 'Ergonomic Foldable Aluminum Laptop Riser', 'description' => 'Machined aircraft-grade aluminum with silicone heat-dissipation pads', 'category_id' => $catDesk, 'unit_id' => $piece, 'cost_price' => 18.00, 'sell_price' => 39.99, 'initial_stock' => 38, 'reorder_level' => 10],
            ['sku' => 'OFF-SPN-CABLE', 'name' => 'Under-Desk Magnetic Cable Management Spine', 'description' => 'Flexible vertebrae spine for height-adjustable sit-stand workstations', 'category_id' => $catDesk, 'unit_id' => $piece, 'cost_price' => 22.00, 'sell_price' => 44.99, 'initial_stock' => 19, 'reorder_level' => 6],

            // 37-38 Wi-Fi Access Points
            ['sku' => 'NET-UBI-U6PRO', 'name' => 'Ubiquiti UniFi6 Pro High-Performance AP', 'description' => 'Ceiling mounted Wi-Fi 6 AP, 5.3 Gbps aggregate throughput rate, PoE+', 'category_id' => $catWifi, 'unit_id' => $piece, 'cost_price' => 110.00, 'sell_price' => 159.00, 'initial_stock' => 24, 'reorder_level' => 8],
            ['sku' => 'NET-ARU-AP22', 'name' => 'Aruba Instant On AP22 Wi-Fi 6 Enterprise AP', 'description' => 'OFDMA, MU-MIMO, Target Wake Time, smart mesh support, built-in gateway', 'category_id' => $catWifi, 'unit_id' => $piece, 'cost_price' => 125.00, 'sell_price' => 179.99, 'initial_stock' => 14, 'reorder_level' => 5],

            // 39-40 Cables
            ['sku' => 'CBL-CAT6A-3M', 'name' => 'Cat6A S/FTP Shielded Patch Cable 3m (10-Pack)', 'description' => '500MHz 10GBASE-T gold-plated snagless RJ45 connectors, LSZH jacket', 'category_id' => $catCables, 'unit_id' => $pack, 'cost_price' => 28.00, 'sell_price' => 49.99, 'initial_stock' => 45, 'reorder_level' => 12],
            ['sku' => 'CBL-ANK-240W', 'name' => 'Anker 240W Bio-Braided USB-C to USB-C Cable (6ft)', 'description' => 'Supports USB Power Delivery 3.1 240W ultra-fast charging, plant-based nylon', 'category_id' => $catCables, 'unit_id' => $piece, 'cost_price' => 8.50, 'sell_price' => 19.99, 'initial_stock' => 60, 'reorder_level' => 15],
        ];

        $adminUser = User::where('role', User::ROLE_ADMIN)->first() ?? User::factory()->admin()->create();
        $supplier = Supplier::first() ?? Supplier::create([
            'name' => 'TechSource Global Distribution',
            'phone' => '+1-800-555-0199',
            'email' => 'orders@techsource.test',
            'address' => '100 Industrial Parkway, Austin, TX 78701',
        ]);

        $createdItems = [];

        foreach ($products as $pData) {
            $initialStock = $pData['initial_stock'];
            unset($pData['initial_stock']);
            $pData['stock_qty'] = 0;
            $pData['avg_cost'] = $pData['cost_price'];

            $product = Product::updateOrCreate(
                ['sku' => $pData['sku']],
                $pData
            );

            $createdItems[] = [
                'product' => $product,
                'qty' => $initialStock,
                'cost' => $pData['cost_price'],
            ];
        }

        // Create and receive initial purchase to establish trustworthy movements & stock balances
        $initialPurchase = Purchase::updateOrCreate(
            ['ref_no' => 'PO-2026-INIT-001'],
            [
                'supplier_id' => $supplier->id,
                'status' => Purchase::STATUS_DRAFT,
                'total' => 0.00,
                'notes' => 'Initial inventory intake for demo seed dataset',
                'created_by' => $adminUser->id,
            ]
        );

        $totalCost = 0.00;
        foreach ($createdItems as $item) {
            PurchaseItem::updateOrCreate(
                [
                    'purchase_id' => $initialPurchase->id,
                    'product_id' => $item['product']->id,
                ],
                [
                    'qty' => $item['qty'],
                    'unit_cost' => $item['cost'],
                ]
            );
            $totalCost += ($item['qty'] * $item['cost']);
        }

        $initialPurchase->total = $totalCost;
        $initialPurchase->save();

        /** @var StockService $stockService */
        $stockService = app(StockService::class);
        $stockService->receive($initialPurchase, $adminUser);
    }
}
