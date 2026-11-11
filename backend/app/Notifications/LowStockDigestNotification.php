<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

class LowStockDigestNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  Collection<int, Product>  $products
     */
    public function __construct(public Collection $products) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Daily Low Stock Digest - Action Required')
            ->greeting("Hello {$notifiable->name},")
            ->line('Here is your daily summary of products currently at or below their reorder level:')
            ->line("Total items requiring restock: {$this->products->count()}");

        foreach ($this->products->take(15) as $product) {
            $unit = $product->unit?->short_name ?? 'units';
            $deficit = max(0, $product->reorder_level - $product->stock_qty);
            $mail->line("• {$product->name} ({$product->sku}): Stock {$product->stock_qty} / Level {$product->reorder_level} {$unit} (Short by {$deficit})");
        }

        if ($this->products->count() > 15) {
            $remaining = $this->products->count() - 15;
            $mail->line("... and {$remaining} more products.");
        }

        return $mail
            ->action('Review All Low Stock Items', url('/products/low-stock'))
            ->line('Thank you for keeping your inventory healthy!');
    }
}
