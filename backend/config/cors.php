<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_filter(array_merge(
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')),
        [
            env('FRONTEND_URL', 'http://localhost:5173'),
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
        ]
    )))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['X-Request-Id', 'Content-Disposition'],

    'max_age' => 0,

    'supports_credentials' => true,
];
