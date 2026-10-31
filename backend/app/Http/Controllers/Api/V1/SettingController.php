<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Setting\LogoUploadRequest;
use App\Http\Requests\Setting\SettingUpdateRequest;
use App\Models\Setting;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(Request $request, SettingService $settingService): JsonResponse
    {
        $this->authorize('viewAny', Setting::class);

        return response()->json([
            'data' => $settingService->all(),
        ]);
    }

    public function update(SettingUpdateRequest $request, SettingService $settingService): JsonResponse
    {
        $this->authorize('update', Setting::class);

        $updated = $settingService->setMany($request->validated());

        return response()->json([
            'message' => 'Settings updated successfully',
            'data' => $updated,
        ]);
    }

    public function uploadLogo(LogoUploadRequest $request, SettingService $settingService): JsonResponse
    {
        $this->authorize('update', Setting::class);

        $updated = $settingService->uploadLogo($request->file('logo'));

        return response()->json([
            'message' => 'Logo uploaded successfully',
            'data' => $updated,
        ]);
    }
}
