<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Services\SettingService;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        foreach (SettingService::DEFAULTS as $key => $value) {
            $existing = Setting::where('key', $key)->first();

            if (! $existing) {
                Setting::create([
                    'key' => $key,
                    'value' => $value,
                ]);
            } elseif ($key === 'business_name' && $existing->value === 'Apex Retail Solutions') {
                $existing->update(['value' => $value]);
            }
        }
    }
}
