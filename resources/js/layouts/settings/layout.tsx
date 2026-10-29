import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { resolveAppUrl } from '@/lib/asset';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, Menu } from 'lucide-react';
import { toast } from 'sonner';

const sidebarNavItems: NavItem[] = [
    {
        title: 'โปรไฟล์',
        url: '/settings/profile',
        icon: null,
    },
    {
        title: 'รหัสผ่าน',
        url: '/settings/password',
        icon: null,
    },
    {
        title: 'ตำแหน่งงาน',
        url: '/settings/positions',
        icon: null,
    },
    {
        title: 'คู่มือการใช้งาน',
        url: '/settings/manuals',
        icon: null,
    },
];

function setupIncompleteMessage(needsPassword: boolean, needsLoginId: boolean): string {
    const parts: string[] = [];

    if (needsPassword) {
        parts.push('ตั้งรหัสผ่านใหม่');
    }

    if (needsLoginId) {
        parts.push('ใส่อีเมลหรือชื่อผู้ใช้สำหรับเข้าสู่ระบบ');
    }

    if (parts.length === 0) {
        return 'กรุณาตั้งค่าบัญชีให้ครบก่อนใช้งานต่อ';
    }

    return `กรุณา${parts.join(' และ')}ให้เสร็จก่อน`;
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const currentPath = window.location.pathname;
    const { accountSetup } = usePage<SharedData>().props;
    const ready = accountSetup?.ready ?? true;
    const needsPassword = accountSetup?.needsPassword ?? false;
    const needsLoginId = accountSetup?.needsLoginId ?? false;

    const warnIncomplete = () => {
        toast.error(setupIncompleteMessage(needsPassword, needsLoginId));
    };

    return (
        <div className="px-4 py-6">
            <div className="mb-4 flex flex-wrap gap-2">
                {ready ? (
                    <>
                        <Button
                            size="sm"
                            asChild
                            className="bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500"
                        >
                            <Link href={route('dashboard')} prefetch>
                                <LayoutGrid className="size-4" />
                                Dashboard
                            </Link>
                        </Button>
                        <Button
                            size="sm"
                            asChild
                            className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
                        >
                            <Link href={route('menus.hub')} prefetch>
                                <Menu className="size-4" />
                                รวมเมนู
                            </Link>
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            size="sm"
                            type="button"
                            onClick={warnIncomplete}
                            className="bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500"
                        >
                            <LayoutGrid className="size-4" />
                            Dashboard
                        </Button>
                        <Button
                            size="sm"
                            type="button"
                            onClick={warnIncomplete}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
                        >
                            <Menu className="size-4" />
                            รวมเมนู
                        </Button>
                    </>
                )}
            </div>

            {!ready && (
                <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
                    {setupIncompleteMessage(needsPassword, needsLoginId)}
                </p>
            )}

            <Heading title="ตั้งค่าโปรไฟล์" description="จัดการข้อมูลโปรไฟล์และการตั้งค่าบัญชีของคุณ" />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item) => (
                            <Button
                                key={item.url}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': currentPath === item.url,
                                })}
                            >
                                <Link href={resolveAppUrl(item.url)} prefetch className="flex items-center justify-between w-full">
                                    <span>{item.title}</span>
                                    {item.url === '/settings/password' && needsPassword && (
                                        <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                            ยังไม่ตั้ง
                                        </span>
                                    )}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
