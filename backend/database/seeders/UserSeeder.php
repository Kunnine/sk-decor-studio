<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'Admin User',
                'email' => 'admin@inventory.test',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_ADMIN,
                'is_active' => true,
            ],
            [
                'name' => 'Manager User',
                'email' => 'manager@inventory.test',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_MANAGER,
                'is_active' => true,
            ],
            [
                'name' => 'Cashier User',
                'email' => 'cashier@inventory.test',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_CASHIER,
                'is_active' => true,
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }
    }
}
