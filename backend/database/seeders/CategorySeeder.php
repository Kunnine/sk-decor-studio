<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Computers & Tablets',
                'description' => 'Laptops, desktop computers, tablets, and accessories',
                'children' => [
                    ['name' => 'Laptops', 'description' => 'Ultrabooks, gaming laptops, and business notebooks'],
                    ['name' => 'Desktop PCs', 'description' => 'Pre-built workstations and gaming rigs'],
                    ['name' => 'Monitors & Displays', 'description' => '4K, gaming, and productivity displays'],
                ],
            ],
            [
                'name' => 'Audio & Peripherals',
                'description' => 'Audio devices, input peripherals, and workspace accessories',
                'children' => [
                    ['name' => 'Headphones & Headsets', 'description' => 'Noise-canceling and communication headsets'],
                    ['name' => 'Keyboards & Mice', 'description' => 'Mechanical keyboards and ergonomic mice'],
                    ['name' => 'Speakers', 'description' => 'Desktop and portable bluetooth speakers'],
                ],
            ],
            [
                'name' => 'Networking & Storage',
                'description' => 'Network infrastructure, routers, and external storage drives',
                'children' => [
                    ['name' => 'Routers & Access Points', 'description' => 'Wi-Fi 6 routers and enterprise access points'],
                    ['name' => 'Network Switches', 'description' => 'Gigabit and PoE switches'],
                    ['name' => 'External SSDs & Flash Drives', 'description' => 'High-speed portable solid state drives'],
                ],
            ],
            [
                'name' => 'Office Equipment',
                'description' => 'Printers, scanners, paper supplies, and desk accessories',
                'children' => [
                    ['name' => 'Printers & Toners', 'description' => 'Laser multifunction printers and toner cartridges'],
                    ['name' => 'Cables & Power', 'description' => 'USB-C cables, surge protectors, and power hubs'],
                ],
            ],
        ];

        foreach ($categories as $cat) {
            $parent = Category::updateOrCreate(
                ['slug' => Str::slug($cat['name'])],
                [
                    'name' => $cat['name'],
                    'description' => $cat['description'],
                    'parent_id' => null,
                ]
            );

            if (! empty($cat['children'])) {
                foreach ($cat['children'] as $child) {
                    Category::updateOrCreate(
                        ['slug' => Str::slug($child['name'])],
                        [
                            'name' => $child['name'],
                            'description' => $child['description'],
                            'parent_id' => $parent->id,
                        ]
                    );
                }
            }
        }
    }
}
