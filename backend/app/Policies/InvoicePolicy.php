<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;

class InvoicePolicy
{
    public function view(User $user, Invoice $invoice): bool
    {
        if ($user->isAdmin() || $user->isManager()) {
            return true;
        }

        return $invoice->sale?->user_id === $user->id;
    }
}
