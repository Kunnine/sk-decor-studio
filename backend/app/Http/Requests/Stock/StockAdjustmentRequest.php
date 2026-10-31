<?php

namespace App\Http\Requests\Stock;

use App\Models\StockMovement;
use Illuminate\Foundation\Http\FormRequest;

class StockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('adjust', StockMovement::class);
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'delta' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'delta.not_in' => 'Adjustment delta must be a non-zero integer (+ for increase, - for decrease).',
            'reason.required' => 'A valid justification reason is required for manual stock adjustment.',
        ];
    }
}
