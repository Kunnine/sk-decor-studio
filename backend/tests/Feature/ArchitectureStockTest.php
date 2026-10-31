<?php

test('architecture: stock_qty is never directly assigned or mutated outside StockService', function () {
    $controllersDir = app_path('Http/Controllers');
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($controllersDir));

    $violations = [];

    foreach ($files as $file) {
        if ($file->isDir() || $file->getExtension() !== 'php') {
            continue;
        }

        $content = file_get_contents($file->getRealPath());

        // Check for direct mutations like $product->stock_qty = or ->increment('stock_qty') or ->decrement('stock_qty')
        if (preg_match('/(->stock_qty\s*=|->increment\(\s*[\'"]stock_qty[\'"]|->decrement\(\s*[\'"]stock_qty[\'"])/', $content)) {
            $violations[] = $file->getFilename();
        }
    }

    expect($violations)->toBeEmpty(
        'Direct modification of stock_qty detected in controllers: '.implode(', ', $violations).
        '. All stock changes must go through App\Services\StockService.'
    );
});
