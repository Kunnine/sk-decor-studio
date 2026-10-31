<?php

namespace App\Http\Requests\Sale;

use Illuminate\Foundation\Http\FormRequest;

class SaleVoidRequest extends FormRequest
{
    public function authorize(): bool
    {
        $sale = $this->route('sale');

        return $this->user()?->can('void', $sale) ?? false;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}
