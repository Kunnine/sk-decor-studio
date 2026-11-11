<?php

namespace App\Console\Commands;

use Exception;
use Illuminate\Console\Command;
use PDO;

class CreateDatabaseCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:create {name? : Optional database name}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create the database in MySQL (WAMP) if it does not already exist';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dbName = $this->argument('name') ?: config('database.connections.mysql.database');
        $host = config('database.connections.mysql.host', '127.0.0.1');
        $port = config('database.connections.mysql.port', '3306');
        $username = config('database.connections.mysql.username', 'root');
        $password = config('database.connections.mysql.password', '');

        $this->info("Connecting to MySQL (WAMP) at {$host}:{$port} as user '{$username}'...");

        try {
            $pdo = new PDO("mysql:host={$host};port={$port}", $username, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            $this->info("Ensuring database `{$dbName}` exists...");
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");

            $this->info("✓ Database `{$dbName}` is ready!");

            return Command::SUCCESS;
        } catch (Exception $e) {
            $this->error('Failed to connect to MySQL: '.$e->getMessage());
            $this->line('');
            $this->warn('Troubleshooting checklist for WampServer:');
            $this->line("1. Make sure WampServer is running (the 'W' tray icon is GREEN).");
            $this->line("2. Check that MySQL is listening on port {$port} (left-click Wamp icon -> MySQL -> Service administration).");
            $this->line('3. If using a custom password for MySQL root user, update DB_PASSWORD in backend/.env.');

            return Command::FAILURE;
        }
    }
}
