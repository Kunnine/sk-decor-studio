<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->enum('type', ['purchase', 'sale', 'adjustment', 'void'])->index();
            $table->integer('qty_change'); // signed int (+ for in, - for out)
            $table->decimal('unit_cost', 12, 2)->default(0.00);
            $table->nullableMorphs('reference'); // reference_type, reference_id
            $table->string('reason', 255)->nullable();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['product_id', 'created_at']);
            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
