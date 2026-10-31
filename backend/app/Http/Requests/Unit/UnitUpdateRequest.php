<?php

namespace App\Http\Requests\Unit;

use Illuminate\Foundation\Http\FormRequest;

class UnitUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $unit = $this->route('unit');

        return $this->user()?->can('update', $unit) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'short_name' => ['sometimes', 'required', 'string', 'max:20'],
        ];
    }
}
