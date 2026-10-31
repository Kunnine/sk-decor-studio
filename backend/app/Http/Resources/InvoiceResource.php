<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sale_id' => $this->sale_id,
            'number' => $this->number,
            'issued_at' => $this->issued_at?->toISOString(),
            'pdf_path' => $this->pdf_path,
            'pdf_url' => url("/api/v1/invoices/{$this->id}/pdf"),
        ];
    }
}
