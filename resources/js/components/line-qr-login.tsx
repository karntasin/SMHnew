import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LineQrLogin({ scanUrl }: { scanUrl: string }) {
    const [status, setStatus] = useState<'idle' | 'waiting' | 'ready' | 'expired'>('idle');
    const [popupBlocked, setPopupBlocked] = useState(false);
    const popupRef = useRef<Window | null>(null);
    const pollingRef = useRef<number | null>(null);

    const openLineQrWindow = useCallback(() => {
        const width = 420;
        const height = 680;
        const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
        const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
        const features = `popup=yes,width=${width},height=${height},left=${left},top=${top}`;

        popupRef.current?.close();
        const popup = window.open(scanUrl, 'line-login-qr', features);

        if (!popup) {
            setPopupBlocked(true);
            return;
        }

        popupRef.current = popup;
        setPopupBlocked(false);
        setStatus('waiting');
    }, [scanUrl]);

    const claimLogin = useCallback(() => {
        if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
        }
        setStatus('ready');
        popupRef.current?.close();
        window.location.href = route('auth.line.qr.claim');
    }, []);

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === 'line-qr-ready') {
                claimLogin();
            }
        };
        window.addEventListener('message', onMessage);

        return () => window.removeEventListener('message', onMessage);
    }, [claimLogin]);

    useEffect(() => {
        pollingRef.current = window.setInterval(async () => {
            if (status !== 'waiting' && status !== 'idle') {
                return;
            }

            try {
                const response = await fetch(route('auth.line.qr.status'), {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });
                const data = await response.json();
                if (data.status === 'ready') {
                    claimLogin();
                } else if (data.status === 'expired') {
                    setStatus('expired');
                    popupRef.current?.close();
                }
            } catch {
                // keep polling
            }
        }, 2000);

        return () => {
            if (pollingRef.current) {
                window.clearInterval(pollingRef.current);
            }
        };
    }, [status, claimLogin]);

    return (
        <div className="overflow-hidden rounded-2xl border border-[#06C755]/30 bg-white text-center shadow-sm">
            <div className="bg-[#06C755] px-4 py-2.5 text-sm font-semibold text-white">
                <span className="inline-flex items-center justify-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    เข้าสู่ระบบด้วย QR ของ LINE
                </span>
            </div>

            <div className="space-y-3 px-4 py-4">
                {status === 'ready' && (
                    <p className="text-xs text-emerald-700">ยืนยันแล้ว กำลังเข้าสู่ระบบ...</p>
                )}

                {status === 'expired' && (
                    <p className="text-xs text-amber-700">QR หมดอายุแล้ว กรุณารีเฟรชหน้านี้</p>
                )}

                {popupBlocked && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        เบราว์เซอร์บล็อก pop-up — อนุญาต pop-up สำหรับเว็บนี้ แล้วกดปุ่มอีกครั้ง
                    </p>
                )}

                <Button
                    type="button"
                    className="h-12 w-full bg-[#06C755] text-sm font-semibold text-white hover:bg-[#05b34c]"
                    onClick={openLineQrWindow}
                >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {status === 'waiting' ? 'เปิด QR ของ LINE อีกครั้ง' : 'แสดง QR ของ LINE'}
                </Button>
            </div>
        </div>
    );
}
