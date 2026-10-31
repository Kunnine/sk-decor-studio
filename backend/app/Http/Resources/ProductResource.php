<?php

namespace App\Http\Resources;

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
            'unit_id' => $this->unit_id,
            'unit' => new UnitResource($this->whenLoaded('unit')),
            'cost_price' => $this->when($canViewCost, number_format((float) $this->cost_price, 2, '.', '')),
            'sell_price' => number_format((float) $this->sell_price, 2, '.', ''),
            'stock_qty' => (int) $this->stock_qty,
            'reorder_level' => (int) $this->reorder_level,
            'image_url' => $this->image_url,
            'thumb_url' => $this->thumb_url,
            'is_active' => (bool) $this->is_active,
            'is_low_stock' => (bool) $this->isLowStock(),
            'low_stock_notified_at' => $this->low_stock_notified_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
