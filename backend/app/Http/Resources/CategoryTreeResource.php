<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryTreeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'parent_id' => $this->parent_id,
            'sort_order' => (int) $this->sort_order,
            'products_count' => $this->whenCounted('products'),
            'children' => CategoryTreeResource::collection($this->whenLoaded('children')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
