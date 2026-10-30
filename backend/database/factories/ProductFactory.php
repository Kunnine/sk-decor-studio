<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $cost = fake()->randomFloat(2, 5, 200);
        $sell = round($cost * fake()->randomFloat(2, 1.25, 2.0), 2);

        return [
            'sku' => strtoupper(fake()->bothify('PROD-????-####')),
            'name' => ucwords(fake()->words(3, true)),
            'description' => fake()->paragraph(),
            'category_id' => Category::factory(),
            'cost_price' => $cost,
            'sell_price' => $sell,
            'stock_qty' => fake()->numberBetween(15, 100),
            'reorder_level' => 10,
            'is_active' => true,
            'low_stock_notified_at' => null,
        ];
    }

    public function lowStock(): static
    {
        return $this->state(fn () => [
            'stock_qty' => 5,
            'reorder_level' => 10,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => [
            'is_active' => false,
        ]);
    }
}
