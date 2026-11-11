<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AnalyticsService
{
    public const CACHE_TTL = 300; // 5 minutes

    public function __construct(
        protected SettingService $settingService
    ) {}

    /**
     * Invalidate analytics cache across all endpoints and date ranges.
     */
    public function invalidateCache(): void
    {
        $version = (int) Cache::get('analytics_cache_version', 1);
        Cache::forever('analytics_cache_version', $version + 1);
    }

    /**
     * Get the cache key for an analytics query.
     */
    protected function getCacheKey(string $method, Carbon $start, Carbon $end, array $extra = []): string
    {
        $version = (int) Cache::get('analytics_cache_version', 1);
        $extraStr = ! empty($extra) ? '_'.md5(json_encode($extra)) : '';

        return "analytics_v{$version}_{$method}_{$start->toDateString()}_{$end->toDateString()}{$extraStr}";
    }

    /**
     * Parse date range inputs with defaults (default: last 30 days).
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public function parseDateRange(?string $from, ?string $to): array
    {
        $start = $from ? Carbon::parse($from)->startOfDay() : now()->subDays(29)->startOfDay();
        $end = $to ? Carbon::parse($to)->endOfDay() : now()->endOfDay();

        if ($start->greaterThan($end)) {
            $temp = $start;
            $start = $end->copy()->startOfDay();
            $end = $temp->copy()->endOfDay();
        }

        return [$start, $end];
    }

    /**
     * Calculate previous equal period.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public function getPreviousPeriod(Carbon $start, Carbon $end): array
    {
        $days = (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1;
        $prevEnd = $start->copy()->subSecond();
        $prevStart = $start->copy()->subDays($days)->startOfDay();

        return [$prevStart, $prevEnd];
    }

    /**
     * KPI Summary: revenue, orders, AOV, units sold, gross profit, margin %, low-stock count.
     */
    public function summary(Carbon $start, Carbon $end): array
    {
        $cacheKey = $this->getCacheKey('summary', $start, $end);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($start, $end) {
            [$prevStart, $prevEnd] = $this->getPreviousPeriod($start, $end);

            $currentMetrics = $this->calculatePeriodMetrics($start, $end);
            $previousMetrics = $this->calculatePeriodMetrics($prevStart, $prevEnd);

            $inventoryStats = DB::table('products')
                ->selectRaw('
                    COUNT(*) as total_products,
                    COALESCE(SUM(CASE WHEN stock_qty <= reorder_level THEN 1 ELSE 0 END), 0) as low_stock_count,
                    COALESCE(SUM(stock_qty * CASE WHEN avg_cost > 0 THEN avg_cost ELSE cost_price END), 0) as total_stock_value
                ')
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->first();

            $totalCategories = Category::count();
            $totalProducts = (int) ($inventoryStats->total_products ?? 0);
            $lowStockCount = (int) ($inventoryStats->low_stock_count ?? 0);
            $totalStockValue = round((float) ($inventoryStats->total_stock_value ?? 0.00), 2);

            return [
                'revenue' => $this->formatMetricWithChange($currentMetrics['revenue'], $previousMetrics['revenue']),
                'orders' => $this->formatMetricWithChange($currentMetrics['orders'], $previousMetrics['orders']),
                'average_order_value' => $this->formatMetricWithChange($currentMetrics['aov'], $previousMetrics['aov']),
                'units_sold' => $this->formatMetricWithChange($currentMetrics['units_sold'], $previousMetrics['units_sold']),
                'gross_profit' => $this->formatMetricWithChange($currentMetrics['gross_profit'], $previousMetrics['gross_profit']),
                'gross_margin_pct' => $this->formatMetricWithChange($currentMetrics['margin_pct'], $previousMetrics['margin_pct']),
                'low_stock_count' => [
                    'current' => $lowStockCount,
                    'previous' => $lowStockCount,
                    'change' => 0,
                    'change_pct' => 0.00,
                ],
                'total_products' => $totalProducts,
                'total_categories' => $totalCategories,
                'total_stock_value' => $totalStockValue,
                'period' => [
                    'from' => $start->toDateString(),
                    'to' => $end->toDateString(),
                    'prev_from' => $prevStart->toDateString(),
                    'prev_to' => $prevEnd->toDateString(),
                ],
            ];
        });
    }

    /**
     * Compute raw metrics for a given date period using SQL aggregation.
     */
    protected function calculatePeriodMetrics(Carbon $start, Carbon $end): array
    {
        // 1. Sales level aggregates (orders and revenue)
        $salesRow = DB::table('sales')
            ->selectRaw('COUNT(*) as orders_count, COALESCE(SUM(total), 0) as total_revenue')
            ->where('status', Sale::STATUS_COMPLETED)
            ->whereBetween('sold_at', [$start, $end])
            ->whereNull('deleted_at')
            ->first();

        $orders = (int) ($salesRow->orders_count ?? 0);
        $revenue = round((float) ($salesRow->total_revenue ?? 0.00), 2);

        // 2. Line items level aggregates (units sold and gross profit)
        $itemsRow = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->selectRaw('
                COALESCE(SUM(sale_items.qty), 0) as units_sold,
                COALESCE(SUM(sale_items.line_total - (sale_items.unit_cost * sale_items.qty)), 0) as gross_profit
            ')
            ->where('sales.status', Sale::STATUS_COMPLETED)
            ->whereBetween('sales.sold_at', [$start, $end])
            ->whereNull('sales.deleted_at')
            ->first();

        $unitsSold = (int) ($itemsRow->units_sold ?? 0);
        $grossProfit = round((float) ($itemsRow->gross_profit ?? 0.00), 2);

        $aov = $orders > 0 ? round($revenue / $orders, 2) : 0.00;
        $marginPct = $revenue > 0 ? round(($grossProfit / $revenue) * 100, 2) : 0.00;

        return [
            'orders' => $orders,
            'revenue' => $revenue,
            'units_sold' => $unitsSold,
            'gross_profit' => $grossProfit,
            'aov' => $aov,
            'margin_pct' => $marginPct,
        ];
    }

    protected function formatMetricWithChange(float|int $current, float|int $previous): array
    {
        $change = round($current - $previous, 2);
        $changePct = 0.00;

        if ($previous != 0) {
            $changePct = round((($current - $previous) / abs($previous)) * 100, 2);
        } elseif ($current > 0) {
            $changePct = 100.00;
        }

        return [
            'current' => $current,
            'previous' => $previous,
            'change' => $change,
            'change_pct' => $changePct,
        ];
    }

    /**
     * Sales trend: revenue, orders, and profit per day with missing days zero-filled.
     */
    public function salesTrend(Carbon $start, Carbon $end): array
    {
        $cacheKey = $this->getCacheKey('sales_trend', $start, $end);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($start, $end) {
            // Aggregate daily revenue & orders
            $salesDaily = DB::table('sales')
                ->selectRaw('DATE(sold_at) as day_date, COUNT(*) as orders_count, COALESCE(SUM(total), 0) as daily_revenue')
                ->where('status', Sale::STATUS_COMPLETED)
                ->whereBetween('sold_at', [$start, $end])
                ->whereNull('deleted_at')
                ->groupBy(DB::raw('DATE(sold_at)'))
                ->get()
                ->keyBy('day_date');

            // Aggregate daily gross profit
            $profitDaily = DB::table('sale_items')
                ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->selectRaw('DATE(sales.sold_at) as day_date, COALESCE(SUM(sale_items.line_total - (sale_items.unit_cost * sale_items.qty)), 0) as daily_profit')
                ->where('sales.status', Sale::STATUS_COMPLETED)
                ->whereBetween('sales.sold_at', [$start, $end])
                ->whereNull('sales.deleted_at')
                ->groupBy(DB::raw('DATE(sales.sold_at)'))
                ->get()
                ->keyBy('day_date');

            // Zero-fill all days in the range
            $trend = [];
            $cursor = $start->copy()->startOfDay();
            $endLimit = $end->copy()->startOfDay();

            while ($cursor->lessThanOrEqualTo($endLimit)) {
                $dateStr = $cursor->toDateString();
                $saleInfo = $salesDaily->get($dateStr);
                $profitInfo = $profitDaily->get($dateStr);

                $trend[] = [
                    'date' => $dateStr,
                    'revenue' => round((float) ($saleInfo->daily_revenue ?? 0.00), 2),
                    'orders' => (int) ($saleInfo->orders_count ?? 0),
                    'profit' => round((float) ($profitInfo->daily_profit ?? 0.00), 2),
                ];

                $cursor->addDay();
            }

            return $trend;
        });
    }

    /**
     * Top 10 products by quantity or revenue.
     */
    public function topProducts(Carbon $start, Carbon $end, string $by = 'qty', int $limit = 10): array
    {
        $by = in_array(strtolower($by), ['revenue', 'amount'], true) ? 'revenue' : 'qty';
        $cacheKey = $this->getCacheKey('top_products', $start, $end, ['by' => $by, 'limit' => $limit]);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($start, $end, $by, $limit) {
            $orderColumn = $by === 'revenue' ? 'total_revenue' : 'total_qty';

            $rows = DB::table('sale_items')
                ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->join('products', 'products.id', '=', 'sale_items.product_id')
                ->selectRaw('
                    products.id,
                    products.sku,
                    products.name,
                    products.thumb_path,
                    COALESCE(SUM(sale_items.qty), 0) as total_qty,
                    COALESCE(SUM(sale_items.line_total), 0) as total_revenue
                ')
                ->where('sales.status', Sale::STATUS_COMPLETED)
                ->whereBetween('sales.sold_at', [$start, $end])
                ->whereNull('sales.deleted_at')
                ->groupBy('products.id', 'products.sku', 'products.name', 'products.thumb_path')
                ->orderByDesc($orderColumn)
                ->limit($limit)
                ->get();

            return $rows->map(function ($row) {
                $thumbUrl = null;
                if (! empty($row->thumb_path) && Storage::disk('public')->exists($row->thumb_path)) {
                    $thumbUrl = Storage::disk('public')->url($row->thumb_path);
                }

                return [
                    'id' => (int) $row->id,
                    'sku' => $row->sku,
                    'name' => $row->name,
                    'thumb_url' => $thumbUrl,
                    'quantity' => (int) $row->total_qty,
                    'revenue' => round((float) $row->total_revenue, 2),
                ];
            })->toArray();
        });
    }

    /**
     * Sales revenue rolled up to top-level root categories.
     */
    public function salesByCategory(Carbon $start, Carbon $end): array
    {
        $cacheKey = $this->getCacheKey('sales_by_category', $start, $end);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($start, $end) {
            // 1. Build lookup from category ID -> root Category
            $categories = Category::all()->keyBy('id');
            $categoryToRoot = [];

            foreach ($categories as $cat) {
                $curr = $cat;
                while ($curr->parent_id !== null && $categories->has($curr->parent_id)) {
                    $curr = $categories->get($curr->parent_id);
                }
                $categoryToRoot[$cat->id] = [
                    'id' => $curr->id,
                    'name' => $curr->name,
                ];
            }

            // 2. Aggregate sales revenue by product category_id
            $categorySales = DB::table('sale_items')
                ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                ->join('products', 'products.id', '=', 'sale_items.product_id')
                ->selectRaw('products.category_id, COALESCE(SUM(sale_items.line_total), 0) as rev, COALESCE(SUM(sale_items.qty), 0) as units')
                ->where('sales.status', Sale::STATUS_COMPLETED)
                ->whereBetween('sales.sold_at', [$start, $end])
                ->whereNull('sales.deleted_at')
                ->groupBy('products.category_id')
                ->get();

            // 3. Roll up into root categories
            $rolledUp = [];
            $totalRevenue = 0.00;

            foreach ($categorySales as $row) {
                $rootInfo = $categoryToRoot[$row->category_id] ?? ['id' => 0, 'name' => 'Uncategorized'];
                $rootName = $rootInfo['name'];
                $rev = round((float) $row->rev, 2);
                $units = (int) $row->units;

                if (! isset($rolledUp[$rootName])) {
                    $rolledUp[$rootName] = [
                        'category_id' => $rootInfo['id'],
                        'category_name' => $rootName,
                        'revenue' => 0.00,
                        'units_sold' => 0,
                    ];
                }

                $rolledUp[$rootName]['revenue'] = round($rolledUp[$rootName]['revenue'] + $rev, 2);
                $rolledUp[$rootName]['units_sold'] += $units;
                $totalRevenue += $rev;
            }

            // 4. Calculate percentage and sort descending by revenue
            $results = array_values($rolledUp);
            usort($results, fn ($a, $b) => $b['revenue'] <=> $a['revenue']);

            return array_map(function ($item) use ($totalRevenue) {
                $item['percentage'] = $totalRevenue > 0 ? round(($item['revenue'] / $totalRevenue) * 100, 2) : 0.00;

                return $item;
            }, $results);
        });
    }

    /**
     * Inventory valuation: total, per category, plus slow movers.
     */
    public function valuation(): array
    {
        $cacheKey = $this->getCacheKey('valuation', now()->startOfDay(), now()->endOfDay());

        return Cache::remember($cacheKey, self::CACHE_TTL, function () {
            // 1. Overall valuation summary
            $totals = DB::table('products')
                ->selectRaw('
                    COUNT(*) as total_products,
                    COALESCE(SUM(stock_qty), 0) as total_units,
                    COALESCE(SUM(stock_qty * CASE WHEN avg_cost > 0 THEN avg_cost ELSE cost_price END), 0) as total_valuation
                ')
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->first();

            // 2. Roll up valuation per root category
            $categories = Category::all()->keyBy('id');
            $categoryToRoot = [];
            foreach ($categories as $cat) {
                $curr = $cat;
                while ($curr->parent_id !== null && $categories->has($curr->parent_id)) {
                    $curr = $categories->get($curr->parent_id);
                }
                $categoryToRoot[$cat->id] = $curr->name;
            }

            $productCategoryValuations = DB::table('products')
                ->selectRaw('
                    category_id,
                    COUNT(*) as products_count,
                    COALESCE(SUM(stock_qty), 0) as total_stock,
                    COALESCE(SUM(stock_qty * CASE WHEN avg_cost > 0 THEN avg_cost ELSE cost_price END), 0) as category_value
                ')
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->groupBy('category_id')
                ->get();

            $byCategory = [];
            $totalValuation = round((float) ($totals->total_valuation ?? 0.00), 2);

            foreach ($productCategoryValuations as $row) {
                $rootName = $categoryToRoot[$row->category_id] ?? 'Uncategorized';
                if (! isset($byCategory[$rootName])) {
                    $byCategory[$rootName] = [
                        'category' => $rootName,
                        'products_count' => 0,
                        'total_stock' => 0,
                        'valuation' => 0.00,
                    ];
                }

                $byCategory[$rootName]['products_count'] += (int) $row->products_count;
                $byCategory[$rootName]['total_stock'] += (int) $row->total_stock;
                $byCategory[$rootName]['valuation'] = round($byCategory[$rootName]['valuation'] + (float) $row->category_value, 2);
            }

            $categoryBreakdown = array_values($byCategory);
            usort($categoryBreakdown, fn ($a, $b) => $b['valuation'] <=> $a['valuation']);

            // 3. Slow movers (in stock, no completed sale in X days from Settings)
            $slowMovingDays = (int) $this->settingService->get('slow_moving_days', 60);
            $thresholdDate = now()->subDays($slowMovingDays)->startOfDay();

            $slowMovers = DB::table('products')
                ->leftJoin('units', 'units.id', '=', 'products.unit_id')
                ->selectRaw('
                    products.id,
                    products.sku,
                    products.name,
                    products.stock_qty,
                    CASE WHEN products.avg_cost > 0 THEN products.avg_cost ELSE products.cost_price END as unit_cost,
                    (products.stock_qty * CASE WHEN products.avg_cost > 0 THEN products.avg_cost ELSE products.cost_price END) as total_value,
                    products.thumb_path,
                    units.short_name as unit,
                    (
                        SELECT MAX(sales.sold_at)
                        FROM sale_items
                        JOIN sales ON sales.id = sale_items.sale_id
                        WHERE sale_items.product_id = products.id
                          AND sales.status = ?
                          AND sales.deleted_at IS NULL
                    ) as last_sold_at
                ', [Sale::STATUS_COMPLETED])
                ->where('products.is_active', true)
                ->whereNull('products.deleted_at')
                ->where('products.stock_qty', '>', 0)
                ->whereNotExists(function ($query) use ($thresholdDate) {
                    $query->select(DB::raw(1))
                        ->from('sale_items')
                        ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                        ->whereColumn('sale_items.product_id', 'products.id')
                        ->where('sales.status', Sale::STATUS_COMPLETED)
                        ->whereNull('sales.deleted_at')
                        ->where('sales.sold_at', '>=', $thresholdDate);
                })
                ->orderByDesc('total_value')
                ->limit(50)
                ->get()
                ->map(function ($row) {
                    $thumbUrl = null;
                    if (! empty($row->thumb_path) && Storage::disk('public')->exists($row->thumb_path)) {
                        $thumbUrl = Storage::disk('public')->url($row->thumb_path);
                    }

                    return [
                        'id' => (int) $row->id,
                        'sku' => $row->sku,
                        'name' => $row->name,
                        'stock_qty' => (int) $row->stock_qty,
                        'unit' => $row->unit ?? 'pcs',
                        'unit_cost' => round((float) $row->unit_cost, 2),
                        'total_value' => round((float) $row->total_value, 2),
                        'thumb_url' => $thumbUrl,
                        'last_sold_at' => $row->last_sold_at ? Carbon::parse($row->last_sold_at)->toISOString() : null,
                    ];
                })
                ->toArray();

            return [
                'total_valuation' => $totalValuation,
                'total_units' => (int) ($totals->total_units ?? 0),
                'total_products' => (int) ($totals->total_products ?? 0),
                'by_category' => $categoryBreakdown,
                'slow_movers' => $slowMovers,
                'slow_moving_days' => $slowMovingDays,
            ];
        });
    }

    /**
     * Sales breakdown by payment method.
     */
    public function paymentMethods(Carbon $start, Carbon $end): array
    {
        $cacheKey = $this->getCacheKey('payment_methods', $start, $end);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($start, $end) {
            $rows = DB::table('sales')
                ->selectRaw('payment_method, COUNT(*) as orders_count, COALESCE(SUM(total), 0) as total_revenue')
                ->where('status', Sale::STATUS_COMPLETED)
                ->whereBetween('sold_at', [$start, $end])
                ->whereNull('deleted_at')
                ->groupBy('payment_method')
                ->orderByDesc('total_revenue')
                ->get();

            $totalRevenue = $rows->sum('total_revenue');

            return $rows->map(function ($row) use ($totalRevenue) {
                $rev = round((float) $row->total_revenue, 2);

                return [
                    'payment_method' => $row->payment_method,
                    'orders_count' => (int) $row->orders_count,
                    'revenue' => $rev,
                    'percentage' => $totalRevenue > 0 ? round(($rev / $totalRevenue) * 100, 2) : 0.00,
                ];
            })->toArray();
        });
    }

    /**
     * Sales and revenue per cashier.
     */
    public function cashiers(Carbon $start, Carbon $end): array
    {
        $cacheKey = $this->getCacheKey('cashiers', $start, $end);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($start, $end) {
            $rows = DB::table('sales')
                ->join('users', 'users.id', '=', 'sales.user_id')
                ->selectRaw('sales.user_id, users.name as cashier_name, COUNT(sales.id) as orders_count, COALESCE(SUM(sales.total), 0) as total_revenue')
                ->where('sales.status', Sale::STATUS_COMPLETED)
                ->whereBetween('sales.sold_at', [$start, $end])
                ->whereNull('sales.deleted_at')
                ->groupBy('sales.user_id', 'users.name')
                ->orderByDesc('total_revenue')
                ->get();

            $totalRevenue = $rows->sum('total_revenue');

            return $rows->map(function ($row) use ($totalRevenue) {
                $rev = round((float) $row->total_revenue, 2);

                return [
                    'user_id' => (int) $row->user_id,
                    'cashier_name' => $row->cashier_name,
                    'orders_count' => (int) $row->orders_count,
                    'revenue' => $rev,
                    'percentage' => $totalRevenue > 0 ? round(($rev / $totalRevenue) * 100, 2) : 0.00,
                ];
            })->toArray();
        });
    }
}
