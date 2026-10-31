<?php

namespace App\Http\Requests\Product;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductImportCommitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('import', Product::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'preview_token' => ['required', 'string'],
            'create_missing_categories' => ['boolean'],
            'create_missing_units' => ['boolean'],
            'duplicate_sku_action' => ['required', 'string', Rule::in(['skip', 'update'])],
        ];
    }
}
