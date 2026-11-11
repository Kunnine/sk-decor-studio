<?php

namespace App\Http\Requests\Product;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ProductStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Product::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];

        foreach (['description', 'supplier_id', 'unit_id', 'color', 'size', 'material', 'style'] as $nullableKey) {
            if ($this->has($nullableKey) && $this->input($nullableKey) === '') {
                $merge[$nullableKey] = null;
            }
        }

        if ($this->has('variants') && is_string($this->input('variants'))) {
            $decoded = json_decode($this->input('variants'), true);
            if (is_array($decoded)) {
                $merge['variants'] = $decoded;
            }
        }

        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        return [
            'sku' => ['required', 'string', 'max:64', 'unique:products,sku'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'cost_price' => ['required', 'numeric', 'min:0', 'max:999999999.99'],
            'sell_price' => ['required', 'numeric', 'min:0', 'max:999999999.99'],
            'stock_qty' => ['nullable', 'integer', 'min:0'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'color' => ['nullable', 'string', 'max:64'],
            'size' => ['nullable', 'string', 'max:64'],
            'material' => ['nullable', 'string', 'max:64'],
            'style' => ['nullable', 'string', 'max:64'],
            'has_variants' => ['nullable', 'boolean'],
            'variants' => ['nullable', 'array'],
            'variants.*.sku' => ['required_with:variants', 'string', 'max:64', 'distinct'],
            'variants.*.name' => ['nullable', 'string', 'max:150'],
            'variants.*.color' => ['nullable', 'string', 'max:64'],
            'variants.*.size' => ['nullable', 'string', 'max:64'],
            'variants.*.material' => ['nullable', 'string', 'max:64'],
            'variants.*.style' => ['nullable', 'string', 'max:64'],
            'variants.*.cost_price' => ['required_with:variants', 'numeric', 'min:0', 'max:999999999.99'],
            'variants.*.sell_price' => ['required_with:variants', 'numeric', 'min:0', 'max:999999999.99'],
            'variants.*.stock_qty' => ['nullable', 'integer', 'min:0'],
            'variants.*.reorder_level' => ['nullable', 'integer', 'min:0'],
            'variants.*.is_active' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'image' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:min_width=200,min_height=200'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.image' => 'The file must be a real image content (not just renamed extension).',
            'image.mimes' => 'The image must be a file of type: jpg, jpeg, png, or webp.',
            'image.max' => 'The image size may not be greater than 2 megabytes (2048 KB).',
            'image.dimensions' => 'The image must have minimum dimensions of 200x200 pixels.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $variants = $this->input('variants');
            if (! is_array($variants)) {
                return;
            }

            foreach ($variants as $index => $variant) {
                $sku = trim((string) ($variant['sku'] ?? ''));
                if ($sku !== '' && ProductVariant::where('sku', $sku)->exists()) {
                    $validator->errors()->add("variants.{$index}.sku", "Variant SKU '{$sku}' has already been taken.");
                }
            }
        });
    }
}
