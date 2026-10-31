<?php

namespace App\Policies;

use App\Models\Unit;
use App\Models\User;

class UnitPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Unit $unit): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isManager();
    }

    public function update(User $user, Unit $unit): bool
    {
        return $user->isAdmin() || $user->isManager();
    }

    public function delete(User $user, Unit $unit): bool
    {
        return $user->isAdmin() || $user->isManager();
    }
}
