import { Head, usePage } from '@inertiajs/react';
import { AlertCircle, FileDown } from 'lucide-react';

import TextLink from '@/components/text-link';
import LineLoginButton from '@/components/line-login-button';
import LineQrLogin from '@/components/line-qr-login';
import AuthLayout from '@/layouts/auth-layout';

interface RegisterProps {
    lineLoginEnabled?: boolean;
    lineQr?: { ticket: string; scanUrl: string; popupUrl?: string } | null;
}

export default function Register({ lineLoginEnabled = false, lineQr = null }: RegisterProps) {
    const { errors } = usePage().props;

    return (
        <AuthLayout
            title="สมัครสมาชิก"
            description="ยืนยันตัวตนด้วย LINE แล้วกรอกข้อมูลบุคลากรบนเว็บ"
        >
            <Head title="สมัครสมาชิก" />

            <div className="flex flex-col gap-4">
                {errors?.line && (
                    <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        {errors.line}
                    </p>
                )}

                {lineLoginEnabled ? (
                    <>
                        {lineQr?.scanUrl && (
                            <LineQrLogin
                                scanUrl={lineQr.scanUrl}
                                popupUrl={lineQr.popupUrl}
                                showQr
                                label="สมัครสมาชิกด้วย LINE"
                            />
                        )}
                        <LineLoginButton intent="register" label="เปิด LINE บนเครื่องนี้" />
                        <p className="text-center text-xs leading-relaxed text-gray-500">
                            หลังยืนยัน LINE จะให้กรอกเลขบัตรประชาชน ตำแหน่ง และแผนก
                        </p>
                        <div className="text-center pt-1">
                            <a
                                href={route('settings.manuals.registration.download')}
                                download
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                            >
                                <FileDown className="h-3.5 w-3.5" />
                                ดาวน์โหลดคู่มือขั้นตอนการสมัครสมาชิก (PDF)
                            </a>
                        </div>
                    </>
                ) : (
                    <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        ยังไม่ได้เปิด LINE Login กรุณาติดต่อเจ้าหน้าที่สารสนเทศ
                    </p>
                )}

                <p className="text-center text-sm text-gray-500">
                    มีบัญชีอยู่แล้ว?{' '}
                    <TextLink href={route('login')}>เข้าสู่ระบบ</TextLink>
                </p>
            </div>
        </AuthLayout>
    );
}
