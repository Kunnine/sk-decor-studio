<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewCost = $user && ($user->isAdmin() || $user->isManager());

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'sku' => $this->sku,
            'name' => $this->name,
            'label' => $this->label(),
            'color' => $this->color,
            'size' => $this->size,
            'material' => $this->material,
            'style' => $this->style,
            'cost_price' => $this->when($canViewCost, number_format((float) $this->cost_price, 2, '.', '')),
            'avg_cost' => $this->when($canViewCost, number_format((float) ($this->avg_cost > 0 ? $this->avg_cost : $this->cost_price), 2, '.', '')),
            'sell_price' => number_format((float) $this->sell_price, 2, '.', ''),
            'stock_qty' => (int) $this->stock_qty,
            'reorder_level' => (int) $this->reorder_level,
            'is_active' => (bool) $this->is_active,
            'is_low_stock' => (bool) $this->isLowStock(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
