<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Auth routes (supports both /login and /auth/login)
    Route::post('/login', [AuthController::class, 'login']);
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
    });

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::prefix('auth')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
        });

        // Settings
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
        Route::post('/settings/logo', [SettingController::class, 'uploadLogo']);

        // Users (Admin only)
        Route::patch('/users/{user}/toggle-active', [UserController::class, 'toggleActive']);
        Route::apiResource('users', UserController::class);

        // Units
        Route::apiResource('units', UnitController::class);

        // Categories (tree & move precede resource to avoid parameter collisions)
        Route::get('/categories/tree', [CategoryController::class, 'tree']);
        Route::post('/categories/{category}/move', [CategoryController::class, 'move']);
        Route::apiResource('categories', CategoryController::class);

        // Products special endpoints
        Route::get('/products/import/template', [ProductController::class, 'importTemplate']);
        Route::get('/products/csv-template', [ProductController::class, 'importTemplate']);
        Route::post('/products/import/preview', [ProductController::class, 'importPreview']);
        Route::post('/products/import', [ProductController::class, 'importCommit']);
        Route::get('/products/low-stock', [ProductController::class, 'lowStock']);
        Route::post('/products/{product}/image', [ProductController::class, 'uploadImage']);
        Route::delete('/products/{product}/image', [ProductController::class, 'deleteImage']);
        Route::patch('/products/{product}/toggle-active', [ProductController::class, 'toggleActive']);

        // Products CRUD
        Route::apiResource('products', ProductController::class);
    });
});
