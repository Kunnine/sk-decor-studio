<?php

namespace App\Policies;

use App\Models\User;

class SettingPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // All authenticated users can view settings
    }

    public function update(User $user): bool
    {
        return $user->isAdmin();
    }
}
