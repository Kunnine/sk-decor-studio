<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\PurchaseController;
use App\Http\Controllers\Api\V1\SaleController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\StockAdjustmentController;
use App\Http\Controllers\Api\V1\StockMovementController;
use App\Http\Controllers\Api\V1\SupplierController;
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

        // Settings (Admin only)
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

        // Suppliers
        Route::apiResource('suppliers', SupplierController::class);

        // Purchases (receive before apiResource)
        Route::post('/purchases/{purchase}/receive', [PurchaseController::class, 'receive']);
        Route::apiResource('purchases', PurchaseController::class);

        // Stock tracking & manual adjustments
        Route::get('/stock-movements', [StockMovementController::class, 'index']);
        Route::post('/stock-adjustments', [StockAdjustmentController::class, 'store']);

        // Customers (search before apiResource)
        Route::get('/customers/search', [CustomerController::class, 'search']);
        Route::apiResource('customers', CustomerController::class);

        // Products special endpoints (must precede apiResource)
        Route::get('/products/pos-search', [ProductController::class, 'posSearch']);
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

        // Sales (void endpoint before or after show)
        Route::post('/sales/{sale}/void', [SaleController::class, 'void']);
        Route::apiResource('sales', SaleController::class)->only(['index', 'store', 'show']);

        // Invoices
        Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
    });
});
