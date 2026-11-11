<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_alerts_enabled')->nullable()->after('is_active');
            $table->boolean('digest_enabled')->nullable()->after('email_alerts_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['email_alerts_enabled', 'digest_enabled']);
        });
    }
};
