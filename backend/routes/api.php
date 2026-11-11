<?php

use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\PurchaseController;
use App\Http\Controllers\Api\V1\ReportController;
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
    Route::post('/login', [AuthController::class, 'login'])->name('login');
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login']);
    });

    // Public signed PDF routes
    Route::get('/reports/sales-summary/pdf', [ReportController::class, 'salesSummaryPdf'])->name('reports.sales-summary.pdf');
    Route::get('/reports/inventory-valuation/pdf', [ReportController::class, 'inventoryValuationPdf'])->name('reports.inventory-valuation.pdf');

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/me/preferences', [AuthController::class, 'updatePreferences']);
        Route::prefix('auth')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
        });

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

        // Analytics (Admin & Manager only)
        Route::prefix('analytics')->group(function () {
            Route::get('/summary', [AnalyticsController::class, 'summary']);
            Route::get('/sales-trend', [AnalyticsController::class, 'salesTrend']);
            Route::get('/top-products', [AnalyticsController::class, 'topProducts']);
            Route::get('/sales-by-category', [AnalyticsController::class, 'salesByCategory']);
            Route::get('/valuation', [AnalyticsController::class, 'valuation']);
            Route::get('/payment-methods', [AnalyticsController::class, 'paymentMethods']);
            Route::get('/cashiers', [AnalyticsController::class, 'cashiers']);
        });

        // Reports & Exports (Admin & Manager only, with rate limiting on exports)
        Route::prefix('reports')->middleware('throttle:60,1')->group(function () {
            Route::get('/sales-summary', [ReportController::class, 'salesSummary']);
            Route::get('/sales-by-product', [ReportController::class, 'salesByProduct']);
            Route::get('/sales-by-category', [ReportController::class, 'salesByCategory']);
            Route::get('/purchases-by-supplier', [ReportController::class, 'purchasesBySupplier']);
            Route::get('/stock-movements', [ReportController::class, 'stockMovements']);
            Route::get('/inventory-valuation', [ReportController::class, 'inventoryValuation']);
            Route::get('/low-stock', [ReportController::class, 'lowStock']);
            Route::post('/signed-pdf-url', [ReportController::class, 'signedPdfUrl']);
        });

        // Audit Logs (Admin only)
        Route::get('/audit-logs', [AuditLogController::class, 'index']);

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
        Route::get('/products/pos/search', [ProductController::class, 'posSearch']);
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
