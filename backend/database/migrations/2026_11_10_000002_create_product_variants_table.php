<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->string('sku', 64)->unique();
            $table->string('name', 150)->nullable();
            $table->string('color', 64)->nullable();
            $table->string('size', 64)->nullable();
            $table->string('material', 64)->nullable();
            $table->string('style', 64)->nullable();
            $table->decimal('cost_price', 12, 2)->default(0.00);
            $table->decimal('avg_cost', 12, 2)->default(0.00);
            $table->decimal('sell_price', 12, 2)->default(0.00);
            $table->unsignedInteger('stock_qty')->default(0);
            $table->unsignedInteger('reorder_level')->default(5);
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            $table->index('product_id');
            $table->index(['product_id', 'is_active']);
            $table->index(['color', 'size']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE product_variants ADD CONSTRAINT check_product_variants_stock_qty_non_negative CHECK (stock_qty >= 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
