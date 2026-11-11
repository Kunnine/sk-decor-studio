<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Request;

class AuditLogService
{
    /**
     * Record an audit log entry.
     *
     * @param  string  $action  e.g. 'created', 'updated', 'voided', 'adjusted'
     * @param  string  $entity  e.g. 'Product', 'Setting', 'User', 'StockAdjustment', 'Sale'
     * @param  array<string, mixed>|null  $changes
     */
    public function log(
        string $action,
        string $entity,
        int|string|null $entityId = null,
        ?array $changes = null,
        ?User $user = null
    ): AuditLog {
        $currentUser = $user ?? auth()->user();

        return AuditLog::create([
            'user_id' => $currentUser?->id,
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId,
            'changes' => $changes,
            'ip' => Request::ip(),
            'created_at' => now(),
        ]);
    }
}
