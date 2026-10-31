<?php

namespace App\Http\Requests\Purchase;

use App\Models\Purchase;
use Illuminate\Foundation\Http\FormRequest;

class PurchaseStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Purchase::class);
    }

    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'ref_no' => ['required', 'string', 'max:100', 'unique:purchases,ref_no'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
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
