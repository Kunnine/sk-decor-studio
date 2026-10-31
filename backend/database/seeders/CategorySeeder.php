<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        // Level 1 Root Categories
        $electronics = Category::updateOrCreate(
            ['slug' => 'electronics'],
            ['name' => 'Electronics', 'description' => 'Electronic devices, gadgets and peripherals', 'parent_id' => null, 'sort_order' => 1]
        );

        $office = Category::updateOrCreate(
            ['slug' => 'office-supplies'],
            ['name' => 'Office Supplies', 'description' => 'Commercial stationery, paper, print consumables and furniture', 'parent_id' => null, 'sort_order' => 2]
        );

        $networking = Category::updateOrCreate(
            ['slug' => 'networking-infrastructure'],
            ['name' => 'Networking Infrastructure', 'description' => 'Enterprise routers, wireless switches and telecom gear', 'parent_id' => null, 'sort_order' => 3]
        );

        // Level 2 Categories
        $computers = Category::updateOrCreate(
            ['slug' => 'computers-workstations'],
            ['name' => 'Computers & Workstations', 'description' => 'Personal computers, workstations and servers', 'parent_id' => $electronics->id, 'sort_order' => 1]
        );

        $audio = Category::updateOrCreate(
            ['slug' => 'audio-gear'],
            ['name' => 'Audio Gear', 'description' => 'Headphones, microphones and speakers', 'parent_id' => $electronics->id, 'sort_order' => 2]
        );

        $peripherals = Category::updateOrCreate(
            ['slug' => 'computer-peripherals'],
            ['name' => 'Computer Peripherals', 'description' => 'Mice, keyboards, docking stations', 'parent_id' => $electronics->id, 'sort_order' => 3]
        );

        $printSupplies = Category::updateOrCreate(
            ['slug' => 'print-supplies'],
            ['name' => 'Print Supplies', 'description' => 'Laser toner, ink, imaging units', 'parent_id' => $office->id, 'sort_order' => 1]
        );

        $deskEquip = Category::updateOrCreate(
            ['slug' => 'desk-equipment'],
            ['name' => 'Desk Equipment', 'description' => 'Ergonomic stands, desk pads, organizers', 'parent_id' => $office->id, 'sort_order' => 2]
        );

        $wirelessNet = Category::updateOrCreate(
            ['slug' => 'wireless-networking'],
            ['name' => 'Wireless Networking', 'description' => 'Wi-Fi access points and routers', 'parent_id' => $networking->id, 'sort_order' => 1]
        );

        $cablesWiring = Category::updateOrCreate(
            ['slug' => 'cables-wiring'],
            ['name' => 'Cables & Wiring', 'description' => 'Ethernet, fiber, patch cables and power cords', 'parent_id' => $networking->id, 'sort_order' => 2]
        );

        // Level 3 Categories (Deep nesting)
        Category::updateOrCreate(
            ['slug' => 'enterprise-laptops'],
            ['name' => 'Enterprise Laptops', 'description' => 'Business and enterprise laptop computers', 'parent_id' => $computers->id, 'sort_order' => 1]
        );

        Category::updateOrCreate(
            ['slug' => 'desktop-workstations'],
            ['name' => 'Desktop Workstations', 'description' => 'High-power rendering and developer workstations', 'parent_id' => $computers->id, 'sort_order' => 2]
        );

        Category::updateOrCreate(
            ['slug' => 'noise-canceling-headphones'],
            ['name' => 'Noise Canceling Headphones', 'description' => 'Active noise cancelling headsets', 'parent_id' => $audio->id, 'sort_order' => 1]
        );

        Category::updateOrCreate(
            ['slug' => 'wireless-earbuds'],
            ['name' => 'Wireless Earbuds', 'description' => 'True wireless stereo earbuds', 'parent_id' => $audio->id, 'sort_order' => 2]
        );

        Category::updateOrCreate(
            ['slug' => 'mechanical-keyboards'],
            ['name' => 'Mechanical Keyboards', 'description' => 'Custom and hot-swappable mechanical keyboards', 'parent_id' => $peripherals->id, 'sort_order' => 1]
        );

        Category::updateOrCreate(
            ['slug' => 'laser-toner-cartridges'],
            ['name' => 'Laser Toner Cartridges', 'description' => 'High yield monochrome and color toner', 'parent_id' => $printSupplies->id, 'sort_order' => 1]
        );

        Category::updateOrCreate(
            ['slug' => 'wifi-6-access-points'],
            ['name' => 'Wi-Fi 6 Access Points', 'description' => 'Enterprise high-density 802.11ax access points', 'parent_id' => $wirelessNet->id, 'sort_order' => 1]
        );

        Category::updateOrCreate(
            ['slug' => 'cat6a-patch-cords'],
            ['name' => 'Cat6A Patch Cords', 'description' => 'Shielded 10Gbps Ethernet cables', 'parent_id' => $cablesWiring->id, 'sort_order' => 1]
        );
    }
}
