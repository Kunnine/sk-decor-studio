<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            [
                'name' => 'Lumiere Lighting Studio',
                'phone' => '+1-800-555-0210',
                'email' => 'orders@lumierestudio.test',
                'address' => '210 Mercer St, Seattle, WA 98109',
            ],
            [
                'name' => 'Nordic Home Atelier',
                'phone' => '+1-800-555-0225',
                'email' => 'trade@nordicatelier.test',
                'address' => '480 Pearl District Blvd, Portland, OR 97209',
            ],
            [
                'name' => 'Botanica & Clay Living',
                'phone' => '+1-800-555-0240',
                'email' => 'supply@botanicaclay.test',
                'address' => '890 Artisan Way, San Francisco, CA 94107',
            ],
            [
                'name' => 'Atelier Linen & Textiles',
                'phone' => '+1-800-555-0265',
                'email' => 'b2b@atelierlinen.test',
                'address' => '340 Crosby St, New York, NY 10012',
            ],
            [
                'name' => 'Marble & Bath Artisans',
                'phone' => '+1-800-555-0280',
                'email' => 'studio@marblebath.test',
                'address' => '615 Melrose Place, Los Angeles, CA 90069',
            ],
        ];

        foreach ($suppliers as $item) {
            Supplier::updateOrCreate(
                ['name' => $item['name']],
                $item
            );
        }
    }
}
