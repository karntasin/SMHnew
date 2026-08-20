import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Mail, Lock, Eye, EyeOff, Sparkles, LogIn } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import LineLoginButton from '@/components/line-login-button';
import LineQrLogin from '@/components/line-qr-login';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    lineLoginEnabled?: boolean;
    lineQr?: { ticket: string; scanUrl: string } | null;
}

export default function Login({ status, canResetPassword, lineLoginEnabled, lineQr }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="ยินดีต้อนรับกลับมา" description="เข้าสู่ระบบเพื่อใช้งานระบบจัดการโรงพยาบาล">
            <Head title="เข้าสู่ระบบ" />

            {status && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-center text-sm font-medium text-green-600 dark:text-green-400 animate-fadeIn">
                    <Sparkles className="inline w-4 h-4 mr-1" />
                    {status}
                </div>
            )}

            <form className="flex flex-col gap-5" onSubmit={submit}>
                {lineLoginEnabled && (
                    <>
                        {lineQr?.scanUrl && <LineQrLogin scanUrl={lineQr.scanUrl} />}
                        <LineLoginButton intent="login" label="หรือเข้าด้วยอีเมล/บัญชี LINE บนเครื่องนี้" />
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                            หรือเข้าด้วยอีเมล
                            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </>
                )}
                <div className="grid gap-5">
                    {/* Email Field */}
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                            <Mail className="w-4 h-4 text-blue-500" />
                            อีเมล
                        </Label>
                        <div className="relative group">
                            <Input
                                id="email"
                                type="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="กรอกอีเมลของคุณ"
                                className={`pl-4 pr-4 py-3 h-12 rounded-xl border-2 transition-all duration-300 bg-white dark:bg-gray-800 ${
                                    focusedField === 'email' 
                                        ? 'border-blue-500 ring-4 ring-blue-500/20' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                } ${errors.email ? 'border-red-500 ring-4 ring-red-500/20' : ''}`}
                            />
                        </div>
                        <InputError message={errors.email} />
                    </div>

                    {/* Password Field */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                                <Lock className="w-4 h-4 text-purple-500" />
                                รหัสผ่าน
                            </Label>
                            {canResetPassword && (
                                <TextLink href={route('password.request')} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium" tabIndex={5}>
                                    ลืมรหัสผ่าน?
                                </TextLink>
                            )}
                        </div>
                        <div className="relative group">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="กรอกรหัสผ่านของคุณ"
                                className={`pl-4 pr-12 py-3 h-12 rounded-xl border-2 transition-all duration-300 bg-white dark:bg-gray-800 ${
                                    focusedField === 'password' 
                                        ? 'border-purple-500 ring-4 ring-purple-500/20' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                } ${errors.password ? 'border-red-500 ring-4 ring-red-500/20' : ''}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <InputError message={errors.password} />
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                        <Checkbox 
                            id="remember" 
                            name="remember" 
                            tabIndex={3}
                            checked={data.remember}
                            onCheckedChange={(checked) => setData('remember', checked as boolean)}
                            className="border-2 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <Label htmlFor="remember" className="text-gray-600 dark:text-gray-400 cursor-pointer">
                            จดจำการเข้าสู่ระบบ
                        </Label>
                    </div>

                    {/* Login Button */}
                    <Button 
                        type="submit" 
                        className="mt-2 w-full h-12 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-800 hover:to-purple-800 text-white font-semibold shadow-lg shadow-purple-700/30 hover:shadow-purple-700/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]" 
                        tabIndex={4} 
                        disabled={processing}
                    >
                        {processing ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <LogIn className="w-5 h-5 mr-2" />
                                เข้าสู่ระบบ
                            </>
                        )}
                    </Button>
                </div>

                {/* Sign up Link */}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                    ยังไม่มีบัญชี?{' '}
                    <TextLink href={route('register')} tabIndex={5} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold hover:underline">
                        สมัครสมาชิก
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
