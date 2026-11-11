<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LowStockAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Product $product) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (method_exists($notifiable, 'wantsLowStockEmail') && $notifiable->wantsLowStockEmail()) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $unit = $this->product->unit?->short_name ?? 'units';

        return (new MailMessage)
            ->subject("Low Stock Alert: {$this->product->name} ({$this->product->sku})")
            ->greeting("Hello {$notifiable->name},")
            ->line("The product '{$this->product->name}' ({$this->product->sku}) has reached or fallen below its reorder level.")
            ->line("Current Stock: {$this->product->stock_qty} {$unit}")
            ->line("Reorder Level: {$this->product->reorder_level} {$unit}")
            ->action('View Low Stock Inventory', url('/products/low-stock'))
            ->line('Please create a purchase order to restock this product.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'low_stock_alert',
            'product_id' => $this->product->id,
            'sku' => $this->product->sku,
            'name' => $this->product->name,
            'stock_qty' => (int) $this->product->stock_qty,
            'reorder_level' => (int) $this->product->reorder_level,
            'deficit' => (int) max(0, $this->product->reorder_level - $this->product->stock_qty),
            'unit' => $this->product->unit?->short_name ?? '',
            'thumb_url' => $this->product->thumb_url,
            'message' => "Low stock: {$this->product->name} ({$this->product->sku}) is at {$this->product->stock_qty} (reorder level: {$this->product->reorder_level}).",
        ];
    }
}
