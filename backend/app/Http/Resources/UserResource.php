<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'is_active' => (bool) $this->is_active,
            'email_alerts_enabled' => $this->email_alerts_enabled,
            'digest_enabled' => $this->digest_enabled,
            'wants_low_stock_email' => $this->wantsLowStockEmail(),
            'wants_low_stock_digest' => $this->wantsLowStockDigest(),
            'permissions' => $this->getPermissions(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
