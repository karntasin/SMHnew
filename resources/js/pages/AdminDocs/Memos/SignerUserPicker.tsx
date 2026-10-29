import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { correctThaiSpeechName, rankSignerNames, thaiNameSearchVariants } from './thaiSpeechName';

interface UserHit {
    id: number;
    name: string;
    position: string | null;
}

interface Props {
    value: string;
    placeholder?: string;
    onChange: (name: string) => void;
    onPick?: (user: UserHit) => void;
}

export default function SignerUserPicker({ value, placeholder, onChange, onPick }: Props) {
    const [query, setQuery] = useState(value);
    const [hits, setHits] = useState<UserHit[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const skipSearch = useRef(false);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        const onDoc = (event: MouseEvent) => {
            if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    useEffect(() => {
        if (skipSearch.current) {
            skipSearch.current = false;
            return;
        }
        const q = query.trim();
        if (q.length < 1) {
            setHits([]);
            setSearched(false);
            setOpen(false);
            return;
        }

        const timer = window.setTimeout(async () => {
            setLoading(true);
            try {
                const primary = correctThaiSpeechName(q) || q;
                const variants = thaiNameSearchVariants(q);
                const searchQ = primary !== q ? primary : q;
                const { data } = await axios.get<{ users: UserHit[] }>(route('admin-docs.memos.users'), {
                    params: { q: searchQ },
                });
                let users = data.users ?? [];

                // If still empty, try alternate variants one by one.
                if (users.length === 0) {
                    for (const variant of variants) {
                        if (variant === searchQ) continue;
                        const again = await axios.get<{ users: UserHit[] }>(route('admin-docs.memos.users'), {
                            params: { q: variant },
                        });
                        if ((again.data.users ?? []).length > 0) {
                            users = again.data.users ?? [];
                            break;
                        }
                    }
                }

                setHits(rankSignerNames(q, users).slice(0, 20));
                setSearched(true);
                setOpen(true);
            } catch {
                setHits([]);
                setSearched(true);
                setOpen(true);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => window.clearTimeout(timer);
    }, [query]);

    const notFound = searched && !loading && query.trim().length >= 1 && hits.length === 0;

    return (
        <div ref={wrapRef} className="relative space-y-1">
            <Input
                value={query}
                placeholder={placeholder ?? 'ค้นหาชื่อจากระบบ'}
                autoComplete="off"
                onChange={(event) => {
                    const next = event.target.value;
                    setQuery(next);
                    onChange(next);
                }}
                onFocus={() => {
                    if (hits.length > 0 || notFound) setOpen(true);
                }}
            />
            {open && (loading || hits.length > 0 || notFound) && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {loading && <p className="px-3 py-2 text-sm text-slate-500">กำลังค้นหา…</p>}
                    {!loading &&
                        hits.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                className={cn(
                                    'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-emerald-50',
                                )}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    skipSearch.current = true;
                                    setQuery(user.name);
                                    onChange(user.name);
                                    onPick?.(user);
                                    setHits([]);
                                    setOpen(false);
                                    setSearched(false);
                                }}
                            >
                                <span className="font-medium text-slate-900">{user.name}</span>
                                {user.position && <span className="text-xs text-slate-500">{user.position}</span>}
                            </button>
                        ))}
                    {notFound && <p className="px-3 py-2 text-sm text-amber-800">ไม่พบชื่อในระบบ</p>}
                </div>
            )}
            {notFound && !open && <p className="text-sm text-amber-700">ไม่พบชื่อในระบบ</p>}
        </div>
    );
}
