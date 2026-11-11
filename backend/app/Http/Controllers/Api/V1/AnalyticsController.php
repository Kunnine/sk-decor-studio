<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(
        protected AnalyticsService $analyticsService
    ) {}

    protected function authorizeRole(Request $request): void
    {
        $user = $request->user();
        if (! $user || (! $user->isAdmin() && ! $user->isManager())) {
            abort(403, 'Unauthorized. Admin or manager role required.');
        }
    }

    public function summary(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        [$start, $end] = $this->analyticsService->parseDateRange(
            $request->input('from'),
            $request->input('to')
        );

        return response()->json([
            'data' => $this->analyticsService->summary($start, $end),
        ]);
    }

    public function salesTrend(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        [$start, $end] = $this->analyticsService->parseDateRange(
            $request->input('from'),
            $request->input('to')
        );

        return response()->json([
            'data' => $this->analyticsService->salesTrend($start, $end),
        ]);
    }

    public function topProducts(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        [$start, $end] = $this->analyticsService->parseDateRange(
            $request->input('from'),
            $request->input('to')
        );

        $by = $request->input('by', 'qty');
        $limit = $request->integer('limit', 10);

        return response()->json([
            'data' => $this->analyticsService->topProducts($start, $end, $by, $limit),
        ]);
    }

    public function salesByCategory(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        [$start, $end] = $this->analyticsService->parseDateRange(
            $request->input('from'),
            $request->input('to')
        );

        return response()->json([
            'data' => $this->analyticsService->salesByCategory($start, $end),
        ]);
    }

    public function valuation(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        return response()->json([
            'data' => $this->analyticsService->valuation(),
        ]);
    }

    public function paymentMethods(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        [$start, $end] = $this->analyticsService->parseDateRange(
            $request->input('from'),
            $request->input('to')
        );

        return response()->json([
            'data' => $this->analyticsService->paymentMethods($start, $end),
        ]);
    }

    public function cashiers(Request $request): JsonResponse
    {
        $this->authorizeRole($request);

        [$start, $end] = $this->analyticsService->parseDateRange(
            $request->input('from'),
            $request->input('to')
        );

        return response()->json([
            'data' => $this->analyticsService->cashiers($start, $end),
        ]);
    }
}
