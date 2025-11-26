<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use App\Models\SettingApp;
use Inertia\Inertia;
use ZipArchive;

class BackupController extends Controller
{
    // protected string $backupPath = 'private/Laravel'; // Removed hardcoded path

    private function getBackupPathAndConfigure()
    {
        $setting = SettingApp::first();
        $appName = config('backup.backup.name');
        
        if ($setting && $setting->backup_path) {
            $customPath = $setting->backup_path;
            
            // Configure dynamic disk
            Config::set('filesystems.disks.custom_backup', [
                'driver' => 'local',
                'root' => $customPath,
                'throw' => false,
            ]);

            // Set backup destination to this disk
            Config::set('backup.backup.destination.disks', ['custom_backup']);
            
            // Ensure the directory exists
            if (!File::exists($customPath . '/' . $appName)) {
                File::makeDirectory($customPath . '/' . $appName, 0755, true);
            }
            
            // Configure HOSXP backup if enabled
            if ($setting->backup_hosxp) {
                $databases = Config::get('backup.backup.source.databases');
                if (!in_array('hosxp', $databases)) {
                    $databases[] = 'hosxp';
                    Config::set('backup.backup.source.databases', $databases);
                }
            }

            return $customPath . '/' . $appName;
        }

        // Configure HOSXP backup if enabled (even for default path)
        if ($setting && $setting->backup_hosxp) {
            $databases = Config::get('backup.backup.source.databases');
            if (!in_array('hosxp', $databases)) {
                $databases[] = 'hosxp';
                Config::set('backup.backup.source.databases', $databases);
            }
        }

        // Default path: storage/app/private/{APP_NAME}
        // The 'local' disk root is storage_path('app/private')
        // The backup package appends the app name.
        $defaultPath = storage_path('app/private/' . $appName);
        
        if (!File::exists($defaultPath)) {
            File::makeDirectory($defaultPath, 0755, true);
        }
        return $defaultPath;
    }

    public function index()
    {
        $realPath = $this->getBackupPathAndConfigure();

        $files = File::files($realPath);

        $backups = collect($files)
            ->filter(fn($file) => $file->getExtension() === 'zip')
            ->map(fn($file) => [
                'name' => $file->getFilename(),
                'size' => $file->getSize(),
                'last_modified' => $file->getMTime(),
                'download_url' => route('backup.download', ['file' => $file->getFilename()]),
            ])
            ->sortByDesc('last_modified')
            ->values();

        return Inertia::render('backup/Index', [
            'backups' => $backups,
        ]);
    }

    public function run(Request $request)
    {
        $this->getBackupPathAndConfigure(); // Configure before running artisan
        
        $option = $request->input('option', 'only-db');
        
        try {
            if ($option === 'full') {
                Artisan::call('backup:run');
            } else {
                Artisan::call('backup:run --only-db');
            }
            
            return redirect()->back()->with('success', 'Backup created successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Backup failed: ' . $e->getMessage());
        }
    }

    public function upload(Request $request)
    {
        $request->validate([
            'backup_file' => 'required|file|mimes:zip',
        ]);

        $realPath = $this->getBackupPathAndConfigure();
        $file = $request->file('backup_file');
        $filename = $file->getClientOriginalName();
        
        // Ensure unique filename
        if (File::exists($realPath . '/' . $filename)) {
            $filename = pathinfo($filename, PATHINFO_FILENAME) . '_' . time() . '.' . $file->getClientOriginalExtension();
        }

        $file->move($realPath, $filename);

        return redirect()->back()->with('success', 'Backup uploaded successfully.');
    }

    public function restore($file)
    {
        $realPath = $this->getBackupPathAndConfigure();
        $path = $realPath . '/' . $file;

        if (!file_exists($path)) {
            return redirect()->back()->with('error', 'Backup file not found.');
        }

        $tempPath = storage_path('app/backup-temp/' . time());
        File::makeDirectory($tempPath, 0755, true);

        $zip = new ZipArchive;
        if ($zip->open($path) === TRUE) {
            $zip->extractTo($tempPath);
            $zip->close();

            // Find SQL dump
            $dbDumpsPath = $tempPath . '/db-dumps';
            $sqlFile = null;

            if (File::exists($dbDumpsPath)) {
                $files = File::files($dbDumpsPath);
                foreach ($files as $f) {
                    if ($f->getExtension() === 'sql') {
                        $sqlFile = $f->getPathname();
                        break;
                    }
                }
            }

            if ($sqlFile) {
                try {
                    // Disable foreign key checks
                    DB::statement('SET FOREIGN_KEY_CHECKS=0;');
                    
                    // Restore DB
                    // Method 1: DB::unprepared (Simple, but memory intensive)
                    // DB::unprepared(File::get($sqlFile));

                    // Method 2: MySQL Command (Better for large files)
                    $dbConfig = config('database.connections.mysql');
                    $command = sprintf(
                        'mysql --user=%s --password=%s --host=%s --port=%s %s < %s',
                        escapeshellarg($dbConfig['username']),
                        escapeshellarg($dbConfig['password']),
                        escapeshellarg($dbConfig['host']),
                        escapeshellarg($dbConfig['port']),
                        escapeshellarg($dbConfig['database']),
                        escapeshellarg($sqlFile)
                    );
                    
                    // Execute command
                    exec($command, $output, $returnVar);
                    
                    if ($returnVar !== 0) {
                        // Fallback to DB::unprepared if exec fails (e.g. mysql not in path)
                        DB::unprepared(File::get($sqlFile));
                    }

                    DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                    
                    // Cleanup
                    File::deleteDirectory($tempPath);

                    return redirect()->back()->with('success', 'Database restored successfully.');
                } catch (\Exception $e) {
                    File::deleteDirectory($tempPath);
                    return redirect()->back()->with('error', 'Restore failed: ' . $e->getMessage());
                }
            } else {
                File::deleteDirectory($tempPath);
                return redirect()->back()->with('error', 'No SQL dump found in backup.');
            }
        } else {
            return redirect()->back()->with('error', 'Failed to open backup zip.');
        }
    }

    public function download($file)
    {
        $realPath = $this->getBackupPathAndConfigure();
        $path = $realPath . '/' . $file;

        if (!file_exists($path)) {
            abort(404, 'File not found.');
        }

        return response()->download($path);
    }

    public function delete($file)
    {
        $realPath = $this->getBackupPathAndConfigure();
        $path = $realPath . '/' . $file;

        if (!file_exists($path)) {
            return redirect()->back()->with('error', 'File not found.');
        }

        unlink($path);

        return redirect()->back()->with('success', 'Backup deleted successfully.');
    }
}
