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
                'name' => 'TechSource Global Distribution',
                'phone' => '+1-800-555-0199',
                'email' => 'orders@techsource.test',
                'address' => '100 Industrial Parkway, Austin, TX 78701',
            ],
            [
                'name' => 'Apex Peripherals & Components',
                'phone' => '+1-800-555-0144',
                'email' => 'supply@apexperipherals.test',
                'address' => '450 Logistics Way, Chicago, IL 60601',
            ],
            [
                'name' => 'OmniOffice Supplies Co.',
                'phone' => '+1-800-555-0188',
                'email' => 'b2b@omnioffice.test',
                'address' => '720 Commerce Blvd, Atlanta, GA 30301',
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
