<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use RuntimeException;

class StockMovement extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    public const TYPE_PURCHASE = 'purchase';

    public const TYPE_SALE = 'sale';

    public const TYPE_ADJUSTMENT = 'adjustment';

    public const TYPE_VOID = 'void';

    protected $fillable = [
        'product_id',
        'type',
        'qty_change',
        'unit_cost',
        'reference_type',
        'reference_id',
        'reason',
        'user_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'qty_change' => 'integer',
            'unit_cost' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function () {
            throw new RuntimeException('Stock movements are immutable and cannot be updated.');
        });

        static::deleting(function () {
            throw new RuntimeException('Stock movements are append-only and cannot be deleted.');
        });
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
