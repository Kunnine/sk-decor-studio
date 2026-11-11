<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewCost = $user && ($user->isAdmin() || $user->isManager());

        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'description' => $this->description,
            'category_id' => $this->category_id,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'parent_category' => $this->when(
                $this->relationLoaded('category') && $this->category?->relationLoaded('parent') && $this->category->parent !== null,
                fn () => new CategoryResource($this->category->parent)
            ),
            'unit_id' => $this->unit_id,
            'unit' => new UnitResource($this->whenLoaded('unit')),
            'supplier_id' => $this->supplier_id,
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'cost_price' => $this->when($canViewCost, number_format((float) $this->cost_price, 2, '.', '')),
            'avg_cost' => $this->when($canViewCost, number_format((float) ($this->avg_cost ?? $this->cost_price), 2, '.', '')),
            'sell_price' => number_format((float) $this->sell_price, 2, '.', ''),
            'stock_qty' => (int) $this->stock_qty,
            'reorder_level' => (int) $this->reorder_level,
            'color' => $this->color,
            'size' => $this->size,
            'material' => $this->material,
            'style' => $this->style,
            'has_variants' => (bool) $this->has_variants,
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants')),
            'image_url' => $this->image_url,
            'thumb_url' => $this->thumb_url,
            'is_active' => (bool) $this->is_active,
            'is_low_stock' => (bool) $this->isLowStock(),
            'low_stock_notified_at' => $this->low_stock_notified_at?->toISOString(),
            'last_purchase_date' => $this->last_purchase_date ? Carbon::parse($this->last_purchase_date)->toISOString() : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
