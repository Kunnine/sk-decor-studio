<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\Supplier;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportService
{
    public function __construct(
        protected SettingService $settingService
    ) {}

    /**
     * Parse date range inputs.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public function parseRange(?string $from, ?string $to): array
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
     * Format money using Settings.
     */
    public function formatCurrency(float $amount): string
    {
        $symbol = $this->settingService->get('currency_symbol', '$');

        return sprintf('%s%s', $symbol, number_format($amount, 2));
    }

    /**
     * Format date using Settings.
     */
    public function formatDate(?Carbon $date): string
    {
        if (! $date) {
            return '-';
        }

        $format = $this->settingService->get('date_format', 'YYYY-MM-DD');
        $phpFormat = str_replace(
            ['YYYY', 'MM', 'DD'],
            ['Y', 'm', 'd'],
            $format
        );

        return $date->format($phpFormat);
    }

    /**
     * 1. Sales Summary Report Data
     */
    public function getSalesSummaryData(Carbon $start, Carbon $end, Request $request): array
    {
        $query = Sale::query()
            ->with(['invoice', 'customer', 'user'])
            ->withCount('items')
            ->where('status', Sale::STATUS_COMPLETED)
            ->whereBetween('sold_at', [$start, $end])
            ->whereNull('deleted_at');

        $sortField = $request->input('sort', 'sold_at');
        $sortDir = strtolower($request->input('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSorts = ['sold_at', 'total', 'subtotal', 'discount', 'tax'];
        if (in_array($sortField, $allowedSorts, true)) {
            $query->orderBy($sortField, $sortDir);
        } else {
            $query->orderBy('sold_at', 'desc');
        }

        // Compute totals across the entire period
        $totalsRow = DB::table('sales')
            ->selectRaw('
                COUNT(*) as total_orders,
                COALESCE(SUM(subtotal), 0) as total_subtotal,
                COALESCE(SUM(discount), 0) as total_discount,
                COALESCE(SUM(tax), 0) as total_tax,
                COALESCE(SUM(total), 0) as total_revenue
            ')
            ->where('status', Sale::STATUS_COMPLETED)
            ->whereBetween('sold_at', [$start, $end])
            ->whereNull('deleted_at')
            ->first();

        $perPage = $request->integer('per_page', 20);
        $paginated = $query->paginate($perPage);

        return [
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'totals' => [
                'orders' => (int) ($totalsRow->total_orders ?? 0),
                'subtotal' => round((float) ($totalsRow->total_subtotal ?? 0), 2),
                'discount' => round((float) ($totalsRow->total_discount ?? 0), 2),
                'tax' => round((float) ($totalsRow->total_tax ?? 0), 2),
                'total' => round((float) ($totalsRow->total_revenue ?? 0), 2),
            ],
        ];
    }

    /**
     * 2. Sales By Product Report Data
     */
    public function getSalesByProductData(Carbon $start, Carbon $end, Request $request): array
    {
        $rows = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->selectRaw('
                products.id,
                products.sku,
                products.name,
                categories.name as category_name,
                COALESCE(SUM(sale_items.qty), 0) as units_sold,
                COALESCE(SUM(sale_items.line_total), 0) as revenue,
                COALESCE(SUM(sale_items.unit_cost * sale_items.qty), 0) as cogs,
                COALESCE(SUM(sale_items.line_total - (sale_items.unit_cost * sale_items.qty)), 0) as profit
            ')
            ->where('sales.status', Sale::STATUS_COMPLETED)
            ->whereBetween('sales.sold_at', [$start, $end])
            ->whereNull('sales.deleted_at')
            ->groupBy('products.id', 'products.sku', 'products.name', 'categories.name')
            ->orderByDesc('revenue')
            ->get();

        $totalUnits = 0;
        $totalRevenue = 0.00;
        $totalCogs = 0.00;
        $totalProfit = 0.00;

        $items = $rows->map(function ($row) use (&$totalUnits, &$totalRevenue, &$totalCogs, &$totalProfit) {
            $rev = round((float) $row->revenue, 2);
            $cogs = round((float) $row->cogs, 2);
            $profit = round((float) $row->profit, 2);
            $units = (int) $row->units_sold;
            $margin = $rev > 0 ? round(($profit / $rev) * 100, 2) : 0.00;

            $totalUnits += $units;
            $totalRevenue += $rev;
            $totalCogs += $cogs;
            $totalProfit += $profit;

            return [
                'id' => (int) $row->id,
                'sku' => $row->sku,
                'name' => $row->name,
                'category' => $row->category_name ?? 'Uncategorized',
                'units_sold' => $units,
                'revenue' => $rev,
                'cogs' => $cogs,
                'profit' => $profit,
                'margin_pct' => $margin,
            ];
        });

        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 20);
        $sliced = $items->forPage($page, $perPage)->values();

        return [
            'data' => $sliced,
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) ceil($items->count() / max(1, $perPage)),
                'per_page' => $perPage,
                'total' => $items->count(),
            ],
            'totals' => [
                'units_sold' => $totalUnits,
                'revenue' => round($totalRevenue, 2),
                'cogs' => round($totalCogs, 2),
                'profit' => round($totalProfit, 2),
                'margin_pct' => $totalRevenue > 0 ? round(($totalProfit / $totalRevenue) * 100, 2) : 0.00,
            ],
        ];
    }

    /**
     * 3. Sales By Category Report Data
     */
    public function getSalesByCategoryData(Carbon $start, Carbon $end, Request $request): array
    {
        $categories = Category::all()->keyBy('id');
        $categoryToRoot = [];

        foreach ($categories as $cat) {
            $curr = $cat;
            while ($curr->parent_id !== null && $categories->has($curr->parent_id)) {
                $curr = $categories->get($curr->parent_id);
            }
            $categoryToRoot[$cat->id] = $curr->name;
        }

        $sales = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->selectRaw('products.category_id, COALESCE(SUM(sale_items.line_total), 0) as rev, COALESCE(SUM(sale_items.qty), 0) as units')
            ->where('sales.status', Sale::STATUS_COMPLETED)
            ->whereBetween('sales.sold_at', [$start, $end])
            ->whereNull('sales.deleted_at')
            ->groupBy('products.category_id')
            ->get();

        $rolledUp = [];
        $totalRevenue = 0.00;
        $totalUnits = 0;

        foreach ($sales as $row) {
            $rootName = $categoryToRoot[$row->category_id] ?? 'Uncategorized';
            $rev = round((float) $row->rev, 2);
            $units = (int) $row->units;

            if (! isset($rolledUp[$rootName])) {
                $rolledUp[$rootName] = [
                    'category' => $rootName,
                    'units_sold' => 0,
                    'revenue' => 0.00,
                ];
            }

            $rolledUp[$rootName]['revenue'] = round($rolledUp[$rootName]['revenue'] + $rev, 2);
            $rolledUp[$rootName]['units_sold'] += $units;
            $totalRevenue += $rev;
            $totalUnits += $units;
        }

        $list = collect(array_values($rolledUp))->map(function ($item) use ($totalRevenue) {
            $item['percentage'] = $totalRevenue > 0 ? round(($item['revenue'] / $totalRevenue) * 100, 2) : 0.00;

            return $item;
        })->sortByDesc('revenue')->values();

        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 20);

        return [
            'data' => $list->forPage($page, $perPage)->values(),
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) ceil($list->count() / max(1, $perPage)),
                'per_page' => $perPage,
                'total' => $list->count(),
            ],
            'totals' => [
                'units_sold' => $totalUnits,
                'revenue' => round($totalRevenue, 2),
                'percentage' => 100.00,
            ],
        ];
    }

    /**
     * 4. Purchases By Supplier Report Data
     */
    public function getPurchasesBySupplierData(Carbon $start, Carbon $end, Request $request): array
    {
        $rows = DB::table('purchases')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->leftJoin('purchase_items', 'purchase_items.purchase_id', '=', 'purchases.id')
            ->selectRaw('
                suppliers.id as supplier_id,
                COALESCE(suppliers.name, "No Supplier") as supplier_name,
                COUNT(DISTINCT purchases.id) as purchases_count,
                COALESCE(SUM(purchase_items.qty), 0) as items_purchased,
                COALESCE(SUM(purchases.total), 0) as total_spent,
                SUM(CASE WHEN purchases.status = "received" THEN 1 ELSE 0 END) as received_count,
                SUM(CASE WHEN purchases.status = "draft" THEN 1 ELSE 0 END) as draft_count
            ')
            ->whereBetween('purchases.created_at', [$start, $end])
            ->whereNull('purchases.deleted_at')
            ->groupBy('suppliers.id', 'suppliers.name')
            ->orderByDesc('total_spent')
            ->get();

        $totalPurchases = 0;
        $totalItems = 0;
        $totalSpent = 0.00;

        $items = $rows->map(function ($row) use (&$totalPurchases, &$totalItems, &$totalSpent) {
            $pCount = (int) $row->purchases_count;
            $itemsCount = (int) $row->items_purchased;
            $spent = round((float) $row->total_spent, 2);

            $totalPurchases += $pCount;
            $totalItems += $itemsCount;
            $totalSpent += $spent;

            return [
                'supplier_id' => $row->supplier_id,
                'supplier_name' => $row->supplier_name,
                'purchases_count' => $pCount,
                'items_purchased' => $itemsCount,
                'total_spent' => $spent,
                'received_count' => (int) $row->received_count,
                'draft_count' => (int) $row->draft_count,
            ];
        });

        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 20);

        return [
            'data' => $items->forPage($page, $perPage)->values(),
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) ceil($items->count() / max(1, $perPage)),
                'per_page' => $perPage,
                'total' => $items->count(),
            ],
            'totals' => [
                'purchases_count' => $totalPurchases,
                'items_purchased' => $totalItems,
                'total_spent' => round($totalSpent, 2),
            ],
        ];
    }

    /**
     * 5. Stock Movements Report Data
     */
    public function getStockMovementsData(Carbon $start, Carbon $end, Request $request): array
    {
        $query = StockMovement::query()
            ->with(['product.unit', 'user'])
            ->whereBetween('created_at', [$start, $end]);

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->integer('product_id'));
        }

        $sortField = $request->input('sort', 'created_at');
        $sortDir = strtolower($request->input('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sortField, $sortDir);

        $totalsRow = DB::table('stock_movements')
            ->selectRaw('
                COUNT(*) as movements_count,
                COALESCE(SUM(qty_change), 0) as net_qty,
                COALESCE(SUM(qty_change * unit_cost), 0) as net_value
            ')
            ->whereBetween('created_at', [$start, $end])
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->input('type')))
            ->when($request->filled('product_id'), fn ($q) => $q->where('product_id', $request->integer('product_id')))
            ->first();

        $perPage = $request->integer('per_page', 25);
        $paginated = $query->paginate($perPage);

        return [
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'totals' => [
                'movements_count' => (int) ($totalsRow->movements_count ?? 0),
                'net_qty' => (int) ($totalsRow->net_qty ?? 0),
                'net_value' => round((float) ($totalsRow->net_value ?? 0), 2),
            ],
        ];
    }

    /**
     * 6. Inventory Valuation Report Data
     */
    public function getInventoryValuationData(Request $request): array
    {
        $query = Product::query()
            ->with(['category', 'unit'])
            ->where('is_active', true);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        $products = $query->orderBy('name')->get();

        $totalUnits = 0;
        $totalCostValuation = 0.00;
        $totalRetailValuation = 0.00;

        $items = $products->map(function (Product $p) use (&$totalUnits, &$totalCostValuation, &$totalRetailValuation) {
            $stock = (int) $p->stock_qty;
            $unitCost = (float) ($p->avg_cost > 0 ? $p->avg_cost : $p->cost_price);
            $sellPrice = (float) $p->sell_price;
            $costVal = round($stock * $unitCost, 2);
            $retailVal = round($stock * $sellPrice, 2);

            $totalUnits += $stock;
            $totalCostValuation += $costVal;
            $totalRetailValuation += $retailVal;

            return [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'category' => $p->category?->name ?? 'Uncategorized',
                'unit' => $p->unit?->short_name ?? 'pcs',
                'stock_qty' => $stock,
                'avg_cost' => round($unitCost, 2),
                'sell_price' => round($sellPrice, 2),
                'inventory_value' => $costVal,
                'retail_value' => $retailVal,
                'potential_profit' => round($retailVal - $costVal, 2),
            ];
        });

        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 25);

        return [
            'data' => $items->forPage($page, $perPage)->values(),
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) ceil($items->count() / max(1, $perPage)),
                'per_page' => $perPage,
                'total' => $items->count(),
            ],
            'totals' => [
                'products_count' => $items->count(),
                'total_units' => $totalUnits,
                'total_inventory_value' => round($totalCostValuation, 2),
                'total_retail_value' => round($totalRetailValuation, 2),
                'total_potential_profit' => round($totalRetailValuation - $totalCostValuation, 2),
            ],
        ];
    }

    /**
     * 7. Low Stock Report Data
     */
    public function getLowStockData(Request $request): array
    {
        $products = Product::query()
            ->with(['category', 'unit'])
            ->select('products.*')
            ->selectSub(function ($query) {
                $query->selectRaw('MAX(purchases.received_at)')
                    ->from('purchases')
                    ->join('purchase_items', 'purchase_items.purchase_id', '=', 'purchases.id')
                    ->whereColumn('purchase_items.product_id', 'products.id')
                    ->where('purchases.status', 'received');
            }, 'last_purchase_date')
            ->active()
            ->lowStock()
            ->orderByRaw('(reorder_level - stock_qty) DESC')
            ->get();

        $totalDeficit = 0;
        $totalEstimatedRestockCost = 0.00;

        $items = $products->map(function (Product $p) use (&$totalDeficit, &$totalEstimatedRestockCost) {
            $stock = (int) $p->stock_qty;
            $level = (int) $p->reorder_level;
            $deficit = max(0, $level - $stock);
            $suggestedQty = max(1, ($level * 2) - $stock);
            $unitCost = (float) ($p->avg_cost > 0 ? $p->avg_cost : $p->cost_price);
            $restockCost = round($suggestedQty * $unitCost, 2);

            $totalDeficit += $deficit;
            $totalEstimatedRestockCost += $restockCost;

            return [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'thumb_url' => $p->thumb_url,
                'category' => $p->category?->name ?? 'Uncategorized',
                'unit' => $p->unit?->short_name ?? 'pcs',
                'stock_qty' => $stock,
                'reorder_level' => $level,
                'deficit' => $deficit,
                'suggested_reorder_qty' => $suggestedQty,
                'unit_cost' => round($unitCost, 2),
                'estimated_restock_cost' => $restockCost,
                'last_purchase_date' => $p->last_purchase_date ? Carbon::parse($p->last_purchase_date)->toISOString() : null,
            ];
        });

        $page = $request->integer('page', 1);
        $perPage = $request->integer('per_page', 25);

        return [
            'data' => $items->forPage($page, $perPage)->values(),
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) ceil($items->count() / max(1, $perPage)),
                'per_page' => $perPage,
                'total' => $items->count(),
            ],
            'totals' => [
                'products_count' => $items->count(),
                'total_deficit' => $totalDeficit,
                'total_restock_cost' => round($totalEstimatedRestockCost, 2),
            ],
        ];
    }

    /**
     * Stream a CSV file to avoid exhausting memory.
     *
     * @param  array<string>  $headers
     * @param  iterable  $rowsGenerator
     */
    public function streamCsv(string $filename, array $headers, iterable $rows, ?array $totalsRow = null): StreamedResponse
    {
        return new StreamedResponse(function () use ($headers, $rows, $totalsRow) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility
            fwrite($handle, "\xEF\xBB\xBF");

            // Write CSV column headers
            fputcsv($handle, $headers);

            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }

            if (! empty($totalsRow)) {
                fputcsv($handle, $totalsRow);
            }

            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ]);
    }

    /**
     * Generate Sales Summary PDF using DomPDF.
     */
    public function exportSalesSummaryPdf(Carbon $start, Carbon $end, Request $request)
    {
        $sales = Sale::query()
            ->with(['invoice', 'customer', 'user'])
            ->withCount('items')
            ->where('status', Sale::STATUS_COMPLETED)
            ->whereBetween('sold_at', [$start, $end])
            ->whereNull('deleted_at')
            ->orderBy('sold_at', 'desc')
            ->get();

        $totalsRow = DB::table('sales')
            ->selectRaw('
                COUNT(*) as total_orders,
                COALESCE(SUM(subtotal), 0) as total_subtotal,
                COALESCE(SUM(discount), 0) as total_discount,
                COALESCE(SUM(tax), 0) as total_tax,
                COALESCE(SUM(total), 0) as total_revenue
            ')
            ->where('status', Sale::STATUS_COMPLETED)
            ->whereBetween('sold_at', [$start, $end])
            ->whereNull('deleted_at')
            ->first();

        $settings = $this->settingService->all();

        return Pdf::loadView('reports.sales_summary_pdf', [
            'sales' => $sales,
            'start' => $start,
            'end' => $end,
            'totals' => $totalsRow,
            'settings' => $settings,
            'currencySymbol' => $settings['currency_symbol'] ?? '$',
        ])->setPaper('a4', 'landscape');
    }

    /**
     * Generate Inventory Valuation PDF using DomPDF.
     */
    public function exportValuationPdf(Request $request)
    {
        $data = $this->getInventoryValuationData($request);
        $settings = $this->settingService->all();

        return Pdf::loadView('reports.inventory_valuation_pdf', [
            'items' => $data['data'],
            'totals' => $data['totals'],
            'settings' => $settings,
            'currencySymbol' => $settings['currency_symbol'] ?? '$',
            'generatedAt' => now(),
        ])->setPaper('a4', 'landscape');
    }
}
