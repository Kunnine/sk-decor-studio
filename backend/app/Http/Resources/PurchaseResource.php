<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ref_no' => $this->ref_no,
            'status' => $this->status,
            'total' => number_format((float) $this->total, 2, '.', ''),
            'notes' => $this->notes,
            'supplier_id' => $this->supplier_id,
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'created_by' => $this->created_by,
            'creator' => new UserResource($this->whenLoaded('creator')),
            'received_at' => $this->received_at?->toISOString(),
            'items' => PurchaseItemResource::collection($this->whenLoaded('items')),
            'items_count' => $this->whenCounted('items'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
