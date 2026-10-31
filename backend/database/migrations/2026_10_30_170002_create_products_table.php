<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku', 64)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->restrictOnDelete();
            $table->decimal('cost_price', 12, 2)->default(0.00);
            $table->decimal('sell_price', 12, 2)->default(0.00);
            $table->unsignedInteger('stock_qty')->default(0);
            $table->unsignedInteger('reorder_level')->default(10);
            $table->string('image_path')->nullable();
            $table->string('thumb_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('low_stock_notified_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index('category_id');
            $table->index('unit_id');
            $table->index('name');
            $table->index('sku');
            $table->index(['category_id', 'is_active']);
            $table->index(['is_active', 'stock_qty']);
        });

        // Add check constraint for stock_qty >= 0 on MySQL
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE products ADD CONSTRAINT check_products_stock_qty_non_negative CHECK (stock_qty >= 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
