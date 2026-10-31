<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'sku',
        'name',
        'description',
        'category_id',
        'unit_id',
        'cost_price',
        'avg_cost',
        'sell_price',
        'stock_qty',
        'reorder_level',
        'image_path',
        'thumb_path',
        'is_active',
        'low_stock_notified_at',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'avg_cost' => 'decimal:2',
        'sell_price' => 'decimal:2',
        'stock_qty' => 'integer',
        'reorder_level' => 'integer',
        'is_active' => 'boolean',
        'low_stock_notified_at' => 'datetime',
    ];

    protected $appends = [
        'image_url',
        'thumb_url',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function purchaseItems(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function isLowStock(): bool
    {
        return $this->stock_qty <= $this->reorder_level;
    }

    public function getImageUrlAttribute(): ?string
    {
        if ($this->image_path && Storage::disk('public')->exists($this->image_path)) {
            return Storage::disk('public')->url($this->image_path);
        }

        return null;
    }

    public function getThumbUrlAttribute(): ?string
    {
        if ($this->thumb_path && Storage::disk('public')->exists($this->thumb_path)) {
            return Storage::disk('public')->url($this->thumb_path);
        }

        return null;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('stock_qty', '<=', 'reorder_level');
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where(function (Builder $q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
                ->orWhere('sku', 'like', "%{$term}%")
                ->orWhere('description', 'like', "%{$term}%");
        });
    }
}
