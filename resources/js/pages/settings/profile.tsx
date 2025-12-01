import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Camera, User } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'ตั้งค่าโปรไฟล์',
        href: '/settings/profile',
    },
];

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        auth.user.avatar || auth.user.line_picture_url || null
    );

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            
            // Auto upload
            const formData = new FormData();
            formData.append('avatar', file);
            
            setUploadingAvatar(true);
            router.post(route('profile.avatar.update'), formData, {
                forceFormData: true,
                onFinish: () => setUploadingAvatar(false),
            });
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="ตั้งค่าโปรไฟล์" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="ข้อมูลโปรไฟล์" description="อัปเดตชื่อและที่อยู่อีเมลของคุณ" />

                    {/* รูปโปรไฟล์ */}
                    <div className="flex items-start gap-6 mb-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-10 h-10 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAvatar}
                                className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50"
                            >
                                <Camera className="w-3.5 h-3.5" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="mb-1">
                                <span className="font-semibold">ชื่อ-นามสกุล:</span> {auth.user.name}
                            </div>
                            <div className="mb-1">
                                <span className="font-semibold">Email:</span> {auth.user.email}
                            </div>
                            {auth.user.line_display_name && (
                                <div className="mb-1 text-sm text-gray-500">
                                    <span className="font-semibold">ชื่อ LINE:</span> {auth.user.line_display_name}
                                </div>
                            )}
                            {/* ตำแหน่งงาน */}
                            {auth.user.positions && Array.isArray(auth.user.positions) && auth.user.positions.length > 0 && (
                                <div className="mb-1">
                                    <span className="font-semibold">ตำแหน่งงาน:</span> {(auth.user.positions as any[]).map((pos: any) => pos.name).join(', ')}
                                </div>
                            )}
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="กรอกชื่อ-นามสกุล"
                            />
                            <InputError className="mt-2" message={errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">อีเมล</Label>
                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="กรอกอีเมล"
                            />
                            <InputError className="mt-2" message={errors.email} />
                        </div>
                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="mt-2 text-sm text-gray-800">
                                    อีเมลของคุณยังไม่ได้ยืนยัน
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                                    >
                                        คลิกที่นี่เพื่อส่งอีเมลยืนยันอีกครั้ง
                                    </Link>
                                </p>
                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        ลิงก์ยืนยันใหม่ได้ถูกส่งไปยังอีเมลของคุณแล้ว
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>บันทึก</Button>
                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-gray-600">บันทึกแล้ว</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <div className="space-y-6">
                    <HeadingSmall title="บัญชีที่เชื่อมต่อ" description="จัดการบัญชีโซเชียลที่เชื่อมต่อ" />

                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                            <svg className="h-8 w-8 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.5 10.5c0-4.8-4.6-8.7-10.3-8.7S0 5.7 0 10.5c0 4.3 3.8 7.9 8.6 8.6.3 0 .7.1.8.3.1.2.1.5 0 .8-.1.3-.2.8-.2 1.2 0 .4.2 1.5 1.3.8 5.5-3.2 10-6.8 10-11.7z" />
                            </svg>
                            <div>
                                <div className="font-medium">LINE</div>
                                <div className="text-sm text-muted-foreground">
                                    {auth.user.line_id ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}
                                </div>
                            </div>
                        </div>

                        {auth.user.line_id ? (
                            <Button variant="outline" disabled>
                                เชื่อมต่อแล้ว
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                className="border-[#06C755] text-[#06C755] hover:bg-[#06C755] hover:text-white"
                                onClick={() => (window.location.href = route('auth.line'))}
                            >
                                เชื่อมต่อ
                            </Button>
                        )}
                    </div>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
