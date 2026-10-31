<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;

class ProductImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $product = $this->route('product');

        return $this->user()?->can('update', $product) ?? false;
    }

    public function rules(): array
    {
        return [
            'image' => [
                'required',
                'file',
                'image',
                'mimes:jpeg,jpg,png,webp',
                'max:2048', // 2 MB
                'dimensions:min_width=200,min_height=200',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Please provide an image file to upload.',
            'image.image' => 'The file must be a real image content (not just renamed extension).',
            'image.mimes' => 'The image must be a file of type: jpeg, jpg, png, or webp.',
            'image.max' => 'The image size may not be greater than 2 megabytes (2048 KB).',
            'image.dimensions' => 'The image must have minimum dimensions of 200x200 pixels.',
        ];
    }
}
