import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, User, Mail, Lock, Eye, EyeOff, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import { FormEventHandler, useState, useMemo } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface RegisterForm {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Password strength checker
    const passwordStrength = useMemo(() => {
        const password = data.password;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
        };
        const score = Object.values(checks).filter(Boolean).length;
        return { checks, score };
    }, [data.password]);

    const getStrengthColor = () => {
        if (passwordStrength.score <= 1) return 'bg-red-500';
        if (passwordStrength.score === 2) return 'bg-orange-500';
        if (passwordStrength.score === 3) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStrengthText = () => {
        if (passwordStrength.score <= 1) return 'อ่อนมาก';
        if (passwordStrength.score === 2) return 'อ่อน';
        if (passwordStrength.score === 3) return 'ปานกลาง';
        return 'แข็งแรง';
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout title="สร้างบัญชีใหม่" description="กรอกข้อมูลด้านล่างเพื่อสมัครสมาชิก">
            <Head title="สมัครสมาชิก" />
            <form className="flex flex-col gap-5" onSubmit={submit}>
                <div className="grid gap-5">
                    {/* Name Field */}
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            ชื่อ-นามสกุล
                        </Label>
                        <div className="relative">
                            <Input
                                id="name"
                                type="text"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => setFocusedField(null)}
                                disabled={processing}
                                placeholder="กรอกชื่อ-นามสกุลของคุณ"
                                className={`pl-4 pr-4 py-3 h-12 rounded-xl border-2 transition-all duration-300 bg-white dark:bg-gray-800 ${
                                    focusedField === 'name' 
                                        ? 'border-blue-500 ring-4 ring-blue-500/20' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                } ${errors.name ? 'border-red-500 ring-4 ring-red-500/20' : ''}`}
                            />
                        </div>
                        <InputError message={errors.name} className="mt-1" />
                    </div>

                    {/* Email Field */}
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                            <Mail className="w-4 h-4 text-purple-500" />
                            อีเมล
                        </Label>
                        <div className="relative">
                            <Input
                                id="email"
                                type="email"
                                required
                                tabIndex={2}
                                autoComplete="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                                disabled={processing}
                                placeholder="กรอกอีเมลของคุณ"
                                className={`pl-4 pr-4 py-3 h-12 rounded-xl border-2 transition-all duration-300 bg-white dark:bg-gray-800 ${
                                    focusedField === 'email' 
                                        ? 'border-purple-500 ring-4 ring-purple-500/20' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                } ${errors.email ? 'border-red-500 ring-4 ring-red-500/20' : ''}`}
                            />
                        </div>
                        <InputError message={errors.email} />
                    </div>

                    {/* Password Field */}
                    <div className="grid gap-2">
                        <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                            <Lock className="w-4 h-4 text-green-500" />
                            รหัสผ่าน
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                tabIndex={3}
                                autoComplete="new-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                disabled={processing}
                                placeholder="สร้างรหัสผ่าน"
                                className={`pl-4 pr-12 py-3 h-12 rounded-xl border-2 transition-all duration-300 bg-white dark:bg-gray-800 ${
                                    focusedField === 'password' 
                                        ? 'border-green-500 ring-4 ring-green-500/20' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
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
                        
                        {/* Password Strength Indicator */}
                        {data.password && (
                            <div className="space-y-2 mt-1 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg animate-fadeIn">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">ความแข็งแรงรหัสผ่าน</span>
                                    <span className={`font-medium ${
                                        passwordStrength.score <= 1 ? 'text-red-500' :
                                        passwordStrength.score === 2 ? 'text-orange-500' :
                                        passwordStrength.score === 3 ? 'text-yellow-500' : 'text-green-500'
                                    }`}>
                                        {getStrengthText()}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${getStrengthColor()} transition-all duration-300`}
                                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                    <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-500' : 'text-gray-400'}`}>
                                        {passwordStrength.checks.length ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        อย่างน้อย 8 ตัวอักษร
                                    </div>
                                    <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-500' : 'text-gray-400'}`}>
                                        {passwordStrength.checks.uppercase ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        ตัวพิมพ์ใหญ่ (A-Z)
                                    </div>
                                    <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-500' : 'text-gray-400'}`}>
                                        {passwordStrength.checks.lowercase ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        ตัวพิมพ์เล็ก (a-z)
                                    </div>
                                    <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? 'text-green-500' : 'text-gray-400'}`}>
                                        {passwordStrength.checks.number ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        ตัวเลข (0-9)
                                    </div>
                                </div>
                            </div>
                        )}
                        <InputError message={errors.password} />
                    </div>

                    {/* Confirm Password Field */}
                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                            <Lock className="w-4 h-4 text-orange-500" />
                            ยืนยันรหัสผ่าน
                        </Label>
                        <div className="relative">
                            <Input
                                id="password_confirmation"
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                tabIndex={4}
                                autoComplete="new-password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                onFocus={() => setFocusedField('password_confirmation')}
                                onBlur={() => setFocusedField(null)}
                                disabled={processing}
                                placeholder="กรอกรหัสผ่านอีกครั้ง"
                                className={`pl-4 pr-12 py-3 h-12 rounded-xl border-2 transition-all duration-300 bg-white dark:bg-gray-800 ${
                                    focusedField === 'password_confirmation' 
                                        ? 'border-orange-500 ring-4 ring-orange-500/20' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                                } ${
                                    data.password_confirmation && data.password !== data.password_confirmation 
                                        ? 'border-red-500 ring-4 ring-red-500/20' 
                                        : data.password_confirmation && data.password === data.password_confirmation
                                        ? 'border-green-500 ring-4 ring-green-500/20'
                                        : ''
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        {data.password_confirmation && data.password === data.password_confirmation && (
                            <p className="text-xs text-green-500 flex items-center gap-1 animate-fadeIn">
                                <CheckCircle2 className="w-3 h-3" />
                                รหัสผ่านตรงกัน
                            </p>
                        )}
                        {data.password_confirmation && data.password !== data.password_confirmation && (
                            <p className="text-xs text-red-500 flex items-center gap-1 animate-fadeIn">
                                <XCircle className="w-3 h-3" />
                                รหัสผ่านไม่ตรงกัน
                            </p>
                        )}
                        <InputError message={errors.password_confirmation} />
                    </div>

                    {/* Register Button */}
                    <Button 
                        type="submit" 
                        className="mt-2 w-full h-12 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]" 
                        tabIndex={5} 
                        disabled={processing}
                    >
                        {processing ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <UserPlus className="w-5 h-5 mr-2" />
                                สมัครสมาชิก
                            </>
                        )}
                    </Button>
                </div>

                {/* Login Link */}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                    มีบัญชีอยู่แล้ว?{' '}
                    <TextLink href={route('login')} tabIndex={6} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold hover:underline">
                        เข้าสู่ระบบ
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
