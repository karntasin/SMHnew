import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';

export default function LineQrLogin({
    scanUrl,
    popupUrl,
    label = 'เข้าสู่ระบบด้วย LINE',
    showQr = false,
}: {
    scanUrl: string;
    popupUrl?: string;
    label?: string;
    showQr?: boolean;
}) {
    const [status, setStatus] = useState<'idle' | 'waiting' | 'ready' | 'expired'>(showQr ? 'waiting' : 'idle');
    const [popupBlocked, setPopupBlocked] = useState(false);
    const [qrSrc, setQrSrc] = useState('');
    const popupRef = useRef<Window | null>(null);
    const pollingRef = useRef<number | null>(null);
    const lineWindowUrl = popupUrl || scanUrl;

    useEffect(() => {
        if (!showQr || !scanUrl) {
            setQrSrc('');
            return;
        }

        let cancelled = false;
        QRCode.toDataURL(scanUrl, {
            width: 240,
            margin: 1,
            color: { dark: '#111827', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        })
            .then((url) => {
                if (!cancelled) {
                    setQrSrc(url);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setQrSrc('');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [scanUrl, showQr]);

    const openLineQrWindow = useCallback(() => {
        const width = 420;
        const height = 680;
        const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
        const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
        const features = `popup=yes,width=${width},height=${height},left=${left},top=${top}`;

        popupRef.current?.close();
        const popup = window.open(lineWindowUrl, 'line-login-qr', features);

        if (!popup) {
            setPopupBlocked(true);
            return;
        }

        popupRef.current = popup;
        setPopupBlocked(false);
        setStatus('waiting');
    }, [lineWindowUrl]);

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
        <div className="space-y-3">
            {showQr && (
                <div className="rounded-2xl border border-[#06C755]/20 bg-white p-4 text-center shadow-sm dark:border-[#06C755]/30 dark:bg-gray-900/60">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">สแกน QR ด้วยแอป LINE</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">เปิดกล้องหรือ LINE บนมือถือ แล้วสแกนรหัสนี้</p>
                    <div className="mx-auto mt-4 flex h-56 w-56 items-center justify-center rounded-xl bg-white p-2 ring-1 ring-gray-100 dark:ring-gray-700">
                        {qrSrc ? (
                            <img src={qrSrc} alt="QR สมัครสมาชิกด้วย LINE" className="h-full w-full" />
                        ) : (
                            <div className="h-40 w-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                        )}
                    </div>
                    {status === 'waiting' && (
                        <p className="mt-3 text-xs text-[#06C755]">รอสแกนจากมือถือ...</p>
                    )}
                    {status === 'ready' && (
                        <p className="mt-3 text-xs text-emerald-700">ยืนยันแล้ว กำลังเข้าสู่ระบบ...</p>
                    )}
                    {status === 'expired' && (
                        <div className="mt-3 space-y-2">
                            <p className="text-xs text-amber-700">QR หมดอายุ กรุณาสร้างรหัสใหม่</p>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 w-full rounded-xl"
                                onClick={() => window.location.reload()}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                สร้าง QR ใหม่
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {!showQr && status === 'ready' && (
                <p className="text-center text-xs text-emerald-700">ยืนยันแล้ว กำลังเข้าสู่ระบบ...</p>
            )}
            {!showQr && status === 'expired' && (
                <p className="text-center text-xs text-amber-700">เซสชันหมดอายุ กรุณากดปุ่มอีกครั้ง</p>
            )}
            {popupBlocked && (
                <p className="text-center text-xs text-amber-700">
                    เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาต pop-up แล้วกดอีกครั้ง
                </p>
            )}
            <Button
                type="button"
                className="h-12 w-full rounded-xl bg-[#06C755] text-sm font-semibold text-white hover:bg-[#05b34c]"
                onClick={openLineQrWindow}
            >
                <ExternalLink className="mr-2 h-4 w-4" />
                {showQr
                    ? 'เปิดหน้าต่าง LINE บนคอมพิวเตอร์'
                    : status === 'waiting'
                      ? 'เปิด LINE อีกครั้ง'
                      : label}
            </Button>
        </div>
    );
}
