<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sales Summary Report</title>
    <style>
        @page {
            margin: 25px 30px;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #292824;
            margin: 0;
            padding: 0;
        }
        .header {
            width: 100%;
            border-bottom: 2px solid #E8E3DA;
            padding-bottom: 15px;
            margin-bottom: 15px;
        }
        .business-name {
            font-size: 16px;
            font-weight: bold;
            color: #795438;
            text-transform: uppercase;
            margin: 0;
        }
        .report-title {
            font-size: 18px;
            font-weight: bold;
            color: #292824;
            text-align: right;
            margin: 0;
        }
        .report-subtitle {
            font-size: 10px;
            color: #88847D;
            text-align: right;
        }
        .summary-boxes {
            width: 100%;
            margin-bottom: 15px;
        }
        .kpi-card {
            border: 1px solid #E8E3DA;
            border-radius: 6px;
            padding: 8px 12px;
            background: #FAF8F4;
        }
        .kpi-label {
            font-size: 9px;
            color: #88847D;
            text-transform: uppercase;
            font-weight: bold;
        }
        .kpi-val {
            font-size: 14px;
            font-weight: bold;
            color: #292824;
            margin-top: 2px;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        table.data-table th {
            background-color: #795438;
            color: #FFFFFF;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 6px 8px;
            text-align: left;
        }
        table.data-table td {
            padding: 5px 8px;
            border-bottom: 1px solid #E8E3DA;
            font-size: 9px;
        }
        table.data-table tr:nth-child(even) td {
            background-color: #FAF8F4;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .totals-row td {
            font-weight: bold;
            background-color: #F3EDE6 !important;
            border-top: 1px solid #DDD6CA;
            border-bottom: 2px solid #A58B6F;
        }
        .footer {
            width: 100%;
            border-top: 1px solid #E8E3DA;
            padding-top: 8px;
            font-size: 9px;
            color: #88847D;
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="header">
        <table style="width: 100%;">
            <tr>
                <td style="vertical-align: top;">
                    <div class="business-name">{{ $settings['business_name'] ?? 'Maison Decor Studio' }}</div>
                    <div style="color: #88847D; font-size: 9px; margin-top: 3px;">
                        Report Generated: {{ now()->format('Y-m-d H:i') }}
                    </div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div class="report-title">Sales Summary Report</div>
                    <div class="report-subtitle">
                        Period: {{ $start->format('Y-m-d') }} to {{ $end->format('Y-m-d') }}
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <table class="summary-boxes" style="width: 100%;">
        <tr>
            <td style="width: 20%; padding-right: 6px;">
                <div class="kpi-card">
                    <div class="kpi-label">Orders</div>
                    <div class="kpi-val">{{ number_format($totals->total_orders ?? 0) }}</div>
                </div>
            </td>
            <td style="width: 20%; padding-right: 6px;">
                <div class="kpi-card">
                    <div class="kpi-label">Subtotal</div>
                    <div class="kpi-val">{{ $currencySymbol }}{{ number_format($totals->total_subtotal ?? 0, 2) }}</div>
                </div>
            </td>
            <td style="width: 20%; padding-right: 6px;">
                <div class="kpi-card">
                    <div class="kpi-label">Discount</div>
                    <div class="kpi-val">-{{ $currencySymbol }}{{ number_format($totals->total_discount ?? 0, 2) }}</div>
                </div>
            </td>
            <td style="width: 20%; padding-right: 6px;">
                <div class="kpi-card">
                    <div class="kpi-label">Tax</div>
                    <div class="kpi-val">{{ $currencySymbol }}{{ number_format($totals->total_tax ?? 0, 2) }}</div>
                </div>
            </td>
            <td style="width: 20%;">
                <div class="kpi-card">
                    <div class="kpi-label">Total Revenue</div>
                    <div class="kpi-val">{{ $currencySymbol }}{{ number_format($totals->total_revenue ?? 0, 2) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 12%;">Date</th>
                <th style="width: 14%;">Invoice #</th>
                <th style="width: 18%;">Customer</th>
                <th style="width: 14%;">Cashier</th>
                <th style="width: 10%;">Method</th>
                <th class="text-right" style="width: 8%;">Items</th>
                <th class="text-right" style="width: 12%;">Subtotal</th>
                <th class="text-right" style="width: 12%;">Total</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sales as $sale)
                <tr>
                    <td>{{ $sale->sold_at ? $sale->sold_at->format('Y-m-d H:i') : '-' }}</td>
                    <td style="font-weight: bold; color: #795438;">{{ $sale->invoice?->number ?? 'ID-'.$sale->id }}</td>
                    <td>{{ $sale->customer?->name ?? 'Walk-in Customer' }}</td>
                    <td>{{ $sale->user?->name ?? '-' }}</td>
                    <td style="text-transform: capitalize;">{{ $sale->payment_method }}</td>
                    <td class="text-right">{{ $sale->items_count }}</td>
                    <td class="text-right">{{ $currencySymbol }}{{ number_format($sale->subtotal, 2) }}</td>
                    <td class="text-right" style="font-weight: bold;">{{ $currencySymbol }}{{ number_format($sale->total, 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" class="text-center" style="padding: 20px; color: #88847D;">No sales recorded in this period.</td>
                </tr>
            @endforelse
            @if(count($sales) > 0)
                <tr class="totals-row">
                    <td colspan="5">TOTALS ({{ count($sales) }} orders)</td>
                    <td class="text-right">{{ $sales->sum('items_count') }}</td>
                    <td class="text-right">{{ $currencySymbol }}{{ number_format($totals->total_subtotal ?? 0, 2) }}</td>
                    <td class="text-right">{{ $currencySymbol }}{{ number_format($totals->total_revenue ?? 0, 2) }}</td>
                </tr>
            @endif
        </tbody>
    </table>

    <div class="footer">
        Page 1 of 1 &bull; {{ $settings['business_name'] ?? 'Maison Decor Studio' }}
    </div>
</body>
</html>
