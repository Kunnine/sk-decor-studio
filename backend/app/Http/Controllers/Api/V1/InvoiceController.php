<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class InvoiceController extends Controller
{
    public function pdf(Request $request, Invoice $invoice, InvoiceService $invoiceService): BinaryFileResponse
    {
        $this->authorize('view', $invoice);

        $download = $request->boolean('download');

        return $invoiceService->getPdfResponse($invoice, $download);
    }
}
