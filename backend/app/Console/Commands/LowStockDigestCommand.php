<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\User;
use App\Notifications\LowStockDigestNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class LowStockDigestCommand extends Command
{
    protected $signature = 'stock:low-digest';

    protected $description = 'Send daily email digest of all products at or below reorder level';

    public function handle(): int
    {
        $this->info('Checking for low stock products for daily digest...');

        // Query active products at or below reorder level, sorted by deficit (how far below level they are)
        $lowProducts = Product::query()
            ->with(['unit', 'category'])
            ->active()
            ->lowStock()
            ->orderByRaw('(reorder_level - stock_qty) DESC')
            ->orderBy('name')
            ->get();

        if ($lowProducts->isEmpty()) {
            $this->info('No low-stock products found. Digest skipped.');

            return Command::SUCCESS;
        }

        $recipients = User::query()
            ->active()
            ->whereIn('role', [User::ROLE_ADMIN, User::ROLE_MANAGER])
            ->get()
            ->filter(fn (User $user) => $user->wantsLowStockDigest());

        if ($recipients->isEmpty()) {
            $this->warn('Low stock products exist, but no active managers or admins have digest enabled.');

            return Command::SUCCESS;
        }

        Notification::send($recipients, new LowStockDigestNotification($lowProducts));

        $this->info(sprintf(
            'Daily low stock digest for %d products sent to %d recipients.',
            $lowProducts->count(),
            $recipients->count()
        ));

        return Command::SUCCESS;
    }
}
