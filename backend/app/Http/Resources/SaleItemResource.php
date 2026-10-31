<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewCost = $user && ($user->isAdmin() || $user->isManager());

        return [
            'id' => $this->id,
            'sale_id' => $this->sale_id,
            'product_id' => $this->product_id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'qty' => (int) $this->qty,
            'unit_price' => number_format((float) $this->unit_price, 2, '.', ''),
            'unit_cost' => $this->when($canViewCost, number_format((float) $this->unit_cost, 2, '.', '')),
            'line_total' => number_format((float) $this->line_total, 2, '.', ''),
        ];
    }
}
