<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'user_id' => $this->user_id,
            'cashier' => new UserResource($this->whenLoaded('user')),
            'status' => $this->status,
            'subtotal' => number_format((float) $this->subtotal, 2, '.', ''),
            'discount' => number_format((float) $this->discount, 2, '.', ''),
            'tax' => number_format((float) $this->tax, 2, '.', ''),
            'total' => number_format((float) $this->total, 2, '.', ''),
            'payment_method' => $this->payment_method,
            'amount_paid' => number_format((float) $this->amount_paid, 2, '.', ''),
            'change_due' => number_format((float) $this->change_due, 2, '.', ''),
            'notes' => $this->notes,
            'sold_at' => $this->sold_at?->toISOString(),
            'voided_at' => $this->voided_at?->toISOString(),
            'voided_by' => $this->voided_by,
            'voided_by_user' => new UserResource($this->whenLoaded('voidedByUser')),
            'void_reason' => $this->void_reason,
            'items' => SaleItemResource::collection($this->whenLoaded('items')),
            'invoice' => new InvoiceResource($this->whenLoaded('invoice')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
