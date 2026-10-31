<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('avg_cost', 12, 2)->default(0.00)->after('cost_price');
        });

        // Initialize avg_cost with existing cost_price
        DB::table('products')->update([
            'avg_cost' => DB::raw('cost_price'),
        ]);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('avg_cost');
        });
    }
};
