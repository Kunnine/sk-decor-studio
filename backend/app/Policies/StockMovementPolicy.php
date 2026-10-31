<?php

namespace App\Policies;

use App\Models\StockMovement;
use App\Models\User;

class StockMovementPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function view(User $user, StockMovement $movement): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function adjust(User $user): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }
}
