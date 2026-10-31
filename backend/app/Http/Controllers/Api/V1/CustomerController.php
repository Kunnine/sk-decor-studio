<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\CustomerStoreRequest;
use App\Http\Requests\Customer\CustomerUpdateRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CustomerController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Customer::class);

        $query = Customer::query()->withCount('sales');

        if ($request->filled('search')) {
            $query->search($request->input('search'));
        }

        $customers = $query->orderBy('name')->paginate($request->integer('per_page', 15));

        return CustomerResource::collection($customers);
    }

    public function search(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Customer::class);

        $term = $request->input('q', '');
        $query = Customer::query();

        if (! empty($term)) {
            $query->search($term);
        }

        $customers = $query->orderBy('name')->limit(15)->get();

        return response()->json([
            'data' => CustomerResource::collection($customers),
        ]);
    }

    public function store(CustomerStoreRequest $request): JsonResponse
    {
        $customer = Customer::create($request->validated());

        return response()->json([
            'message' => 'Customer created successfully',
            'data' => new CustomerResource($customer),
        ], 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        $this->authorize('view', $customer);
        $customer->loadCount('sales');

        return response()->json([
            'data' => new CustomerResource($customer),
        ]);
    }

    public function update(CustomerUpdateRequest $request, Customer $customer): JsonResponse
    {
        $customer->update($request->validated());
        $customer->loadCount('sales');

        return response()->json([
            'message' => 'Customer updated successfully',
            'data' => new CustomerResource($customer),
        ]);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $this->authorize('delete', $customer);

        $customer->delete();

        return response()->json([
            'message' => 'Customer deleted successfully',
        ]);
    }
}
