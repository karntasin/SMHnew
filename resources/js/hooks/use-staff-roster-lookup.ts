import { useCallback, useRef, useState } from 'react';
import { apiFetch } from '@/lib/asset';

export interface StaffRosterLookupResult {
    matched: boolean;
    message?: string;
    prefix?: string | null;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    position?: string | null;
    phone?: string | null;
    cid?: string | null;
    role_name?: string;
}

interface LookupInput {
    first_name?: string;
    last_name?: string;
    cid?: string;
}

export function useStaffRosterLookup(routeName: 'register.roster-lookup' | 'profile.roster-lookup') {
    const [result, setResult] = useState<StaffRosterLookupResult | null>(null);
    const [loading, setLoading] = useState(false);
    const timerRef = useRef<number | null>(null);

    const lookup = useCallback((input: LookupInput) => {
        const first = (input.first_name ?? '').trim();
        const last = (input.last_name ?? '').trim();
        const cid = (input.cid ?? '').replace(/\D/g, '');

        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
        }

        if (cid.length < 13 && (first === '' || last === '')) {
            setResult(null);
            return;
        }

        timerRef.current = window.setTimeout(async () => {
            setLoading(true);
            try {
                const response = await apiFetch(route(routeName), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                    },
                    body: JSON.stringify({
                        first_name: first || undefined,
                        last_name: last || undefined,
                        cid: cid || undefined,
                    }),
                });

                if (!response.ok) {
                    const fallback = response.status === 419
                        ? 'เซสชันหมดอายุ กรุณารีเฟรชหน้าแล้วลองใหม่'
                        : 'ไม่สามารถตรวจสอบข้อมูลได้ กรุณาลองใหม่';
                    setResult({ matched: false, message: fallback });
                    return;
                }

                const data = (await response.json()) as StaffRosterLookupResult;
                setResult(data);
            } catch {
                setResult({
                    matched: false,
                    message: 'ไม่สามารถตรวจสอบข้อมูลได้ กรุณาลองใหม่',
                });
            } finally {
                setLoading(false);
            }
        }, 400);
    }, [routeName]);

    return { result, loading, lookup, setResult };
}
