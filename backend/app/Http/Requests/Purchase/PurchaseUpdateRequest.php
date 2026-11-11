<?php

namespace App\Http\Requests\Purchase;

use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0', 'max:999999999.99'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $items = $this->input('items');
            if (! is_array($items)) {
                return;
            }

            $seen = [];
            foreach ($items as $index => $item) {
                $pid = $item['product_id'] ?? null;
                $vid = $item['product_variant_id'] ?? null;
                if (! $pid) {
                    continue;
                }

                if ($vid) {
                    $variant = ProductVariant::find((int) $vid);
                    if ($variant && (int) $variant->product_id !== (int) $pid) {
                        $validator->errors()->add("items.{$index}.product_variant_id", 'Selected variation does not belong to the chosen product.');
                    }
                }

                $key = ((int) $pid).':'.($vid ? (int) $vid : 'none');
                $seen[$key][] = $index;
            }

            foreach ($seen as $indices) {
                if (count($indices) > 1) {
                    foreach ($indices as $dupIndex) {
                        $validator->errors()->add("items.{$dupIndex}.product_id", 'Duplicate products are not allowed in the same purchase.');
                    }
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'items.min' => 'A purchase requires at least one line item.',
            'items.*.qty.min' => 'Item quantities must be positive integers.',
            'items.*.unit_cost.min' => 'Item unit costs cannot be negative.',
        ];
    }
}
