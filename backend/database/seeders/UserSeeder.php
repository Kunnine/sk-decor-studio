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
                'name' => 'System Admin',
                'email' => 'admin@inventory.test',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_ADMIN,
            ],
            [
                'name' => 'Inventory Manager',
                'email' => 'manager@inventory.test',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_MANAGER,
            ],
            [
                'name' => 'Store Cashier',
                'email' => 'cashier@inventory.test',
                'password' => Hash::make('Password123!'),
                'role' => User::ROLE_CASHIER,
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
