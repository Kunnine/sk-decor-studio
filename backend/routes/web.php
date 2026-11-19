<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (file_exists(public_path('index.html'))) {
        return response()->file(public_path('index.html'));
    }
    return view('welcome');
});

// Catch-all route to support client-side React SPA routing in fullstack container deployments
Route::fallback(function (Request $request) {
    if ($request->is('api/*')) {
        abort(404);
    }
    if (file_exists(public_path('index.html'))) {
        return response()->file(public_path('index.html'));
    }
    return response()->view('welcome', [], 200);
});

