<?php

$rawFrontendUrl = (string) env('FRONTEND_URL', '');
$normalizedFrontend = $rawFrontendUrl !== ''
    ? (str_starts_with($rawFrontendUrl, 'http://') || str_starts_with($rawFrontendUrl, 'https://')
        ? $rawFrontendUrl
        : 'https://' . $rawFrontendUrl)
    : null;

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_filter(array_merge(
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')),
        array_filter([
            $normalizedFrontend,
            env('FRONTEND_URL'),
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
        ])
    )))),

    'allowed_origins_patterns' => [
        '#^https?://.*\.onrender\.com$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['X-Request-Id', 'Content-Disposition'],

    'max_age' => 0,

    'supports_credentials' => true,
];
