<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Purchase\PurchaseStoreRequest;
use App\Http\Requests\Purchase\PurchaseUpdateRequest;
use App\Http\Resources\PurchaseResource;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseController extends Controller
{
    public function __construct(
        protected StockService $stockService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Purchase::class);

        $query = Purchase::query()
            ->with(['supplier', 'creator'])
            ->withCount('items');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->integer('supplier_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where('ref_no', 'like', "%{$term}%");
        }

        $purchases = $query->latest()->paginate($request->integer('per_page', 15));

        return PurchaseResource::collection($purchases);
    }

    public function store(PurchaseStoreRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $purchase = DB::transaction(function () use ($validated, $request) {
            $total = 0.00;
            foreach ($validated['items'] as $item) {
                $total += ((int) $item['qty'] * (float) $item['unit_cost']);
            }

            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'ref_no' => $validated['ref_no'],
                'status' => Purchase::STATUS_DRAFT,
                'total' => $total,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($validated['items'] as $item) {
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item['product_id'],
                    'qty' => $item['qty'],
                    'unit_cost' => $item['unit_cost'],
                ]);
            }

            return $purchase;
        });

        $purchase->load(['supplier', 'creator', 'items.product']);

        return response()->json([
            'message' => 'Purchase order created in draft status.',
            'data' => new PurchaseResource($purchase),
        ], 201);
    }

    public function show(Purchase $purchase): JsonResponse
    {
        $this->authorize('view', $purchase);

        $purchase->load(['supplier', 'creator', 'items.product.category']);

        return response()->json([
            'data' => new PurchaseResource($purchase),
        ]);
    }

    public function update(PurchaseUpdateRequest $request, Purchase $purchase): JsonResponse
    {
        if (! $purchase->isDraft()) {
            return response()->json([
                'message' => 'Only draft purchases can be modified. Received purchases are read-only.',
            ], 422);
        }

        $validated = $request->validated();

        $updatedPurchase = DB::transaction(function () use ($purchase, $validated) {
            if (isset($validated['items'])) {
                $purchase->items()->delete();

                $total = 0.00;
                foreach ($validated['items'] as $item) {
                    $total += ((int) $item['qty'] * (float) $item['unit_cost']);
                    PurchaseItem::create([
                        'purchase_id' => $purchase->id,
                        'product_id' => $item['product_id'],
                        'qty' => $item['qty'],
                        'unit_cost' => $item['unit_cost'],
                    ]);
                }
                $purchase->total = $total;
            }

            if (isset($validated['supplier_id'])) {
                $purchase->supplier_id = $validated['supplier_id'];
            }

            if (isset($validated['ref_no'])) {
                $purchase->ref_no = $validated['ref_no'];
            }

            if (array_key_exists('notes', $validated)) {
                $purchase->notes = $validated['notes'];
            }

            $purchase->save();

            return $purchase;
        });

        $updatedPurchase->load(['supplier', 'creator', 'items.product']);

        return response()->json([
            'message' => 'Purchase order updated successfully.',
            'data' => new PurchaseResource($updatedPurchase),
        ]);
    }

    public function destroy(Purchase $purchase): JsonResponse
    {
        $this->authorize('delete', $purchase);

        if (! $purchase->isDraft()) {
            return response()->json([
                'message' => 'Cannot delete received purchases. Received inventory records are permanent.',
            ], 422);
        }

        $purchase->delete();

        return response()->json([
            'message' => 'Draft purchase deleted successfully.',
        ]);
    }

    public function receive(Request $request, Purchase $purchase): JsonResponse
    {
        $this->authorize('receive', $purchase);

        if (! $purchase->isDraft()) {
            return response()->json([
                'message' => "Purchase '{$purchase->ref_no}' has already been received.",
            ], 422);
        }

        try {
            $receivedPurchase = $this->stockService->receive($purchase, $request->user());
            $receivedPurchase->load(['supplier', 'creator', 'items.product']);

            return response()->json([
                'message' => "Purchase '{$receivedPurchase->ref_no}' received successfully. Inventory and average costs updated.",
                'data' => new PurchaseResource($receivedPurchase),
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
