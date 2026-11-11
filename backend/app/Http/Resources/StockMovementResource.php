<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'product_variant_id' => $this->product_variant_id,
            'variant_label' => $this->variant_label,
            'variant' => new ProductVariantResource($this->whenLoaded('variant')),
            'type' => $this->type,
            'qty_change' => (int) $this->qty_change,
            'unit_cost' => number_format((float) $this->unit_cost, 2, '.', ''),
            'reference_type' => $this->reference_type ? class_basename($this->reference_type) : null,
            'reference_id' => $this->reference_id,
            'reference_label' => $this->getReferenceLabel(),
            'reason' => $this->reason,
            'user_id' => $this->user_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }

    private function getReferenceLabel(): ?string
    {
        if (! $this->reference_type || ! $this->relationLoaded('reference')) {
            return null;
        }

        $ref = $this->reference;
        if (! $ref) {
            return null;
        }

        if (isset($ref->ref_no)) {
            return (string) $ref->ref_no;
        }

        if (isset($ref->invoice_number)) {
            return (string) $ref->invoice_number;
        }

        return class_basename($this->reference_type).' #'.$this->reference_id;
    }
}
