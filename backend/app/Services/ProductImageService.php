<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

class ProductImageService
{
    protected ImageManager $manager;

    public function __construct()
    {
        $this->manager = new ImageManager(new Driver);
    }

    /**
     * Process and store a product image and its 200x200 thumbnail as WebP.
     * Removes previous image files if they exist.
     *
     * @return array{image_path: string, thumb_path: string}
     */
    public function storeImage(Product $product, UploadedFile $file): array
    {
        $this->deleteImageFiles($product);

        $year = now()->format('Y');
        $month = now()->format('m');
        $directory = "products/{$year}/{$month}";

        $randomHash = Str::random(40);
        $mainFileName = "{$randomHash}.webp";
        $thumbFileName = "{$randomHash}_thumb.webp";

        $mainPath = "{$directory}/{$mainFileName}";
        $thumbPath = "{$directory}/{$thumbFileName}";

        $encoder = new WebpEncoder(85);

        // Main image: max 800px width/height, WebP
        $mainImage = $this->manager->decodePath($file->getRealPath());
        $mainImage->scaleDown(800, 800);
        $encodedMain = (string) $mainImage->encode($encoder);

        // Thumbnail: 200x200 cover crop, WebP
        $thumbImage = $this->manager->decodePath($file->getRealPath());
        $thumbImage->cover(200, 200);
        $encodedThumb = (string) $thumbImage->encode($encoder);

        Storage::disk('public')->put($mainPath, $encodedMain);
        Storage::disk('public')->put($thumbPath, $encodedThumb);

        $product->update([
            'image_path' => $mainPath,
            'thumb_path' => $thumbPath,
        ]);

        return [
            'image_path' => $mainPath,
            'thumb_path' => $thumbPath,
        ];
    }

    /**
     * Delete stored image files for a product.
     */
    public function deleteImageFiles(Product $product): void
    {
        if ($product->image_path && Storage::disk('public')->exists($product->image_path)) {
            Storage::disk('public')->delete($product->image_path);
        }

        if ($product->thumb_path && Storage::disk('public')->exists($product->thumb_path)) {
            Storage::disk('public')->delete($product->thumb_path);
        }

        $product->update([
            'image_path' => null,
            'thumb_path' => null,
        ]);
    }
}
