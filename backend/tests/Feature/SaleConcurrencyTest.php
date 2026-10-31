<?php

use Symfony\Component\Process\Process;

test('concurrency: selling the last unit twice simultaneously permits exactly one sale and prevents overselling', function () {
    $env = [
        'DB_CONNECTION' => 'mysql',
        'DB_DATABASE' => 'inventory_system',
    ];

    $process = new Process([PHP_BINARY, 'artisan', 'test:concurrency', '--runs=1'], base_path(), $env);
    $process->run();

    expect($process->isSuccessful())->toBeTrue();
    expect($process->getOutput())->toContain('Exactly 1 sold, 1 rejected, stock = 0, no overselling');
});
