<?php

namespace App\Http\Requests\Setting;

use Illuminate\Foundation\Http\FormRequest;

class SettingUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'business_name' => ['required', 'string', 'max:255'],
            'currency_code' => ['required', 'string', 'max:10'],
            'currency_symbol' => ['required', 'string', 'max:10'],
            'tax_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'default_reorder_level' => ['required', 'integer', 'min:0'],
            'invoice_prefix' => ['required', 'string', 'max:20'],
            'date_format' => ['required', 'string', 'max:20'],
            'digest_time' => ['sometimes', 'nullable', 'string', 'regex:/^(?:2[0-3]|[01][0-9]):[0-5][0-9]$/'],
            'low_stock_email_alerts' => ['sometimes', 'nullable'],
            'low_stock_digest' => ['sometimes', 'nullable'],
            'slow_moving_days' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }
}
