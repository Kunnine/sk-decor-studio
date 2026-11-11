<?php

namespace App\Services;

use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class InvoiceService
{
    public function __construct(
        protected SettingService $settingService
    ) {}

    /**
     * Generate or regenerate the PDF for an invoice.
     * Saved to private local storage disk.
     *
     * @return string Absolute file path to the PDF
     */
    public function generate(Invoice $invoice): string
    {
        $invoice->load([
            'sale.items.product.unit',
            'sale.items.variant',
            'sale.customer',
            'sale.user',
            'sale.voidedByUser',
        ]);

        $settings = $this->settingService->all();
        $currencySymbol = $settings['currency_symbol'] ?? '$';
        $taxRate = $settings['tax_rate'] ?? 0;

        $pdf = Pdf::loadView('invoices.template', [
            'invoice' => $invoice,
            'sale' => $invoice->sale,
            'settings' => $settings,
            'currencySymbol' => $currencySymbol,
            'taxRate' => $taxRate,
        ]);

        $year = $invoice->issued_at->format('Y');
        $fileName = "{$invoice->number}.pdf";
        $relativePath = "invoices/{$year}/{$fileName}";

        // Store on private local disk
        Storage::disk('local')->put($relativePath, $pdf->output());

        $invoice->update(['pdf_path' => $relativePath]);

        return Storage::disk('local')->path($relativePath);
    }

    /**
     * Get the PDF response for inline display or download.
     */
    public function getPdfResponse(Invoice $invoice, bool $download = false): BinaryFileResponse
    {
        // Regenerate on demand to ensure latest VOID stamps / settings
        $path = $this->generate($invoice);

        $headers = [
            'Content-Type' => 'application/pdf',
        ];

        if ($download) {
            return response()->download($path, "{$invoice->number}.pdf", $headers);
        }

        return response()->file($path, $headers);
    }
}
