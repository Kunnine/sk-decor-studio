<?php

namespace App\Policies;

use App\Models\Purchase;
use App\Models\User;

class PurchasePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function view(User $user, Purchase $purchase): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function create(User $user): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function update(User $user, Purchase $purchase): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function delete(User $user, Purchase $purchase): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function receive(User $user, Purchase $purchase): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }
}
