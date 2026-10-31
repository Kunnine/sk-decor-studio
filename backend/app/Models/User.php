<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_ADMIN = 'admin';

    public const ROLE_MANAGER = 'manager';

    public const ROLE_CASHIER = 'cashier';

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isManager(): bool
    {
        return $this->role === self::ROLE_MANAGER;
    }

    public function isCashier(): bool
    {
        return $this->role === self::ROLE_CASHIER;
    }

    public function hasRole(array|string $roles): bool
    {
        $roles = (array) $roles;

        return in_array($this->role, $roles, true);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Get granular permissions list for role-aware UI.
     *
     * @return array<string>
     */
    public function getPermissions(): array
    {
        return match ($this->role) {
            self::ROLE_ADMIN => [
                'users.manage',
                'settings.manage',
                'categories.view',
                'categories.manage',
                'units.view',
                'units.manage',
                'products.view',
                'products.manage',
                'products.import',
                'products.cost_view',
                'suppliers.view',
                'suppliers.manage',
                'purchases.view',
                'purchases.manage',
                'stock_movements.view',
                'stock_adjustments.manage',
                'customers.view',
                'customers.manage',
                'sales.view',
                'sales.create',
                'sales.void',
                'invoices.view',
            ],
            self::ROLE_MANAGER => [
                'categories.view',
                'categories.manage',
                'units.view',
                'units.manage',
                'products.view',
                'products.manage',
                'products.import',
                'products.cost_view',
                'suppliers.view',
                'suppliers.manage',
                'purchases.view',
                'purchases.manage',
                'stock_movements.view',
                'stock_adjustments.manage',
                'customers.view',
                'customers.manage',
                'sales.view',
                'sales.create',
                'sales.void',
                'invoices.view',
            ],
            self::ROLE_CASHIER => [
                'categories.view',
                'units.view',
                'products.view',
                'customers.view',
                'customers.create',
                'sales.create',
                'sales.view_own',
                'invoices.view_own',
            ],
            default => [],
        };
    }
}
