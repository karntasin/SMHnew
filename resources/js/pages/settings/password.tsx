import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'ตั้งค่ารหัสผ่าน',
        href: '/settings/password',
    },
];

type PasswordPageProps = {
    mustChangePassword?: boolean;
    requiresUsername?: boolean;
    username?: string | null;
};

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const { mustChangePassword, requiresUsername, username } = usePage().props as PasswordPageProps;
    const [passwordSaved, setPasswordSaved] = useState(false);

    const { data, setData, errors, put, reset, processing } = useForm({
        username: username || '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('password', 'password_confirmation');
                setPasswordSaved(true);
            },
            onError: (formErrors) => {
                if (formErrors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="ตั้งค่ารหัสผ่าน" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title={mustChangePassword ? 'ตั้งรหัสผ่านใหม่' : 'เปลี่ยนรหัสผ่าน'}
                        description={
                            mustChangePassword
                                ? requiresUsername
                                    ? 'บัญชีของคุณยังไม่มีอีเมลจริง กรุณาตั้งชื่อผู้ใช้และรหัสผ่านใหม่ก่อนใช้งานต่อ'
                                    : 'บัญชีของคุณยังใช้รหัสเริ่มต้น กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งานต่อ'
                                : 'ใช้รหัสผ่านที่ยาวและซับซ้อนเพื่อความปลอดภัยของบัญชี'
                        }
                    />

                    {passwordSaved && (
                        <div className="rounded-lg border border-muted/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground opacity-70">
                            ตั้งรหัสผ่านใหม่แล้ว — สามารถกลับมาแก้ได้ที่หน้านี้
                        </div>
                    )}

                    <form onSubmit={updatePassword} className="space-y-6">
                        {requiresUsername && (
                            <div className="grid gap-2">
                                <Label htmlFor="username">ชื่อผู้ใช้</Label>
                                <Input
                                    id="username"
                                    value={data.username}
                                    onChange={(e) => setData('username', e.target.value)}
                                    type="text"
                                    className="mt-1 block w-full"
                                    autoComplete="username"
                                    placeholder="เช่น somchai.w หรือ nurse01"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    ใช้ตัวอักษร ตัวเลข และ . _ - ความยาว 3–50 ตัว — ใช้เข้าสู่ระบบแทนอีเมลได้
                                </p>
                                <InputError message={errors.username} />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="password">รหัสผ่านใหม่</Label>

                            <Input
                                id="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder="กรอกรหัสผ่านใหม่"
                            />

                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">ยืนยันรหัสผ่านใหม่</Label>

                            <Input
                                id="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                            />

                            <InputError message={errors.password_confirmation} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>บันทึกรหัสผ่าน</Button>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
