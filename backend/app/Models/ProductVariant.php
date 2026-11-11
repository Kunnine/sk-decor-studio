<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'product_id',
        'sku',
        'name',
        'color',
        'size',
        'material',
        'style',
        'cost_price',
        'avg_cost',
        'sell_price',
        'stock_qty',
        'reorder_level',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'avg_cost' => 'decimal:2',
            'sell_price' => 'decimal:2',
            'stock_qty' => 'integer',
            'reorder_level' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function isLowStock(): bool
    {
        return $this->stock_qty <= $this->reorder_level;
    }

    public function label(): string
    {
        if (! empty($this->name)) {
            return $this->name;
        }

        $parts = array_filter([
            $this->color,
            $this->size,
            $this->material,
            $this->style,
        ], fn ($value) => $value !== null && trim((string) $value) !== '');

        return ! empty($parts) ? implode(' · ', $parts) : $this->sku;
    }
}
