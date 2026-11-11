<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            ['name' => 'Piece', 'short_name' => 'pc'],
            ['name' => 'Set', 'short_name' => 'set'],
            ['name' => 'Pair', 'short_name' => 'pr'],
            ['name' => 'Kilogram', 'short_name' => 'kg'],
            ['name' => 'Box', 'short_name' => 'box'],
            ['name' => 'Meter', 'short_name' => 'm'],
            ['name' => 'Pack', 'short_name' => 'pk'],
            ['name' => 'Liter', 'short_name' => 'L'],
        ];

        foreach ($units as $u) {
            Unit::updateOrCreate(
                ['name' => $u['name']],
                ['short_name' => $u['short_name']]
            );
        }
    }
}
