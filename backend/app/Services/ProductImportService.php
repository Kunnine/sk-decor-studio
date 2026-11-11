<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Unit;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ProductImportService
{
    /**
     * Preview and validate CSV rows before committing.
     *
     * @return array<string, mixed>
     */
    public function preview(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if (! $handle) {
            throw new RuntimeException('Unable to open uploaded CSV file.');
        }

        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);
            throw new RuntimeException('CSV file is empty or cannot be read.');
        }

        // Clean headers: lowercase and strip BOM
        $header = array_map(function ($col) {
            return strtolower(trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $col)));
        }, $header);

        $requiredCols = ['sku', 'name', 'category', 'cost_price', 'sell_price'];
        foreach ($requiredCols as $req) {
            if (! in_array($req, $header, true)) {
                fclose($handle);
                throw new RuntimeException("Missing required column '{$req}' in CSV header. Required columns are: ".implode(', ', $requiredCols));
            }
        }

        $validRows = [];
        $errors = [];
        $seenSkusInCsv = [];
        $newCategories = [];
        $newUnits = [];
        $duplicateSkusInDb = [];

        $existingCategories = Category::pluck('id', 'name')->mapWithKeys(fn ($id, $name) => [strtolower($name) => $id])->toArray();
        $existingUnits = Unit::pluck('id', 'name')->mapWithKeys(fn ($id, $name) => [strtolower($name) => $id])->toArray();
        $existingUnitsShort = Unit::pluck('id', 'short_name')->mapWithKeys(fn ($id, $short) => [strtolower($short) => $id])->toArray();
        $existingProductSkus = Product::pluck('sku')->map(fn ($s) => strtoupper($s))->flip()->toArray();

        $rowNum = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $rowNum++;

            // Skip blank rows
            if (empty(array_filter($data, fn ($v) => $v !== null && trim($v) !== ''))) {
                continue;
            }

            if (count($data) !== count($header)) {
                $errors[] = [
                    'row' => $rowNum,
                    'sku' => $data[0] ?? null,
                    'message' => 'Row column count mismatch against header.',
                ];

                continue;
            }

            $row = array_combine($header, array_map('trim', $data));

            // Validate SKU
            $sku = strtoupper($row['sku'] ?? '');
            if (empty($sku)) {
                $errors[] = ['row' => $rowNum, 'sku' => '', 'message' => 'SKU is empty.'];

                continue;
            }

            if (isset($seenSkusInCsv[$sku])) {
                $errors[] = ['row' => $rowNum, 'sku' => $sku, 'message' => "Duplicate SKU '{$sku}' found within this CSV file."];

                continue;
            }
            $seenSkusInCsv[$sku] = true;

            // Validate Name
            $name = $row['name'] ?? '';
            if (empty($name)) {
                $errors[] = ['row' => $rowNum, 'sku' => $sku, 'message' => 'Product name is required.'];

                continue;
            }

            // Validate Prices
            $costPrice = isset($row['cost_price']) && is_numeric($row['cost_price']) ? (float) $row['cost_price'] : -1;
            $sellPrice = isset($row['sell_price']) && is_numeric($row['sell_price']) ? (float) $row['sell_price'] : -1;

            if ($costPrice < 0) {
                $errors[] = ['row' => $rowNum, 'sku' => $sku, 'message' => 'Cost price must be a valid non-negative number.'];

                continue;
            }
            if ($sellPrice < 0) {
                $errors[] = ['row' => $rowNum, 'sku' => $sku, 'message' => 'Sell price must be a valid non-negative number.'];

                continue;
            }

            // Category & Unit tracking
            $categoryName = trim($row['category'] ?? '');
            if (empty($categoryName)) {
                $errors[] = ['row' => $rowNum, 'sku' => $sku, 'message' => 'Category is required.'];

                continue;
            }

            $catLower = strtolower($categoryName);
            if (! isset($existingCategories[$catLower])) {
                $newCategories[$categoryName] = true;
            }

            $unitName = trim($row['unit'] ?? '');
            if (! empty($unitName)) {
                $unitLower = strtolower($unitName);
                if (! isset($existingUnits[$unitLower]) && ! isset($existingUnitsShort[$unitLower])) {
                    $newUnits[$unitName] = true;
                }
            }

            if (isset($existingProductSkus[$sku])) {
                $duplicateSkusInDb[$sku] = true;
            }

            $stockQty = isset($row['stock_qty']) && is_numeric($row['stock_qty']) ? max(0, (int) $row['stock_qty']) : 0;
            $reorderLevel = isset($row['reorder_level']) && is_numeric($row['reorder_level']) ? max(0, (int) $row['reorder_level']) : 10;

            $validRows[] = [
                'sku' => $sku,
                'name' => $name,
                'description' => $row['description'] ?? null,
                'category_name' => $categoryName,
                'unit_name' => $unitName ?: null,
                'supplier_name' => ! empty($row['supplier']) ? trim($row['supplier']) : null,
                'color' => ! empty($row['color']) ? trim($row['color']) : null,
                'size' => ! empty($row['size']) ? trim($row['size']) : null,
                'material' => ! empty($row['material']) ? trim($row['material']) : null,
                'style' => ! empty($row['style']) ? trim($row['style']) : null,
                'cost_price' => $costPrice,
                'sell_price' => $sellPrice,
                'stock_qty' => $stockQty,
                'reorder_level' => $reorderLevel,
            ];
        }

        fclose($handle);

        $token = 'import_'.Str::random(32);
        Cache::put("csv_import_{$token}", $validRows, now()->addHours(2));

        return [
            'preview_token' => $token,
            'total_rows' => count($validRows) + count($errors),
            'valid_rows_count' => count($validRows),
            'error_count' => count($errors),
            'errors' => $errors,
            'new_categories' => array_keys($newCategories),
            'new_units' => array_keys($newUnits),
            'duplicate_skus' => array_keys($duplicateSkusInDb),
            'sample_rows' => array_slice($validRows, 0, 5),
        ];
    }

    /**
     * Commit validated rows into the database inside a transaction.
     *
     * @param  array{create_missing_categories?: bool, create_missing_units?: bool, duplicate_sku_action?: string}  $options
     * @return array<string, mixed>
     */
    public function commit(string $token, array $options = []): array
    {
        $cacheKey = "csv_import_{$token}";
        $rows = Cache::get($cacheKey);

        if (! is_array($rows)) {
            throw new RuntimeException('Import session has expired or is invalid. Please upload the CSV file again.');
        }

        $createMissingCategories = $options['create_missing_categories'] ?? true;
        $createMissingUnits = $options['create_missing_units'] ?? true;
        $duplicateAction = $options['duplicate_sku_action'] ?? 'skip'; // 'skip' | 'update'

        $importedCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use (
            $rows,
            $createMissingCategories,
            $createMissingUnits,
            $duplicateAction,
            &$importedCount,
            &$updatedCount,
            &$skippedCount
        ) {
            foreach ($rows as $row) {
                // 1. Resolve Category (supports both "Subcategory" and "Parent > Subcategory")
                $catName = $row['category_name'];
                $category = null;
                if (str_contains($catName, '>')) {
                    [$parentPart, $childPart] = array_map('trim', explode('>', $catName, 2));
                    $parentCat = Category::whereNull('parent_id')->whereRaw('LOWER(name) = ?', [strtolower($parentPart)])->first();
                    if ($parentCat && $childPart !== '') {
                        $category = Category::where('parent_id', $parentCat->id)->whereRaw('LOWER(name) = ?', [strtolower($childPart)])->first();
                    }
                }
                if (! $category) {
                    $category = Category::whereRaw('LOWER(name) = ?', [strtolower($catName)])->first();
                }

                if (! $category) {
                    if ($createMissingCategories) {
                        $cleanName = str_contains($catName, '>') ? trim(explode('>', $catName, 2)[1]) : $catName;
                        $category = Category::create([
                            'name' => $cleanName,
                            'slug' => Str::slug($cleanName).'-'.Str::random(4),
                        ]);
                    } else {
                        $skippedCount++;

                        continue;
                    }
                }

                // 2. Resolve Unit
                $unit = null;
                if (! empty($row['unit_name'])) {
                    $uName = $row['unit_name'];
                    $unit = Unit::whereRaw('LOWER(name) = ? OR LOWER(short_name) = ?', [strtolower($uName), strtolower($uName)])->first();

                    if (! $unit && $createMissingUnits) {
                        $unit = Unit::create([
                            'name' => $uName,
                            'short_name' => substr($uName, 0, 8),
                        ]);
                    }
                }

                // Optional Supplier lookup
                $supplier = null;
                if (! empty($row['supplier_name'])) {
                    $supplier = Supplier::whereRaw('LOWER(name) = ?', [strtolower($row['supplier_name'])])->first();
                }

                // 3. Handle Product
                $existing = Product::where('sku', $row['sku'])->first();

                if ($existing) {
                    if ($duplicateAction === 'update') {
                        $existing->update([
                            'name' => $row['name'],
                            'description' => $row['description'] ?? $existing->description,
                            'category_id' => $category->id,
                            'unit_id' => $unit?->id ?? $existing->unit_id,
                            'supplier_id' => $supplier?->id ?? $existing->supplier_id,
                            'color' => $row['color'] ?? $existing->color,
                            'size' => $row['size'] ?? $existing->size,
                            'material' => $row['material'] ?? $existing->material,
                            'style' => $row['style'] ?? $existing->style,
                            'cost_price' => $row['cost_price'],
                            'sell_price' => $row['sell_price'],
                            'reorder_level' => $row['reorder_level'],
                        ]);
                        $updatedCount++;
                    } else {
                        $skippedCount++;
                    }
                } else {
                    Product::create([
                        'sku' => $row['sku'],
                        'name' => $row['name'],
                        'description' => $row['description'],
                        'category_id' => $category->id,
                        'unit_id' => $unit?->id,
                        'supplier_id' => $supplier?->id,
                        'color' => $row['color'] ?? null,
                        'size' => $row['size'] ?? null,
                        'material' => $row['material'] ?? null,
                        'style' => $row['style'] ?? null,
                        'cost_price' => $row['cost_price'],
                        'sell_price' => $row['sell_price'],
                        'stock_qty' => $row['stock_qty'],
                        'reorder_level' => $row['reorder_level'],
                        'is_active' => true,
                    ]);
                    $importedCount++;
                }
            }
        });

        Cache::forget($cacheKey);

        return [
            'imported_count' => $importedCount,
            'updated_count' => $updatedCount,
            'skipped_count' => $skippedCount,
            'message' => "Import complete: {$importedCount} created, {$updatedCount} updated, {$skippedCount} skipped.",
        ];
    }

    /**
     * Generate sample CSV template.
     */
    public function getTemplateCsv(): string
    {
        $headers = ['sku', 'name', 'description', 'category', 'unit', 'cost_price', 'sell_price', 'stock_qty', 'reorder_level', 'supplier', 'color', 'size', 'material', 'style'];
        $sampleRows = [
            ['LMP-MOD-TBL', 'Modern LED Table Lamp', 'Warm dimmable LED table lamp with brushed metal base', 'Table Lamps', 'Piece', '42.00', '89.00', '20', '5', 'Lumiere Lighting Studio', 'Black', 'Medium', 'Metal', 'Modern'],
            ['WAL-MIN-ART', 'Minimalist Wall Art', 'Textured abstract canvas wall art framed in oak', 'Wall Art', 'Piece', '45.00', '95.00', '14', '4', 'Nordic Home Atelier', 'Beige', 'Large', 'Fabric', 'Minimalist'],
            ['VAS-CER-DEC', 'Ceramic Decorative Vase', 'Matte handcrafted stoneware flower vase', 'Ceramic Vases', 'Piece', '24.00', '54.00', '18', '5', 'Botanica & Clay Living', 'White', 'Medium', 'Ceramic', 'Nordic'],
        ];

        $output = fopen('php://temp', 'r+');
        fputcsv($output, $headers);
        foreach ($sampleRows as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return $csvContent;
    }
}
