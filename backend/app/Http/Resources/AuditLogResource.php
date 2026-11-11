<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user_name' => $this->user?->name ?? 'System',
            'user_email' => $this->user?->email,
            'action' => $this->action,
            'entity' => $this->entity,
            'entity_id' => $this->entity_id,
            'changes' => $this->changes,
            'ip' => $this->ip,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
