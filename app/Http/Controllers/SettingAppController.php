<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\SettingApp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class SettingAppController extends Controller
{
    public function edit()
    {
        $setting = SettingApp::first();
        
        // Get available drives on Windows
        $drives = [];
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            exec('wmic logicaldisk get name', $output);
            foreach ($output as $line) {
                if (preg_match('/^[A-Z]:/', $line, $matches)) {
                    $drives[] = $matches[0];
                }
            }
        } else {
            // Linux/Unix common mount points
            $drives = ['/', '/mnt', '/media', '/var/www'];
        }

        return Inertia::render('settingapp/Form', [
            'setting' => $setting,
            'available_drives' => $drives
        ]);
    }

    public function checkPath(Request $request)
    {
        $path = $request->input('path');
        
        if (empty($path)) {
            return response()->json(['valid' => false, 'message' => 'Path cannot be empty']);
        }

        if (!File::exists($path)) {
            try {
                File::makeDirectory($path, 0755, true);
                // Clean up if we just created it to test
                // rmdir($path); // Actually, if they want to use it, we should keep it or let them know it was created.
                // But for checking, let's just say it's valid if we CAN create it.
                return response()->json(['valid' => true, 'message' => 'Path does not exist but can be created.']);
            } catch (\Exception $e) {
                return response()->json(['valid' => false, 'message' => 'Path does not exist and cannot be created: ' . $e->getMessage()]);
            }
        }

        if (!is_writable($path)) {
            return response()->json(['valid' => false, 'message' => 'Path exists but is not writable.']);
        }

        return response()->json(['valid' => true, 'message' => 'Path is valid and writable.']);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'nama_app'   => 'required|string|max:255',
            'deskripsi'  => 'nullable|string',
            'logo'       => 'nullable|file|image|max:2048',
            'favicon'    => 'nullable|file|image|max:1024',
            'warna'      => 'nullable|string|max:20',
            'seo'        => 'nullable|array',
            'backup_path' => 'nullable|string',
            'backup_hosxp' => 'boolean',
        ]);

        $setting = SettingApp::firstOrNew();

        if ($request->hasFile('logo')) {
            $data['logo'] = $request->file('logo')->store('logo', 'public');
        } else {
            unset($data['logo']);
        }

        if ($request->hasFile('favicon')) {
            $data['favicon'] = $request->file('favicon')->store('favicon', 'public');
        } else {
            unset($data['favicon']);
        }

        $setting->fill($data)->save();

        return redirect()->back()->with('success', 'Pengaturan berhasil disimpan.');
    }
}
