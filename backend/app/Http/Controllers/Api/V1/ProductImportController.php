<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\ProductCsvImportRequest;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductImportController extends Controller
{
    public function import(ProductCsvImportRequest $request): JsonResponse
    {
        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');

        if (! $handle) {
            return response()->json(['message' => 'Unable to read the uploaded CSV file.'], 422);
        }

        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);

            return response()->json(['message' => 'The uploaded file is empty.'], 422);
        }

        // Normalize header keys: trim, lowercase, strip BOM
        $cleanHeaders = array_map(function ($col) {
            $col = preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $col);

            return strtolower(trim($col));
        }, $header);

        $requiredCols = ['sku', 'name', 'category', 'cost_price', 'sell_price'];
        foreach ($requiredCols as $req) {
            if (! in_array($req, $cleanHeaders, true)) {
                fclose($handle);

                return response()->json([
                    'message' => "CSV is missing the required '{$req}' column.",
                ], 422);
            }
        }

        $rowNumber = 1;
        $importedCount = 0;
        $errors = [];
        $rowsToInsert = [];

        $categoryMap = Category::pluck('id', 'name')->toArray();
        $slugMap = Category::pluck('id', 'slug')->toArray();

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle)) !== false) {
                $rowNumber++;

                // Skip empty row
                if (count(array_filter($row)) === 0) {
                    continue;
                }

                $data = @array_combine($cleanHeaders, array_pad($row, count($cleanHeaders), null));
                if (! $data) {
                    $errors[] = ['row' => $rowNumber, 'sku' => null, 'message' => 'Column count does not match header count.'];

                    continue;
                }

                $sku = trim((string) ($data['sku'] ?? ''));
                $name = trim((string) ($data['name'] ?? ''));
                $catName = trim((string) ($data['category'] ?? ''));
                $cost = trim((string) ($data['cost_price'] ?? '0'));
                $sell = trim((string) ($data['sell_price'] ?? '0'));
                $stock = isset($data['stock_qty']) && $data['stock_qty'] !== '' ? (int) $data['stock_qty'] : 0;
                $reorder = isset($data['reorder_level']) && $data['reorder_level'] !== '' ? (int) $data['reorder_level'] : 10;
                $description = isset($data['description']) ? trim((string) $data['description']) : null;

                if (empty($sku)) {
                    $errors[] = ['row' => $rowNumber, 'sku' => null, 'message' => 'SKU is required.'];

                    continue;
                }

                if (empty($name)) {
                    $errors[] = ['row' => $rowNumber, 'sku' => $sku, 'message' => 'Product name is required.'];

                    continue;
                }

                if (! is_numeric($cost) || (float) $cost < 0) {
                    $errors[] = ['row' => $rowNumber, 'sku' => $sku, 'message' => 'Cost price must be a non-negative number.'];

                    continue;
                }

                if (! is_numeric($sell) || (float) $sell < 0) {
                    $errors[] = ['row' => $rowNumber, 'sku' => $sku, 'message' => 'Sell price must be a non-negative number.'];

                    continue;
                }

                if ($stock < 0) {
                    $errors[] = ['row' => $rowNumber, 'sku' => $sku, 'message' => 'Stock quantity cannot be negative.'];

                    continue;
                }

                // Resolve or create category
                $catId = $categoryMap[$catName] ?? ($slugMap[Str::slug($catName)] ?? null);
                if (! $catId) {
                    if (empty($catName)) {
                        $catName = 'Uncategorized';
                    }
                    $newCat = Category::create([
                        'name' => $catName,
                        'slug' => Str::slug($catName).'-'.time(),
                    ]);
                    $catId = $newCat->id;
                    $categoryMap[$catName] = $catId;
                }

                Product::updateOrCreate(
                    ['sku' => $sku],
                    [
                        'name' => $name,
                        'description' => $description,
                        'category_id' => $catId,
                        'cost_price' => (float) $cost,
                        'sell_price' => (float) $sell,
                        'stock_qty' => $stock,
                        'reorder_level' => $reorder,
                        'is_active' => true,
                    ]
                );

                $importedCount++;
            }

            fclose($handle);
            DB::commit();

            return response()->json([
                'message' => "CSV import complete. {$importedCount} products processed.",
                'imported_count' => $importedCount,
                'error_count' => count($errors),
                'errors' => $errors,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            fclose($handle);

            return response()->json([
                'message' => 'Import failed due to an error: '.$e->getMessage(),
            ], 500);
        }
    }

    public function template(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="product_import_template.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['sku', 'name', 'category', 'cost_price', 'sell_price', 'stock_qty', 'reorder_level', 'description']);
            fputcsv($handle, ['SKU-EXAMPLE-01', 'Sample Mechanical Keyboard', 'Keyboards & Mice', '45.00', '79.99', '25', '10', 'RGB backlight with blue switches']);
            fputcsv($handle, ['SKU-EXAMPLE-02', 'USB-C Fast Cable 2M', 'Cables & Power', '4.50', '12.00', '50', '15', 'Nylon braided high speed charging']);
            fclose($handle);
        }, 200, $headers);
    }
}
