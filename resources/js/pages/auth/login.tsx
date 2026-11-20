import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Mail, Lock, Eye, EyeOff, Sparkles, LogIn, Mic, ScanFace, Fingerprint } from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';
import { isPlatformBiometricAvailable } from '@/lib/webauthn-client';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import LineLoginButton from '@/components/line-login-button';
import LineQrLogin from '@/components/line-qr-login';
import VoiceLoginModal from '@/components/voice/voice-login-modal';
import FaceLoginModal from '@/components/face/face-login-modal';
import { RunningMascotLoader } from '@/components/auth/running-mascot-loader';
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
    lineQr?: { ticket: string; scanUrl: string; popupUrl?: string } | null;
}

export default function Login({ status, canResetPassword, lineLoginEnabled, lineQr }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [showFaceModal, setShowFaceModal] = useState(false);
    const [biometricBtnText, setBiometricBtnText] = useState('สแกนใบหน้า / ลายนิ้วมือ');

    useEffect(() => {
        isPlatformBiometricAvailable().then((res) => {
            if (res.supported) {
                if (res.deviceType === 'apple') {
                    setBiometricBtnText('Apple Face ID / สแกนนิ้ว');
                } else if (res.deviceType === 'android') {
                    setBiometricBtnText('สแกนนิ้วมือ / ใบหน้า (Android)');
                } else if (res.deviceType === 'windows') {
                    setBiometricBtnText('Windows Hello / สแกนนิ้ว');
                }
            }
        });
    }, []);

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
                    <div className="flex flex-col gap-3">
                        {lineQr?.scanUrl && (
                            <LineQrLogin
                                scanUrl={lineQr.scanUrl}
                                popupUrl={lineQr.popupUrl}
                                label="เข้าสู่ระบบด้วย LINE"
                            />
                        )}
                        <LineLoginButton intent="login" label="เปิด LINE บนเครื่องนี้" />
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                            หรือใช้บัญชี
                            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                )}
                <div className="grid gap-5">
                    {/* Email / username Field */}
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                            <Mail className="w-4 h-4 text-blue-500" />
                            อีเมลหรือชื่อผู้ใช้
                        </Label>
                        <div className="relative group">
                            <Input
                                id="email"
                                type="text"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="username"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="อีเมลหรือชื่อผู้ใช้"
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

                    {/* Biometric Logins: Face/Fingerprint Login & Voice Login */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowFaceModal(true)}
                            className="h-11 rounded-xl border-2 border-blue-200 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
                                <Fingerprint className="w-4 h-4" />
                            </div>
                            {biometricBtnText}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowVoiceModal(true)}
                            className="h-11 rounded-xl border-2 border-purple-200 dark:border-purple-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            <div className="p-1 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400">
                                <Mic className="w-4 h-4" />
                            </div>
                            เข้าสู่ระบบด้วยเสียง
                        </Button>
                    </div>
                </div>

                <VoiceLoginModal
                    open={showVoiceModal}
                    onOpenChange={setShowVoiceModal}
                    defaultIdentifier={data.email}
                />

                <FaceLoginModal
                    open={showFaceModal}
                    onOpenChange={setShowFaceModal}
                    defaultIdentifier={data.email}
                />

                <RunningMascotLoader
                    open={processing}
                    title="กำลังเข้าสู่ระบบ..."
                    subtitle="ระบบกำลังตรวจสอบบัญชีและเตรียมความพร้อม กรุณารอสักครู่"
                    status="loading"
                />

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
