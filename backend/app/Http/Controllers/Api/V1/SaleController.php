<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sale\SaleStoreRequest;
use App\Http\Requests\Sale\SaleVoidRequest;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use App\Services\SaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SaleController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Sale::class);

        $user = $request->user();
        $query = Sale::query()
            ->with(['customer', 'user', 'invoice', 'items.product.unit'])
            ->forUser($user);

        // Filter by status (completed, void)
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('sold_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('sold_at', '<=', $request->input('date_to'));
        }

        // Filter by cashier (managers/admins only)
        if ($request->filled('user_id') && ! $user->isCashier()) {
            $query->where('user_id', $request->integer('user_id'));
        }

        // Filter by customer
        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->integer('customer_id'));
        }

        // Filter by invoice number
        if ($request->filled('invoice_number')) {
            $invTerm = $request->input('invoice_number');
            $query->whereHas('invoice', function ($q) use ($invTerm) {
                $q->where('number', 'like', "%{$invTerm}%");
            });
        }

        $sales = $query->orderByDesc('sold_at')->paginate($request->integer('per_page', 15));

        return SaleResource::collection($sales);
    }

    public function store(SaleStoreRequest $request, SaleService $saleService): JsonResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key');

        $sale = $saleService->create(
            data: $request->validated(),
            user: $request->user(),
            idempotencyKey: $idempotencyKey
        );

        return response()->json([
            'message' => 'Sale processed successfully',
            'data' => new SaleResource($sale),
        ], 201);
    }

    public function show(Sale $sale): JsonResponse
    {
        $this->authorize('view', $sale);

        $sale->load([
            'customer',
            'user',
            'voidedByUser',
            'invoice',
            'items.product.unit',
        ]);

        return response()->json([
            'data' => new SaleResource($sale),
        ]);
    }

    public function void(SaleVoidRequest $request, Sale $sale, SaleService $saleService): JsonResponse
    {
        $this->authorize('void', $sale);

        try {
            $voidedSale = $saleService->void(
                sale: $sale,
                reason: $request->input('reason'),
                user: $request->user()
            );

            return response()->json([
                'message' => "Sale #{$voidedSale->id} has been voided and stock restored.",
                'data' => new SaleResource($voidedSale),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
