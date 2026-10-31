<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class SettingService
{
    public const CACHE_KEY = 'app_settings_cache';

    public const DEFAULTS = [
        'business_name' => 'Apex Retail Solutions',
        'business_logo' => null,
        'currency_code' => 'USD',
        'currency_symbol' => '$',
        'tax_rate' => '10.00',
        'default_reorder_level' => '10',
        'invoice_prefix' => 'INV',
        'date_format' => 'YYYY-MM-DD',
    ];

    /**
     * Retrieve all settings as a key-value associative array, leveraging cache.
     *
     * @return array<string, mixed>
     */
    public function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $settings = Setting::pluck('value', 'key')->toArray();

            $merged = array_merge(self::DEFAULTS, $settings);

            // Compute logo URL if set
            if (! empty($merged['business_logo'])) {
                $merged['business_logo_url'] = Storage::disk('public')->url($merged['business_logo']);
            } else {
                $merged['business_logo_url'] = null;
            }

            return $merged;
        });
    }

    /**
     * Get a specific setting value by key.
     */
    public function get(string $key, mixed $default = null): mixed
    {
        $all = $this->all();

        return $all[$key] ?? $default ?? (self::DEFAULTS[$key] ?? null);
    }

    /**
     * Update multiple settings and invalidate the cache.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function setMany(array $data): array
    {
        foreach ($data as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value]
            );
        }

        $this->clearCache();

        return $this->all();
    }

    /**
     * Upload business logo image, delete previous logo file, and update setting.
     */
    public function uploadLogo(UploadedFile $file): array
    {
        $currentLogo = Setting::where('key', 'business_logo')->value('value');
        if ($currentLogo && Storage::disk('public')->exists($currentLogo)) {
            Storage::disk('public')->delete($currentLogo);
        }

        $path = $file->store('logos', 'public');

        $this->setMany(['business_logo' => $path]);

        return $this->all();
    }

    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
