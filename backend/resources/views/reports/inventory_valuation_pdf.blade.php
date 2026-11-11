<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Inventory Valuation Report</title>
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
                        Report Generated: {{ $generatedAt->format('Y-m-d H:i') }}
                    </div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div class="report-title">Inventory Valuation Report</div>
                    <div style="font-size: 10px; color: #88847D;">Active Products Valuation Snapshot</div>
                </td>
            </tr>
        </table>
    </div>

    <table class="summary-boxes" style="width: 100%;">
        <tr>
            <td style="width: 25%; padding-right: 6px;">
                <div class="kpi-card">
                    <div class="kpi-label">Active Products</div>
                    <div class="kpi-val">{{ number_format($totals['products_count'] ?? 0) }}</div>
                </div>
            </td>
            <td style="width: 25%; padding-right: 6px;">
                <div class="kpi-card">
                    <div class="kpi-label">Total Stock Units</div>
                    <div class="kpi-val">{{ number_format($totals['total_units'] ?? 0) }}</div>
                </div>
            </td>
            <td style="width: 25%; padding-right: 6px;">
                <div class="kpi-card">
                    <div class="kpi-label">Total Cost Valuation</div>
                    <div class="kpi-val">{{ $currencySymbol }}{{ number_format($totals['total_inventory_value'] ?? 0, 2) }}</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="kpi-card">
                    <div class="kpi-label">Total Retail Value</div>
                    <div class="kpi-val">{{ $currencySymbol }}{{ number_format($totals['total_retail_value'] ?? 0, 2) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 12%;">SKU</th>
                <th style="width: 24%;">Product Name</th>
                <th style="width: 16%;">Category</th>
                <th class="text-right" style="width: 8%;">Stock</th>
                <th class="text-right" style="width: 12%;">Avg Cost</th>
                <th class="text-right" style="width: 14%;">Inventory Value</th>
                <th class="text-right" style="width: 14%;">Retail Value</th>
            </tr>
        </thead>
        <tbody>
            @forelse($items as $item)
                <tr>
                    <td style="font-weight: bold; color: #795438;">{{ $item['sku'] }}</td>
                    <td>{{ $item['name'] }}</td>
                    <td>{{ $item['category'] }}</td>
                    <td class="text-right">{{ $item['stock_qty'] }} {{ $item['unit'] }}</td>
                    <td class="text-right">{{ $currencySymbol }}{{ number_format($item['avg_cost'], 2) }}</td>
                    <td class="text-right" style="font-weight: bold;">{{ $currencySymbol }}{{ number_format($item['inventory_value'], 2) }}</td>
                    <td class="text-right">{{ $currencySymbol }}{{ number_format($item['retail_value'], 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="text-center" style="padding: 20px; color: #88847D;">No products found.</td>
                </tr>
            @endforelse
            @if(count($items) > 0)
                <tr class="totals-row">
                    <td colspan="3">TOTALS ({{ count($items) }} products)</td>
                    <td class="text-right">{{ number_format($totals['total_units'] ?? 0) }}</td>
                    <td class="text-right">-</td>
                    <td class="text-right">{{ $currencySymbol }}{{ number_format($totals['total_inventory_value'] ?? 0, 2) }}</td>
                    <td class="text-right">{{ $currencySymbol }}{{ number_format($totals['total_retail_value'] ?? 0, 2) }}</td>
                </tr>
            @endif
        </tbody>
    </table>

    <div class="footer">
        Page 1 of 1 &bull; {{ $settings['business_name'] ?? 'Maison Decor Studio' }}
    </div>
</body>
</html>
