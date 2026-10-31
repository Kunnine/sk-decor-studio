<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'parent_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id')->orderBy('sort_order')->orderBy('name');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Recursively collect all descendant category IDs (children, grandchildren, etc.).
     *
     * @return array<int>
     */
    public function allDescendantIds(): array
    {
        $ids = [];
        $children = Category::where('parent_id', $this->id)->get();

        foreach ($children as $child) {
            $ids[] = $child->id;
            $ids = array_merge($ids, $child->allDescendantIds());
        }

        return $ids;
    }

    /**
     * Check if moving this category to $newParentId would create a circular hierarchy.
     */
    public function wouldCreateCycle(?int $newParentId): bool
    {
        if ($newParentId === null) {
            return false;
        }

        if ($newParentId === $this->id) {
            return true;
        }

        $descendantIds = $this->allDescendantIds();

        return in_array($newParentId, $descendantIds, true);
    }

    /**
     * Check if category can be safely deleted (must have 0 products and 0 active children).
     */
    public function hasProductsOrChildren(): bool
    {
        $hasProducts = $this->products()->exists();
        $hasChildren = $this->children()->exists();

        return $hasProducts || $hasChildren;
    }
}
