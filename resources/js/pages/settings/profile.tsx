import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { Camera, MessageCircle, User } from 'lucide-react';

import DeleteUser from '@/components/delete-user';
import DepartmentPicker from '@/components/department-picker';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'ตั้งค่าโปรไฟล์',
        href: '/settings/profile',
    },
];

interface DepartmentOption {
    id: number;
    name: string;
}

interface ProfilePageProps {
    mustVerifyEmail: boolean;
    status?: string;
    departments?: DepartmentOption[];
    chatLiffUrl?: string;
    addFriendUrl?: string;
}

export default function Profile({
    mustVerifyEmail,
    status,
    departments = [],
    chatLiffUrl,
    addFriendUrl,
}: ProfilePageProps) {
    const { auth, errors, lineLoginEnabled } = usePage<SharedData>().props;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(auth.user.avatar || auth.user.line_picture_url || null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [unlinking, setUnlinking] = useState(false);

    const initialDeptIds = Array.isArray(auth.user.department_ids)
        ? (auth.user.department_ids as number[])
        : [];
    const initialPrimary =
        typeof auth.user.primary_department_id === 'number' ? auth.user.primary_department_id : initialDeptIds[0] ?? null;

    const { data, setData, patch, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        email: auth.user.email,
        chat_display_name: (auth.user.chat_display_name as string | null) || '',
        department_ids: initialDeptIds,
        primary_department_id: initialPrimary,
    });

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreviewUrl(URL.createObjectURL(file));
            const formData = new FormData();
            formData.append('avatar', file);
            setUploadingAvatar(true);
            router.post(route('profile.avatar.update'), formData, {
                forceFormData: true,
                onFinish: () => setUploadingAvatar(false),
            });
        }
    };

    const toggleDepartment = (deptId: number) => {
        const next = data.department_ids.includes(deptId)
            ? data.department_ids.filter((id) => id !== deptId)
            : [...data.department_ids, deptId];
        let primary = data.primary_department_id;
        if (next.length === 1) {
            primary = next[0];
        } else if (!next.includes(primary as number)) {
            primary = next[0] ?? null;
        }
        setData({
            ...data,
            department_ids: next,
            primary_department_id: primary,
        });
    };

    const removeDepartment = (deptId: number) => {
        const next = data.department_ids.filter((id) => id !== deptId);
        setData({
            ...data,
            department_ids: next,
            primary_department_id: data.primary_department_id === deptId ? next[0] ?? null : data.primary_department_id,
        });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (data.department_ids.length === 0) {
            return;
        }
        patch(route('profile.update'));
    };

    const unlinkLine = () => {
        if (!window.confirm('ยกเลิกการเชื่อมต่อ LINE จากบัญชีนี้? ยังเข้าสู่ระบบด้วยอีเมลได้ตามปกติ')) {
            return;
        }
        setUnlinking(true);
        router.delete(route('profile.line.unlink'), {
            onFinish: () => setUnlinking(false),
        });
    };

    const statusMessage =
        status === 'line-linked'
            ? 'เชื่อมต่อ LINE แล้ว'
            : status === 'line-unlinked'
              ? 'ยกเลิกการเชื่อมต่อ LINE แล้ว'
              : status === 'avatar-updated'
                ? 'อัปเดตรูปโปรไฟล์แล้ว'
                : status === 'profile-updated'
                  ? 'บันทึกโปรไฟล์แล้ว'
                  : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="ตั้งค่าโปรไฟล์" />

            <SettingsLayout>
                {statusMessage && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        {statusMessage}
                    </div>
                )}

                <div className="space-y-6">
                    <HeadingSmall title="ข้อมูลโปรไฟล์" description="อัปเดตชื่อ ที่อยู่อีเมล แผนก และชื่อในแชท" />

                    <div className="mb-6 flex items-start gap-6">
                        <div className="relative">
                            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <User className="h-10 w-10 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAvatar}
                                className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Camera className="h-3.5 w-3.5" />
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
                            {auth.user.positions && Array.isArray(auth.user.positions) && auth.user.positions.length > 0 && (
                                <div className="mb-1">
                                    <span className="font-semibold">ตำแหน่งงาน:</span>{' '}
                                    {(auth.user.positions as { name: string }[]).map((pos) => pos.name).join(', ')}
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
                            <InputError className="mt-2" message={errors.name as string | undefined} />
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
                            <InputError className="mt-2" message={errors.email as string | undefined} />
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

                        <div className="grid gap-2">
                            <Label htmlFor="chat_display_name">ชื่อที่ใช้ใน FSHH Chat</Label>
                            <Input
                                id="chat_display_name"
                                className="mt-1 block w-full"
                                value={data.chat_display_name}
                                onChange={(e) => setData('chat_display_name', e.target.value)}
                                placeholder={data.name || 'ชื่อที่เพื่อนในแชทจะเห็น'}
                                maxLength={80}
                            />
                            <p className="text-xs text-gray-500">
                                ถ้าว่าง ระบบจะใช้ชื่อ-นามสกุลด้านบน · หลังบันทึกจะอัปเดตในแชทเมื่อบัญชีเชื่อม LINE แล้ว
                            </p>
                            <InputError className="mt-2" message={errors.chat_display_name as string | undefined} />
                        </div>

                        <DepartmentPicker
                            departments={departments}
                            selectedIds={data.department_ids}
                            primaryId={data.primary_department_id}
                            onToggle={toggleDepartment}
                            onRemove={removeDepartment}
                            onSetPrimary={(id) => setData('primary_department_id', id)}
                            error={(errors.department_ids as string | undefined) || (errors.primary_department_id as string | undefined)}
                        />

                        <div className="flex items-center gap-4">
                            <Button disabled={processing || data.department_ids.length === 0}>บันทึก</Button>
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
                    <HeadingSmall
                        title="เชื่อมระบบ LINE และแชท"
                        description="ผูกบัญชี LINE เพื่อเข้า FSHH Chat และรับกลุ่มตามแผนก"
                    />

                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                            <svg className="h-8 w-8 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.5 10.5c0-4.8-4.6-8.7-10.3-8.7S0 5.7 0 10.5c0 4.3 3.8 7.9 8.6 8.6.3 0 .7.1.8.3.1.2.1.5 0 .8-.1.3-.2.8-.2 1.2 0 .4.2 1.5 1.3.8 5.5-3.2 10-6.8 10-11.7z" />
                            </svg>
                            <div>
                                <div className="font-medium">LINE</div>
                                <div className="text-sm text-muted-foreground">
                                    {auth.user.line_id
                                        ? `เชื่อมต่อแล้ว${auth.user.line_display_name ? ` · ${auth.user.line_display_name}` : ''}`
                                        : 'ยังไม่ได้เชื่อมต่อ'}
                                </div>
                            </div>
                        </div>

                        {lineLoginEnabled ? (
                            auth.user.line_id ? (
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        className="border-[#06C755] text-[#06C755] hover:bg-[#06C755] hover:text-white"
                                        onClick={() => (window.location.href = route('auth.line'))}
                                    >
                                        เปลี่ยนบัญชี
                                    </Button>
                                    <Button variant="outline" disabled={unlinking} onClick={unlinkLine}>
                                        ยกเลิกการเชื่อมต่อ
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="border-[#06C755] text-[#06C755] hover:bg-[#06C755] hover:text-white"
                                    onClick={() => (window.location.href = route('auth.line'))}
                                >
                                    เชื่อมต่อ
                                </Button>
                            )
                        ) : (
                            <p className="text-xs text-amber-700">ยังไม่ได้เปิด LINE Login</p>
                        )}
                    </div>

                    {typeof errors.line === 'string' && <InputError message={errors.line} />}

                    {(addFriendUrl || chatLiffUrl) && (
                        <div className="space-y-1 text-sm text-gray-600">
                            {addFriendUrl && (
                                <p>
                                    <a href={addFriendUrl} target="_blank" rel="noreferrer" className="text-[#06C755] hover:underline">
                                        แอดเพื่อนบัญชีทางการ LINE
                                    </a>{' '}
                                    เพื่อรับข้อความแจ้งเตือน
                                </p>
                            )}
                            {chatLiffUrl && (
                                <p className="flex items-center gap-1">
                                    <MessageCircle className="h-4 w-4" />
                                    <a href={chatLiffUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                        เปิด FSHH Chat
                                    </a>
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
