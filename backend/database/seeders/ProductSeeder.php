<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $categoryMap = Category::pluck('id', 'name')->toArray();

        $laptopCatId = $categoryMap['Laptops'] ?? Category::first()->id;
        $monitorCatId = $categoryMap['Monitors & Displays'] ?? $laptopCatId;
        $audioCatId = $categoryMap['Headphones & Headsets'] ?? $laptopCatId;
        $peripheralCatId = $categoryMap['Keyboards & Mice'] ?? $laptopCatId;
        $networkCatId = $categoryMap['Routers & Access Points'] ?? $laptopCatId;
        $storageCatId = $categoryMap['External SSDs & Flash Drives'] ?? $laptopCatId;
        $printerCatId = $categoryMap['Printers & Toners'] ?? $laptopCatId;
        $cableCatId = $categoryMap['Cables & Power'] ?? $laptopCatId;

        $products = [
            [
                'sku' => 'LAP-DELL-XPS15',
                'name' => 'Dell XPS 15 9530 Core i7 32GB 1TB',
                'description' => 'High performance laptop with 15.6 inch OLED display, Intel Core i7, 32GB RAM, 1TB SSD.',
                'category_id' => $laptopCatId,
                'cost_price' => 1450.00,
                'sell_price' => 1899.00,
                'stock_qty' => 18,
                'reorder_level' => 5,
                'is_active' => true,
            ],
            [
                'sku' => 'LAP-LEN-T14G4',
                'name' => 'Lenovo ThinkPad T14 Gen 4 Ryzen 7',
                'description' => 'Enterprise business laptop, AMD Ryzen 7 PRO, 16GB RAM, 512GB SSD, durable chassis.',
                'category_id' => $laptopCatId,
                'cost_price' => 950.00,
                'sell_price' => 1249.00,
                'stock_qty' => 12,
                'reorder_level' => 5,
                'is_active' => true,
            ],
            [
                'sku' => 'LAP-APP-MBP14',
                'name' => 'Apple MacBook Pro 14 M3 Pro 18GB 512GB',
                'description' => 'Apple Silicon workstation with Liquid Retina XDR display.',
                'category_id' => $laptopCatId,
                'cost_price' => 1650.00,
                'sell_price' => 1999.00,
                'stock_qty' => 3, // Low stock! Reorder level is 5
                'reorder_level' => 5,
                'is_active' => true,
            ],
            [
                'sku' => 'DISP-LG-27UP850',
                'name' => 'LG 27UP850-W 27" 4K UHD IPS USB-C Monitor',
                'description' => 'Professional 4K monitor with HDR400, 96W USB-C PD, hardware calibration support.',
                'category_id' => $monitorCatId,
                'cost_price' => 280.00,
                'sell_price' => 399.00,
                'stock_qty' => 15,
                'reorder_level' => 6,
                'is_active' => true,
            ],
            [
                'sku' => 'DISP-DEL-U3423WE',
                'name' => 'Dell UltraSharp 34 Curved USB-C Hub Monitor',
                'description' => 'WQHD 3440x1440 IPS Black curve monitor with built-in KVM switch and RJ45 Ethernet.',
                'category_id' => $monitorCatId,
                'cost_price' => 620.00,
                'sell_price' => 849.00,
                'stock_qty' => 4, // Low stock!
                'reorder_level' => 5,
                'is_active' => true,
            ],
            [
                'sku' => 'AUD-SNY-WH1000XM5',
                'name' => 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
                'description' => 'Industry-leading noise canceling over-ear headphones with 30-hour battery life.',
                'category_id' => $audioCatId,
                'cost_price' => 260.00,
                'sell_price' => 379.00,
                'stock_qty' => 28,
                'reorder_level' => 10,
                'is_active' => true,
            ],
            [
                'sku' => 'AUD-BOS-QC45',
                'name' => 'Bose QuietComfort 45 Bluetooth Wireless Headphones',
                'description' => 'Iconic quiet, comfortable listening, acoustic noise cancelling headphones.',
                'category_id' => $audioCatId,
                'cost_price' => 210.00,
                'sell_price' => 299.00,
                'stock_qty' => 14,
                'reorder_level' => 8,
                'is_active' => true,
            ],
            [
                'sku' => 'PER-LOG-MXMAS3S',
                'name' => 'Logitech MX Master 3S Wireless Performance Mouse',
                'description' => 'Quiet 8K DPI tracking sensor, electromagnetic MagSpeed scrolling wheel.',
                'category_id' => $peripheralCatId,
                'cost_price' => 65.00,
                'sell_price' => 99.00,
                'stock_qty' => 45,
                'reorder_level' => 15,
                'is_active' => true,
            ],
            [
                'sku' => 'PER-LOG-MXKEYS-S',
                'name' => 'Logitech MX Keys S Advanced Wireless Keyboard',
                'description' => 'Fluid and quiet typing with smart backlighting and programmable smart actions.',
                'category_id' => $peripheralCatId,
                'cost_price' => 75.00,
                'sell_price' => 119.00,
                'stock_qty' => 30,
                'reorder_level' => 10,
                'is_active' => true,
            ],
            [
                'sku' => 'PER-KEY-K2PRO',
                'name' => 'Keychron K2 Pro QMK/VIA Wireless Mechanical Keyboard',
                'description' => '75% layout custom mechanical keyboard with hot-swappable switches and RGB.',
                'category_id' => $peripheralCatId,
                'cost_price' => 60.00,
                'sell_price' => 89.00,
                'stock_qty' => 9, // Low stock!
                'reorder_level' => 10,
                'is_active' => true,
            ],
            [
                'sku' => 'NET-UBI-U6PRO',
                'name' => 'Ubiquiti UniFi6 Pro Access Point (U6-Pro)',
                'description' => 'High-performance ceiling-mounted Wi-Fi 6 access point for dense enterprise environments.',
                'category_id' => $networkCatId,
                'cost_price' => 110.00,
                'sell_price' => 159.00,
                'stock_qty' => 22,
                'reorder_level' => 8,
                'is_active' => true,
            ],
            [
                'sku' => 'NET-ASU-AX6000',
                'name' => 'ASUS RT-AX88U Pro Dual-Band WiFi 6 Gaming Router',
                'description' => 'Dual 2.5G ports, quad-core 2.0 GHz CPU, AiMesh support, commercial-grade security.',
                'category_id' => $networkCatId,
                'cost_price' => 180.00,
                'sell_price' => 269.00,
                'stock_qty' => 11,
                'reorder_level' => 5,
                'is_active' => true,
            ],
            [
                'sku' => 'SSD-SAM-T7-1TB',
                'name' => 'Samsung T7 Shield 1TB Portable External SSD',
                'description' => 'Rugged durable design with USB 3.2 Gen 2 transfer speeds up to 1050 MB/s, IP65 rated.',
                'category_id' => $storageCatId,
                'cost_price' => 70.00,
                'sell_price' => 109.00,
                'stock_qty' => 38,
                'reorder_level' => 12,
                'is_active' => true,
            ],
            [
                'sku' => 'SSD-SAM-T7-2TB',
                'name' => 'Samsung T7 Shield 2TB Portable External SSD',
                'description' => 'High-capacity rugged external SSD, shock-resistant and water/dust resistant.',
                'category_id' => $storageCatId,
                'cost_price' => 125.00,
                'sell_price' => 179.00,
                'stock_qty' => 6, // Low stock!
                'reorder_level' => 10,
                'is_active' => true,
            ],
            [
                'sku' => 'PRN-HP-LJ4003DW',
                'name' => 'HP LaserJet Pro 4003dw Wireless Monochrome Printer',
                'description' => 'Blazing fast black and white office laser printer with automatic duplex printing.',
                'category_id' => $printerCatId,
                'cost_price' => 210.00,
                'sell_price' => 299.00,
                'stock_qty' => 8,
                'reorder_level' => 4,
                'is_active' => true,
            ],
            [
                'sku' => 'TON-HP-148A',
                'name' => 'HP 148A Black Original LaserJet Toner Cartridge',
                'description' => 'Standard yield black toner cartridge, approx 2,900 pages.',
                'category_id' => $printerCatId,
                'cost_price' => 55.00,
                'sell_price' => 89.00,
                'stock_qty' => 25,
                'reorder_level' => 10,
                'is_active' => true,
            ],
            [
                'sku' => 'CBL-ANK-737PWR',
                'name' => 'Anker 737 GaNPrime 140W USB-C Wall Charger',
                'description' => 'Compact 3-port fast wall charger with PowerIQ 4.0 for laptops and phones.',
                'category_id' => $cableCatId,
                'cost_price' => 52.00,
                'sell_price' => 79.99,
                'stock_qty' => 34,
                'reorder_level' => 10,
                'is_active' => true,
            ],
            [
                'sku' => 'CBL-ANK-USBC-2M',
                'name' => 'Anker 240W Braided USB-C to USB-C Cable (6ft)',
                'description' => 'Heavy duty braided fast charging and sync cable supporting 240W USB Power Delivery.',
                'category_id' => $cableCatId,
                'cost_price' => 8.50,
                'sell_price' => 16.99,
                'stock_qty' => 80,
                'reorder_level' => 20,
                'is_active' => true,
            ],
        ];

        foreach ($products as $item) {
            Product::updateOrCreate(
                ['sku' => $item['sku']],
                $item
            );
        }
    }
}
