<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('supplier_id')
                ->nullable()
                ->after('unit_id')
                ->constrained('suppliers')
                ->restrictOnDelete();
            $table->string('color', 64)->nullable()->after('reorder_level');
            $table->string('size', 64)->nullable()->after('color');
            $table->string('material', 64)->nullable()->after('size');
            $table->string('style', 64)->nullable()->after('material');
            $table->boolean('has_variants')->default(false)->after('style');

            $table->index('supplier_id');
            $table->index('color');
            $table->index('size');
            $table->index('material');
            $table->index('style');
            $table->index('sell_price');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['sell_price']);
            $table->dropIndex(['style']);
            $table->dropIndex(['material']);
            $table->dropIndex(['size']);
            $table->dropIndex(['color']);
            $table->dropIndex(['supplier_id']);
            $table->dropConstrainedForeignId('supplier_id');
            $table->dropColumn(['color', 'size', 'material', 'style', 'has_variants']);
        });
    }
};
