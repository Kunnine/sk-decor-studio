<?php

namespace App\Policies;

use App\Models\Supplier;
use App\Models\User;

class SupplierPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function view(User $user, Supplier $supplier): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function create(User $user): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function update(User $user, Supplier $supplier): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function delete(User $user, Supplier $supplier): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }
}
