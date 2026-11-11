<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Invoice {{ $invoice->number }}</title>
    <style>
        @page {
            margin: 30px 40px;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #292824;
            margin: 0;
            padding: 0;
        }
        .header {
            width: 100%;
            margin-bottom: 25px;
            border-bottom: 1px solid #E8E3DA;
            padding-bottom: 15px;
        }
        .header-table {
            width: 100%;
        }
        .business-name {
            font-size: 18px;
            font-weight: bold;
            color: #795438;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .invoice-title {
            font-size: 20px;
            font-weight: bold;
            color: #292824;
            text-align: right;
            margin: 0;
        }
        .invoice-meta {
            text-align: right;
            font-size: 11px;
            color: #88847D;
        }
        .meta-section {
            width: 100%;
            margin-bottom: 25px;
        }
        .meta-table {
            width: 100%;
        }
        .meta-card {
            width: 48%;
            border: 1px solid #E8E3DA;
            border-radius: 8px;
            padding: 10px 12px;
            vertical-align: top;
        }
        .meta-card-title {
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            color: #88847D;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .meta-card-content {
            font-size: 11px;
            color: #292824;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .items-table th {
            background-color: #FAF8F4;
            border-top: 1px solid #E8E3DA;
            border-bottom: 1px solid #E8E3DA;
            color: #88847D;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            text-align: left;
        }
        .items-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #F0ECE4;
            font-size: 11px;
        }
        .items-table .text-right {
            text-align: right;
        }
        .summary-section {
            width: 100%;
            margin-bottom: 20px;
        }
        .summary-table {
            width: 45%;
            margin-left: auto;
            border-collapse: collapse;
        }
        .summary-table td {
            padding: 4px 8px;
            font-size: 11px;
        }
        .summary-table .label {
            color: #88847D;
        }
        .summary-table .value {
            text-align: right;
            font-weight: 600;
        }
        .total-row td {
            border-top: 2px solid #E8E3DA;
            border-bottom: 2px solid #E8E3DA;
            padding: 8px 8px;
            font-size: 13px;
            font-weight: bold;
            color: #795438;
        }
        .payment-info {
            border: 1px solid #E8E3DA;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 25px;
            background-color: #FAF8F4;
        }
        .payment-info table {
            width: 100%;
        }
        .payment-info td {
            font-size: 10px;
            color: #5C5852;
        }
        .watermark {
            position: fixed;
            top: 35%;
            left: 15%;
            width: 70%;
            text-align: center;
            font-size: 80px;
            font-weight: 900;
            color: #F59E0B;
            opacity: 0.18;
            transform: rotate(-30deg);
            z-index: 1000;
            border: 8px solid #F59E0B;
            border-radius: 16px;
            padding: 10px;
            letter-spacing: 10px;
        }
        .void-banner {
            border: 1px solid #F59E0B;
            background-color: #FFFBEB;
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 15px;
            color: #92400E;
            font-size: 10px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #88847D;
            font-size: 9px;
            border-top: 1px solid #E8E3DA;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    @if ($sale->isVoid())
        <div class="watermark">VOID</div>
        <div class="void-banner">
            <strong>NOTICE: THIS SALE HAS BEEN VOIDED</strong><br>
            Voided on {{ $sale->voided_at?->format('Y-m-d H:i') }} by {{ $sale->voidedByUser?->name ?? 'Staff' }}.
            @if ($sale->void_reason)
                Reason: {{ $sale->void_reason }}
            @endif
        </div>
    @endif

    <div class="header">
        <table class="header-table">
            <tr>
                <td style="vertical-align: middle;">
                    <div class="business-name">{{ $settings['business_name'] ?? 'Maison Decor Studio' }}</div>
                    <div style="color: #88847D; font-size: 10px; margin-top: 2px;">Official Home Decor Sales Receipt</div>
                </td>
                <td style="vertical-align: middle; text-align: right;">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-meta">#{{ $invoice->number }}</div>
                    <div class="invoice-meta">Date: {{ $invoice->issued_at->format('Y-m-d H:i') }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="meta-section">
        <table class="meta-table">
            <tr>
                <td class="meta-card">
                    <div class="meta-card-title">Customer Details</div>
                    <div class="meta-card-content">
                        @if ($sale->customer)
                            <strong>{{ $sale->customer->name }}</strong><br>
                            @if ($sale->customer->phone) Phone: {{ $sale->customer->phone }}<br> @endif
                            @if ($sale->customer->email) Email: {{ $sale->customer->email }}<br> @endif
                            @if ($sale->customer->address) {{ $sale->customer->address }} @endif
                        @else
                            <strong>Walk-in Customer</strong><br>
                            <span style="color: #88847D;">Direct retail checkout</span>
                        @endif
                    </div>
                </td>
                <td style="width: 4%;"></td>
                <td class="meta-card">
                    <div class="meta-card-title">Transaction Information</div>
                    <div class="meta-card-content">
                        <strong>Cashier:</strong> {{ $sale->user?->name ?? 'Staff' }} ({{ $sale->user?->email }})<br>
                        <strong>Payment:</strong> {{ strtoupper($sale->payment_method) }}<br>
                        <strong>Status:</strong> {{ strtoupper($sale->status) }}
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 45%;">Item & SKU</th>
                <th style="width: 15%; text-align: right;">Qty</th>
                <th style="width: 15%; text-align: right;">Price</th>
                <th style="width: 20%; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($sale->items as $index => $item)
                <tr>
                    <td style="color: #88847D;">{{ $index + 1 }}</td>
                    <td>
                        <strong>{{ $item->product?->name ?? 'Product' }}</strong><br>
                        @if ($item->variant_label)
                            <span style="color: #795438; font-size: 10px;">Variation: {{ $item->variant_label }}</span><br>
                        @endif
                        <span style="font-family: monospace; color: #88847D; font-size: 10px;">{{ $item->variant?->sku ?? $item->product?->sku }}</span>
                    </td>
                    <td class="text-right">
                        {{ $item->qty }} {{ $item->product?->unit?->short_name }}
                    </td>
                    <td class="text-right">
                        {{ $currencySymbol }}{{ number_format((float)$item->unit_price, 2) }}
                    </td>
                    <td class="text-right font-bold">
                        {{ $currencySymbol }}{{ number_format((float)$item->line_total, 2) }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="summary-section">
        <table class="summary-table">
            <tr>
                <td class="label">Subtotal:</td>
                <td class="value">{{ $currencySymbol }}{{ number_format((float)$sale->subtotal, 2) }}</td>
            </tr>
            @if ($sale->discount > 0)
                <tr>
                    <td class="label">Discount:</td>
                    <td class="value">-{{ $currencySymbol }}{{ number_format((float)$sale->discount, 2) }}</td>
                </tr>
            @endif
            @if ($sale->tax > 0)
                <tr>
                    <td class="label">Tax ({{ $taxRate }}%):</td>
                    <td class="value">{{ $currencySymbol }}{{ number_format((float)$sale->tax, 2) }}</td>
                </tr>
            @endif
            <tr class="total-row">
                <td style="color: #795438;">TOTAL:</td>
                <td class="value" style="color: #795438;">{{ $currencySymbol }}{{ number_format((float)$sale->total, 2) }}</td>
            </tr>
        </table>
    </div>

    <div class="payment-info">
        <table>
            <tr>
                <td><strong>Payment Method:</strong> {{ strtoupper($sale->payment_method) }}</td>
                <td style="text-align: center;"><strong>Amount Tendered:</strong> {{ $currencySymbol }}{{ number_format((float)$sale->amount_paid, 2) }}</td>
                <td style="text-align: right;"><strong>Change Given:</strong> {{ $currencySymbol }}{{ number_format((float)$sale->change_due, 2) }}</td>
            </tr>
        </table>
    </div>

    @if ($sale->notes)
        <div style="font-size: 10px; color: #88847D; margin-bottom: 15px;">
            <strong>Notes:</strong> {{ $sale->notes }}
        </div>
    @endif

    <div class="footer">
        Thank you for curating your space with us! Generated on {{ now()->format('Y-m-d H:i:s') }} &bull; {{ $settings['business_name'] ?? 'Maison Decor Studio' }}
    </div>
</body>
</html>
