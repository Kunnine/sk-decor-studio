<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $subtotal = (float) $this->unit_cost * (int) $this->qty;

        return [
            'id' => $this->id,
            'purchase_id' => $this->purchase_id,
            'product_id' => $this->product_id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'product_variant_id' => $this->product_variant_id,
            'variant_label' => $this->variant_label,
            'variant' => new ProductVariantResource($this->whenLoaded('variant')),
            'qty' => (int) $this->qty,
            'unit_cost' => number_format((float) $this->unit_cost, 2, '.', ''),
            'subtotal' => number_format($subtotal, 2, '.', ''),
        ];
    }
}
