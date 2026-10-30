<?php

namespace App\Policies;

use App\Models\Category;
use App\Models\User;

class CategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Category $category): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function update(User $user, Category $category): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }

    public function delete(User $user, Category $category): bool
    {
        return $user->hasRole([User::ROLE_ADMIN, User::ROLE_MANAGER]);
    }
}
