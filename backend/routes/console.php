<?php

use App\Services\SettingService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Daily low-stock digest scheduled at Settings('digest_time')
$digestTime = rescue(fn () => app(SettingService::class)->get('digest_time', '08:00'), '08:00');
Schedule::command('stock:low-digest')->dailyAt($digestTime ?: '08:00');
