<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

class ReportController extends Controller
{
    public function __construct(
        protected ReportService $reportService
    ) {}

    protected function authorizeAccess(Request $request): void
    {
        $user = $request->user();
        if (! $user || (! $user->isAdmin() && ! $user->isManager())) {
            abort(403, 'Unauthorized. Admin or manager role required to view reports.');
        }
    }

    /**
     * Generate temporary signed URL for private PDF downloads.
     */
    public function signedPdfUrl(Request $request): JsonResponse
    {
        $this->authorizeAccess($request);

        $request->validate([
            'report' => ['required', 'string', 'in:sales-summary,inventory-valuation'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'category_id' => ['nullable', 'integer'],
        ]);

        $report = $request->input('report');
        $params = $request->only(['from', 'to', 'category_id']);

        $routeName = match ($report) {
            'sales-summary' => 'reports.sales-summary.pdf',
            'inventory-valuation' => 'reports.inventory-valuation.pdf',
        };

        $signedUrl = URL::temporarySignedRoute(
            $routeName,
            now()->addMinutes(15),
            $params
        );

        return response()->json([
            'url' => $signedUrl,
            'expires_at' => now()->addMinutes(15)->toISOString(),
        ]);
    }

    /**
     * 1. Sales Summary Report
     */
    public function salesSummary(Request $request): Response
    {
        $this->authorizeAccess($request);

        [$start, $end] = $this->reportService->parseRange(
            $request->input('from'),
            $request->input('to')
        );

        if ($request->input('format') === 'csv') {
            $data = $this->reportService->getSalesSummaryData($start, $end, $request);
            $rows = collect($data['data'])->map(function ($s) {
                return [
                    $s->sold_at ? $s->sold_at->format('Y-m-d H:i') : '-',
                    $s->invoice?->number ?? "ID-{$s->id}",
                    $s->customer?->name ?? 'Walk-in Customer',
                    $s->user?->name ?? '-',
                    $s->payment_method,
                    $s->items_count,
                    number_format((float) $s->subtotal, 2, '.', ''),
                    number_format((float) $s->discount, 2, '.', ''),
                    number_format((float) $s->tax, 2, '.', ''),
                    number_format((float) $s->total, 2, '.', ''),
                ];
            });

            $totalsRow = [
                'TOTALS',
                '',
                '',
                '',
                '',
                $data['totals']['orders'],
                number_format($data['totals']['subtotal'], 2, '.', ''),
                number_format($data['totals']['discount'], 2, '.', ''),
                number_format($data['totals']['tax'], 2, '.', ''),
                number_format($data['totals']['total'], 2, '.', ''),
            ];

            return $this->reportService->streamCsv(
                "sales_summary_{$start->format('Ymd')}_{$end->format('Ymd')}.csv",
                ['Date', 'Invoice #', 'Customer', 'Cashier', 'Method', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total'],
                $rows,
                $totalsRow
            );
        }

        return response()->json(
            $this->reportService->getSalesSummaryData($start, $end, $request)
        );
    }

    public function salesSummaryPdf(Request $request): Response
    {
        // Allow signed URLs or Sanctum auth
        if (! $request->hasValidSignature()) {
            $this->authorizeAccess($request);
        }

        [$start, $end] = $this->reportService->parseRange(
            $request->input('from'),
            $request->input('to')
        );

        $pdf = $this->reportService->exportSalesSummaryPdf($start, $end, $request);

        return $pdf->stream("sales_summary_{$start->format('Ymd')}_{$end->format('Ymd')}.pdf");
    }

    /**
     * 2. Sales by Product Report
     */
    public function salesByProduct(Request $request): Response
    {
        $this->authorizeAccess($request);

        [$start, $end] = $this->reportService->parseRange(
            $request->input('from'),
            $request->input('to')
        );

        if ($request->input('format') === 'csv') {
            $data = $this->reportService->getSalesByProductData($start, $end, $request);
            $rows = collect($data['data'])->map(function ($item) {
                return [
                    $item['sku'],
                    $item['name'],
                    $item['category'],
                    $item['units_sold'],
                    number_format($item['revenue'], 2, '.', ''),
                    number_format($item['cogs'], 2, '.', ''),
                    number_format($item['profit'], 2, '.', ''),
                    number_format($item['margin_pct'], 2, '.', '').'%',
                ];
            });

            $totalsRow = [
                'TOTALS',
                '',
                '',
                $data['totals']['units_sold'],
                number_format($data['totals']['revenue'], 2, '.', ''),
                number_format($data['totals']['cogs'], 2, '.', ''),
                number_format($data['totals']['profit'], 2, '.', ''),
                number_format($data['totals']['margin_pct'], 2, '.', '').'%',
            ];

            return $this->reportService->streamCsv(
                "sales_by_product_{$start->format('Ymd')}_{$end->format('Ymd')}.csv",
                ['SKU', 'Product Name', 'Category', 'Units Sold', 'Revenue', 'COGS', 'Gross Profit', 'Margin %'],
                $rows,
                $totalsRow
            );
        }

        return response()->json(
            $this->reportService->getSalesByProductData($start, $end, $request)
        );
    }

    /**
     * 3. Sales by Category Report
     */
    public function salesByCategory(Request $request): Response
    {
        $this->authorizeAccess($request);

        [$start, $end] = $this->reportService->parseRange(
            $request->input('from'),
            $request->input('to')
        );

        if ($request->input('format') === 'csv') {
            $data = $this->reportService->getSalesByCategoryData($start, $end, $request);
            $rows = collect($data['data'])->map(function ($item) {
                return [
                    $item['category'],
                    $item['units_sold'],
                    number_format($item['revenue'], 2, '.', ''),
                    number_format($item['percentage'], 2, '.', '').'%',
                ];
            });

            $totalsRow = [
                'TOTALS',
                $data['totals']['units_sold'],
                number_format($data['totals']['revenue'], 2, '.', ''),
                '100.00%',
            ];

            return $this->reportService->streamCsv(
                "sales_by_category_{$start->format('Ymd')}_{$end->format('Ymd')}.csv",
                ['Category', 'Units Sold', 'Revenue', 'Share %'],
                $rows,
                $totalsRow
            );
        }

        return response()->json(
            $this->reportService->getSalesByCategoryData($start, $end, $request)
        );
    }

    /**
     * 4. Purchases by Supplier Report
     */
    public function purchasesBySupplier(Request $request): Response
    {
        $this->authorizeAccess($request);

        [$start, $end] = $this->reportService->parseRange(
            $request->input('from'),
            $request->input('to')
        );

        if ($request->input('format') === 'csv') {
            $data = $this->reportService->getPurchasesBySupplierData($start, $end, $request);
            $rows = collect($data['data'])->map(function ($item) {
                return [
                    $item['supplier_name'],
                    $item['purchases_count'],
                    $item['items_purchased'],
                    $item['received_count'],
                    $item['draft_count'],
                    number_format($item['total_spent'], 2, '.', ''),
                ];
            });

            $totalsRow = [
                'TOTALS',
                $data['totals']['purchases_count'],
                $data['totals']['items_purchased'],
                '',
                '',
                number_format($data['totals']['total_spent'], 2, '.', ''),
            ];

            return $this->reportService->streamCsv(
                "purchases_by_supplier_{$start->format('Ymd')}_{$end->format('Ymd')}.csv",
                ['Supplier Name', 'Total Orders', 'Items Purchased', 'Received', 'Draft', 'Total Spent'],
                $rows,
                $totalsRow
            );
        }

        return response()->json(
            $this->reportService->getPurchasesBySupplierData($start, $end, $request)
        );
    }

    /**
     * 5. Stock Movements Report
     */
    public function stockMovements(Request $request): Response
    {
        $this->authorizeAccess($request);

        [$start, $end] = $this->reportService->parseRange(
            $request->input('from'),
            $request->input('to')
        );

        if ($request->input('format') === 'csv') {
            $data = $this->reportService->getStockMovementsData($start, $end, $request);
            $rows = collect($data['data'])->map(function ($m) {
                return [
                    $m->created_at ? $m->created_at->format('Y-m-d H:i') : '-',
                    $m->product?->sku ?? '-',
                    $m->product?->name ?? '-',
                    strtoupper($m->type),
                    $m->qty_change,
                    number_format((float) $m->unit_cost, 2, '.', ''),
                    number_format((float) ($m->qty_change * $m->unit_cost), 2, '.', ''),
                    $m->user?->name ?? 'System',
                    $m->reason ?? '-',
                ];
            });

            $totalsRow = [
                'TOTALS',
                '',
                '',
                $data['totals']['movements_count'].' movements',
                $data['totals']['net_qty'],
                '',
                number_format($data['totals']['net_value'], 2, '.', ''),
                '',
                '',
            ];

            return $this->reportService->streamCsv(
                "stock_movements_{$start->format('Ymd')}_{$end->format('Ymd')}.csv",
                ['Date', 'SKU', 'Product Name', 'Movement Type', 'Qty Delta', 'Unit Cost', 'Total Value', 'Recorded By', 'Reason'],
                $rows,
                $totalsRow
            );
        }

        return response()->json(
            $this->reportService->getStockMovementsData($start, $end, $request)
        );
    }

    /**
     * 6. Inventory Valuation Report
     */
    public function inventoryValuation(Request $request): Response
    {
        $this->authorizeAccess($request);

        if ($request->input('format') === 'csv') {
            $data = $this->reportService->getInventoryValuationData($request);
            $rows = collect($data['data'])->map(function ($item) {
                return [
                    $item['sku'],
                    $item['name'],
                    $item['category'],
                    $item['stock_qty'],
                    $item['unit'],
                    number_format($item['avg_cost'], 2, '.', ''),
                    number_format($item['inventory_value'], 2, '.', ''),
                    number_format($item['sell_price'], 2, '.', ''),
                    number_format($item['retail_value'], 2, '.', ''),
                    number_format($item['potential_profit'], 2, '.', ''),
                ];
            });

            $totalsRow = [
                'TOTALS',
                $data['totals']['products_count'].' products',
                '',
                $data['totals']['total_units'],
                '',
                '',
                number_format($data['totals']['total_inventory_value'], 2, '.', ''),
                '',
                number_format($data['totals']['total_retail_value'], 2, '.', ''),
                number_format($data['totals']['total_potential_profit'], 2, '.', ''),
            ];

            return $this->reportService->streamCsv(
                'inventory_valuation_'.now()->format('Ymd').'.csv',
                ['SKU', 'Product Name', 'Category', 'Stock Qty', 'Unit', 'Avg Cost', 'Inventory Value', 'Retail Price', 'Retail Value', 'Potential Profit'],
                $rows,
                $totalsRow
            );
        }

        return response()->json(
            $this->reportService->getInventoryValuationData($request)
        );
    }

    public function inventoryValuationPdf(Request $request): Response
    {
        if (! $request->hasValidSignature()) {
            $this->authorizeAccess($request);
        }

        $pdf = $this->reportService->exportValuationPdf($request);

        return $pdf->stream('inventory_valuation_'.now()->format('Ymd').'.pdf');
    }

    /**
     * 7. Low Stock Report
     */
    public function lowStock(Request $request): Response
    {
        $this->authorizeAccess($request);

        if ($request->input('format') === 'csv') {
            $data = $this->reportService->getLowStockData($request);
            $rows = collect($data['data'])->map(function ($item) {
                return [
                    $item['sku'],
                    $item['name'],
                    $item['category'],
                    $item['stock_qty'],
                    $item['reorder_level'],
                    $item['deficit'],
                    $item['suggested_reorder_qty'],
                    $item['unit'],
                    number_format($item['unit_cost'], 2, '.', ''),
                    number_format($item['estimated_restock_cost'], 2, '.', ''),
                    $item['last_purchase_date'] ?? '-',
                ];
            });

            $totalsRow = [
                'TOTALS',
                $data['totals']['products_count'].' products',
                '',
                '',
                '',
                $data['totals']['total_deficit'],
                '',
                '',
                '',
                number_format($data['totals']['total_restock_cost'], 2, '.', ''),
                '',
            ];

            return $this->reportService->streamCsv(
                'low_stock_report_'.now()->format('Ymd').'.csv',
                ['SKU', 'Product Name', 'Category', 'Current Stock', 'Reorder Level', 'Deficit', 'Suggested Qty', 'Unit', 'Unit Cost', 'Est. Restock Cost', 'Last Purchase Date'],
                $rows,
                $totalsRow
            );
        }

        return response()->json(
            $this->reportService->getLowStockData($request)
        );
    }
}
