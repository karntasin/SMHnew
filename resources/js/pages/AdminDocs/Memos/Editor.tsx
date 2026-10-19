import { Head, useForm } from '@inertiajs/react';
import { Download, Mic, MicOff, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import { cn } from '@/lib/utils';
import { downloadDocx } from './downloadDocx';
import MemoPreview from './MemoPreview';
import MemoSubNav from './MemoSubNav';
import { CARRY_KEYS, type MemoCatalogEntry, type MemoFonts, type MemoKind, type MemoRecord, type SectionMap } from './types';

interface Props {
    memo: MemoRecord | null;
    kind: MemoKind;
    catalog: Record<MemoKind, MemoCatalogEntry>;
    blanks: Record<MemoKind, SectionMap>;
    fonts: MemoFonts;
}

const breadcrumbs = [
    { title: 'งานธุรการ', href: '/admin-hub' },
    { title: 'จัดการงานเอกสาร', href: route('admin-docs.memos.index') },
    { title: 'เขียนหนังสือ', href: route('admin-docs.memos.create') },
];

export default function Editor({ memo, kind: initialKind, catalog, blanks, fonts }: Props) {
    const form = useForm({
        kind: memo?.kind ?? initialKind,
        thai_digits: memo?.thai_digits ?? false,
        sections: memo?.sections ?? blanks[initialKind],
    });
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [interim, setInterim] = useState('');
    const [speechError, setSpeechError] = useState('');
    const [downloading, setDownloading] = useState(false);
    const speech = useThaiDictation();
    const activeKeyRef = useRef<string | null>(null);
    const speechHistory = useRef<Record<string, string[]>>({});
    activeKeyRef.current = activeKey;

    const fields = catalog[form.data.kind].fields;

    const appendTranscript = (spoken: string) => {
        const key = activeKeyRef.current;
        const chunk = spoken.trim();
        if (!key || chunk === '') return;
        const command = voiceCommand(chunk);
        form.setData((current) => {
            const existing = current.sections[key]?.value ?? '';
            const remember = () => {
                const stack = speechHistory.current[key] ?? [];
                stack.push(existing);
                speechHistory.current[key] = stack.slice(-20);
            };
            let value = existing;
            if (command === 'undo') {
                const previous = speechHistory.current[key]?.pop();
                if (previous === undefined) return current;
                value = previous;
            } else if (command === 'sentence') {
                remember();
                value = dropLastSentence(existing);
            } else if (command === 'space') {
                remember();
                value = `${existing} `;
            } else {
                remember();
                const joiner = existing !== '' && !/[\s\n]$/.test(existing) ? ' ' : '';
                value = `${existing}${joiner}${chunk}`;
            }
            return {
                ...current,
                sections: {
                    ...current.sections,
                    [key]: { enabled: true, value },
                },
            };
        });
    };

    const appendRef = useRef(appendTranscript);
    appendRef.current = appendTranscript;
    speech.setHandler((text) => appendRef.current(text), setInterim, setSpeechError);

    const toggleMic = (key: string) => {
        if (!speech.supported) return;
        if (speech.listening && activeKey === key) {
            speech.stop();
            setActiveKey(null);
            setInterim('');
            return;
        }
        setActiveKey(key);
        setSpeechError('');
        speech.start();
    };

    const updateSection = (key: string, patch: Partial<{ enabled: boolean; value: string }>) => {
        form.setData('sections', {
            ...form.data.sections,
            [key]: {
                enabled: form.data.sections[key]?.enabled ?? true,
                value: form.data.sections[key]?.value ?? '',
                ...patch,
            },
        });
    };

    const switchKind = (next: MemoKind) => {
        if (next === form.data.kind) return;
        const blank = blanks[next];
        const merged: SectionMap = {};
        Object.keys(blank).forEach((key) => {
            const previous = form.data.sections[key];
            if (previous && previous.value.trim() !== '' && CARRY_KEYS.includes(key) && key !== 'closing') {
                merged[key] = { enabled: previous.enabled, value: previous.value };
            } else {
                merged[key] = { ...blank[key] };
            }
        });
        form.setData({ ...form.data, kind: next, sections: merged });
    };

    const save = () => {
        if (memo) {
            form.put(route('admin-docs.memos.update', memo.id), { preserveScroll: true });
            return;
        }
        form.post(route('admin-docs.memos.store'), { preserveScroll: true });
    };

    const download = async () => {
        setDownloading(true);
        try {
            await downloadDocx(route('admin-docs.memos.export'), form.data);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ดาวน์โหลดไฟล์ไม่สำเร็จ');
        } finally {
            setDownloading(false);
        }
    };

    const activeLabel = fields.find((field) => field.key === activeKey)?.label;

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="เขียนหนังสือราชการ">
            <Head title="เขียนหนังสือราชการ" />
            <div className="space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-700">จัดการงานเอกสาร</p>
                        <h1 className="text-2xl font-semibold text-slate-900">พิมพ์หนังสือราชการตามคำพูด</h1>
                        <p className="mt-1 text-sm text-slate-500">เลือกส่วนที่ต้องการ แล้วพูดหรือพิมพ์ ตัวอย่างทางขวาตรงกับไฟล์ Word</p>
                    </div>
                    <MemoSubNav />
                </div>

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="grid gap-2 sm:grid-cols-3">
                                {(Object.keys(catalog) as MemoKind[]).map((name) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => switchKind(name)}
                                        className={cn(
                                            'rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                                            form.data.kind === name
                                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                                : 'border-slate-200 text-slate-600 hover:border-emerald-200',
                                        )}
                                    >
                                        {catalog[name].label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="flex items-center gap-3 text-sm text-slate-700">
                                    <Switch checked={form.data.thai_digits} onCheckedChange={(checked) => form.setData('thai_digits', checked === true)} />
                                    ใช้เลขไทยในเลขที่หนังสือและวันที่
                                </label>
                                <p className="text-xs text-slate-500">
                                    {speech.supported
                                        ? 'กดไมค์ที่ช่องที่ต้องการ แล้วพูดภาษาไทย คำสั่ง: ยกเลิกข้อความ, ยกเลิกประโยค, วรรค (เว้นวรรค 1 เคาะ)'
                                        : speech.note}
                                </p>
                            </div>
                            {speech.listening && (
                                <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                                    <span>กำลังฟัง{activeLabel ? ` — ${activeLabel}` : ''}{interim ? ` “${interim}”` : ''}</span>
                                    <Button type="button" variant="outline" size="sm" onClick={() => { speech.stop(); setInterim(''); }}>
                                        หยุดฟัง
                                    </Button>
                                </div>
                            )}
                            {speechError && <p className="text-sm text-rose-600">{speechError}</p>}
                        </div>

                        {fields.map((field) => {
                            const section = form.data.sections[field.key] ?? { enabled: field.enabled, value: '' };
                            const listeningHere = speech.listening && activeKey === field.key;
                            return (
                                <section
                                    key={field.key}
                                    className={cn(
                                        'rounded-2xl border bg-white p-4 shadow-sm',
                                        listeningHere ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200',
                                    )}
                                >
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                                            <Checkbox
                                                checked={section.enabled}
                                                onCheckedChange={(checked) => updateSection(field.key, { enabled: checked === true })}
                                            />
                                            {field.label}
                                            <span className="font-normal text-slate-400">พิมพ์ส่วนนี้</span>
                                        </label>
                                        {field.type !== 'date' && field.type !== 'rank' && speech.supported && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant={listeningHere ? 'default' : 'outline'}
                                                className={cn('rounded-full', listeningHere && 'bg-emerald-600 hover:bg-emerald-700')}
                                                onClick={() => toggleMic(field.key)}
                                                aria-label={listeningHere ? `หยุดฟัง${field.label}` : `พูดใส่${field.label}`}
                                            >
                                                {listeningHere ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                                            </Button>
                                        )}
                                    </div>
                                    {field.type === 'date' ? (
                                        <ThaiDatePicker value={section.value} onChange={(value) => updateSection(field.key, { value })} />
                                    ) : field.type === 'rank' ? (
                                        <RankField
                                            value={section.value}
                                            options={field.options ?? []}
                                            onChange={(value) => updateSection(field.key, { value })}
                                        />
                                    ) : field.type === 'textarea' ? (
                                        <Textarea
                                            rows={field.rows ?? 4}
                                            value={section.value}
                                            placeholder={field.placeholder}
                                            onChange={(event) => updateSection(field.key, { value: event.target.value })}
                                            className="min-h-28 text-base"
                                        />
                                    ) : (
                                        <Input
                                            value={section.value}
                                            placeholder={field.placeholder}
                                            onChange={(event) => updateSection(field.key, { value: event.target.value })}
                                        />
                                    )}
                                </section>
                            );
                        })}

                        <div className="sticky bottom-3 flex gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                            <Button type="button" onClick={save} disabled={form.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                <Save className="mr-2 size-4" />
                                {form.processing ? 'กำลังบันทึก' : 'บันทึกฉบับร่าง'}
                            </Button>
                            <Button type="button" variant="outline" onClick={download} disabled={downloading}>
                                <Download className="mr-2 size-4" />
                                {downloading ? 'กำลังสร้างไฟล์' : 'ดาวน์โหลด Word'}
                            </Button>
                        </div>
                    </div>

                    <div className="xl:sticky xl:top-4">
                        <MemoPreview
                            kind={form.data.kind}
                            sections={form.data.sections}
                            thaiDigits={form.data.thai_digits}
                            fonts={fonts}
                            catalog={catalog}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function voiceCommand(spoken: string): 'undo' | 'sentence' | 'space' | null {
    const compact = spoken.replace(/[\s.,!?。]+/g, '');
    if (compact === 'ยกเลิกข้อความ') return 'undo';
    if (compact === 'ยกเลิกประโยค') return 'sentence';
    if (compact === 'วรรค') return 'space';
    return null;
}

function dropLastSentence(value: string): string {
    const trimmed = value.replace(/\s+$/, '');
    if (trimmed === '') return '';
    const boundaries = [...trimmed.matchAll(/[.!?。\n]/g)];
    if (boundaries.length === 0) return '';
    let cut = boundaries[boundaries.length - 1]?.index ?? 0;
    if (cut >= trimmed.length - 1 && boundaries.length > 1) {
        cut = boundaries[boundaries.length - 2]?.index ?? 0;
    } else if (cut >= trimmed.length - 1) {
        return '';
    }
    return trimmed.slice(0, cut + 1).replace(/\s+$/, '');
}

function RankField({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
    const female = value.endsWith(' หญิง');
    const rank = female ? value.slice(0, -' หญิง'.length) : value;
    const write = (nextRank: string, nextFemale: boolean) => {
        if (nextRank === '' || nextRank === '__none__') {
            onChange('');
            return;
        }
        onChange(nextFemale ? `${nextRank} หญิง` : nextRank);
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={rank || '__none__'} onValueChange={(next) => write(next, female)}>
                <SelectTrigger className="sm:max-w-xs">
                    <SelectValue placeholder="ไม่ระบุชั้นยศ" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__none__">ไม่ระบุ</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={female && rank !== ''} disabled={rank === ''} onCheckedChange={(checked) => write(rank, checked === true)} />
                หญิง
            </label>
        </div>
    );
}

type SpeechCtor = new () => {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

function speechCtor(): SpeechCtor | undefined {
    const browser = window as Window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

function useThaiDictation() {
    const recognitionRef = useRef<InstanceType<SpeechCtor> | null>(null);
    const listeningRef = useRef(false);
    const handlerRef = useRef<(text: string) => void>(() => {});
    const interimRef = useRef<(text: string) => void>(() => {});
    const errorRef = useRef<(text: string) => void>(() => {});
    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [note, setNote] = useState('');

    useEffect(() => {
        const api = Boolean(speechCtor());
        if (api && window.isSecureContext) {
            setSupported(true);
            setNote('');
        } else if (api) {
            setSupported(false);
            setNote('เปิดเว็บผ่าน HTTPS เพื่อใช้ไมโครโฟน ช่องข้อความกรอกและแก้ได้จากหน้านี้');
        } else {
            setSupported(false);
            setNote('การพูดใช้ได้ใน Chrome หรือ Edge ช่องข้อความกรอกและแก้ได้ทุกเบราว์เซอร์');
        }
        return () => {
            listeningRef.current = false;
            recognitionRef.current?.stop();
        };
    }, []);

    const setHandler = (
        onFinal: (text: string) => void,
        onInterim: (text: string) => void,
        onError: (text: string) => void,
    ) => {
        handlerRef.current = onFinal;
        interimRef.current = onInterim;
        errorRef.current = onError;
    };

    const stop = () => {
        listeningRef.current = false;
        setListening(false);
        interimRef.current('');
        recognitionRef.current?.stop();
    };

    const start = () => {
        const SpeechApi = speechCtor();
        if (!SpeechApi) {
            errorRef.current('การพูดใช้ได้ใน Chrome หรือ Edge');
            return;
        }

        recognitionRef.current?.stop();
        const recognition = new SpeechApi();
        recognition.lang = 'th-TH';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
            let finalText = '';
            let interimText = '';
            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                const transcript = event.results[index]?.[0]?.transcript ?? '';
                if (event.results[index]?.isFinal) finalText += transcript;
                else interimText += transcript;
            }
            if (finalText.trim() !== '') handlerRef.current(finalText);
            interimRef.current(interimText);
        };
        recognition.onerror = (event) => {
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            const messages: Record<string, string> = {
                'not-allowed': 'อนุญาตการใช้ไมโครโฟนในเบราว์เซอร์ก่อน แล้วกดไมค์อีกครั้ง',
                network: 'เชื่อมต่อบริการรู้จำเสียงไม่ได้ ข้อความยังพิมพ์แก้ได้',
                'audio-capture': 'ไม่พบไมโครโฟน',
            };
            errorRef.current(messages[event.error] ?? 'ใช้การพูดไม่สำเร็จในขณะนี้');
            listeningRef.current = false;
            setListening(false);
        };
        recognition.onend = () => {
            if (recognitionRef.current !== recognition) return;
            if (!listeningRef.current) {
                setListening(false);
                return;
            }
            try {
                recognition.start();
            } catch {
                listeningRef.current = false;
                setListening(false);
            }
        };

        recognitionRef.current = recognition;
        listeningRef.current = true;
        setListening(true);
        recognition.start();
    };

    return { supported, listening, note, start, stop, setHandler };
}
