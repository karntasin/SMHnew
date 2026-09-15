<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ClearEnvSp3UnlockOutside
{
    /**
     * เคลียร์สิทธิ์ปลดล็อก สป.3 เมื่อออกจากหน้า/เส้นทางที่เกี่ยวข้อง
     * เพื่อบังคับใส่รหัสทุกครั้งที่กลับเข้ามาดูใหม่
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $routeName = $request->route()?->getName();
        $sessionKey = (string) config('env_utility.sp3_session_key', 'env_utility_sp3_unlocked');

        if ($routeName && ! $this->isSp3RelatedRoute($routeName) && $request->session()->get($sessionKey)) {
            $request->session()->forget($sessionKey);
        }

        return $next($request);
    }

    private function isSp3RelatedRoute(string $routeName): bool
    {
        return in_array($routeName, [
            'env.utilities.sp3',
            'env.utilities.sp3.unlock',
            'env.utilities.sp3.lock',
            'env.utilities.sp3.pdf',
            // บันทึก/ลบรายการจากหน้า สป.3 ที่ปลดล็อกแล้ว
            'env.utilities.entries.store',
            'env.utilities.entries.destroy',
        ], true);
    }
}
