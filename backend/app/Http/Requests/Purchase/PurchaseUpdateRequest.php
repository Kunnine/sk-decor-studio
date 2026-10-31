<?php

namespace App\Http\Requests\Purchase;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PurchaseUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $purchase = $this->route('purchase');

        return $this->user()->can('update', $purchase);
    }

    public function rules(): array
    {
        $purchaseId = $this->route('purchase')?->id;

        return [
            'supplier_id' => ['sometimes', 'required', 'integer', 'exists:suppliers,id'],
            'ref_no' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('purchases', 'ref_no')->ignore($purchaseId),
            ],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['sometimes', 'required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id', 'distinct'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0', 'max:999999999.99'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.min' => 'A purchase requires at least one line item.',
            'items.*.product_id.distinct' => 'Duplicate products are not allowed in the same purchase.',
            'items.*.qty.min' => 'Item quantities must be positive integers.',
            'items.*.unit_cost.min' => 'Item unit costs cannot be negative.',
        ];
    }
}
