import { Head, useForm } from '@inertiajs/react';
import { Download, Mic, MicOff, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import { cn } from '@/lib/utils';
import { downloadDocx } from './downloadDocx';
import MemoPreview from './MemoPreview';
import MemoSubNav from './MemoSubNav';
import SignerUserPicker from './SignerUserPicker';
import { collectSpellcheckText, findSuspectWords } from './thaiSpellcheck';
import { correctThaiSpeechName } from './thaiSpeechName';
import { useWhisperDictation } from './useWhisperDictation';
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
    const [checking, setChecking] = useState(false);
    const [suspects, setSuspects] = useState<string[]>([]);
    const [pendingAction, setPendingAction] = useState<'save' | 'download' | null>(null);
    const speech = useThaiDictation();
    const whisper = useWhisperDictation();
    // Whisper first when available; on failure useBrowserFallback switches to Web Speech.
    const preferWhisper = whisper.supported && !whisper.useBrowserFallback;
    const micListening = whisper.listening || speech.listening;
    const activeKeyRef = useRef<string | null>(null);
    const speechHistory = useRef<Record<string, string[]>>({});
    const lastCommittedRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
    activeKeyRef.current = activeKey;

    const fields = catalog[form.data.kind]?.fields ?? [];

    const applySpeechAction = (action: 'undo' | 'sentence' | 'space' | 'append', spoken = '') => {
        const key = activeKeyRef.current;
        if (!key) return;
        const chunk = spoken.trim();
        if (action === 'append' && chunk === '') return;

        form.setData((current) => {
            const existing = current.sections[key]?.value ?? '';
            const remember = () => {
                const stack = speechHistory.current[key] ?? [];
                stack.push(existing);
                speechHistory.current[key] = stack.slice(-20);
            };
            let value = existing;
            if (action === 'undo') {
                const previous = speechHistory.current[key]?.pop();
                if (previous === undefined) return current;
                value = previous;
            } else if (action === 'sentence') {
                remember();
                value = dropLastSentence(existing);
            } else if (action === 'space') {
                remember();
                value = `${existing} `;
            } else {
                const toAppend = dedupeAppendChunk(chunk, lastCommittedRef.current);
                if (toAppend === null) return current;
                remember();
                const joiner = existing !== '' && !/[\s\n]$/.test(existing) && toAppend !== '' ? ' ' : '';
                value = `${existing}${joiner}${toAppend}`;
                lastCommittedRef.current = { text: chunk, at: Date.now() };
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

    const appendTranscript = (spoken: string) => {
        const chunk = spoken.trim();
        if (chunk === '') return;
        const command = voiceCommand(chunk);
        if (command) {
            applySpeechAction(command);
            return;
        }
        const key = activeKeyRef.current;
        const text = key === 'signer_name' ? correctThaiSpeechName(chunk) : chunk;
        applySpeechAction('append', text);
    };

    const appendRef = useRef(appendTranscript);
    appendRef.current = appendTranscript;
    const onInterim = (text: string) => setInterim(text);
    const onError = (text: string) => setSpeechError(text);
    speech.setHandler((text) => appendRef.current(text), onInterim, onError);
    whisper.setHandler((text) => appendRef.current(text), onInterim, onError);

    const stopMic = async () => {
        await whisper.stop();
        speech.stop();
        setActiveKey(null);
        setInterim('');
    };

    useEffect(() => {
        if (!whisper.useBrowserFallback || !activeKey || !speech.supported) return;
        if (whisper.listening || speech.listening) return;
        speech.start();
    }, [whisper.useBrowserFallback, activeKey, whisper.listening, speech.listening, speech.supported]);

    const toggleMic = async (key: string) => {
        if (!speech.supported && !whisper.supported) return;
        if (micListening && activeKey === key) {
            await stopMic();
            return;
        }
        setActiveKey(key);
        setSpeechError('');
        setInterim('');
        lastCommittedRef.current = { text: '', at: 0 };
        if (preferWhisper) {
            const ok = await whisper.start();
            if (ok) return;
            // Permission/setup failed or switched to browser fallback mid-start
            if (whisper.useBrowserFallback || speech.supported) {
                speech.start();
            }
            return;
        }
        if (speech.supported) speech.start();
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

    const performSave = () => {
        if (memo) {
            form.put(route('admin-docs.memos.update', memo.id), { preserveScroll: true });
            return;
        }
        form.post(route('admin-docs.memos.store'), { preserveScroll: true });
    };

    const performDownload = async () => {
        setDownloading(true);
        try {
            await downloadDocx(route('admin-docs.memos.export'), form.data);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ดาวน์โหลดไฟล์ไม่สำเร็จ');
        } finally {
            setDownloading(false);
        }
    };

    const runWithSpellcheck = async (action: 'save' | 'download') => {
        setChecking(true);
        try {
            const text = collectSpellcheckText(fields, form.data.sections);
            const found = await findSuspectWords(text);
            if (found.length > 0) {
                setSuspects(found);
                setPendingAction(action);
                return;
            }
            if (action === 'save') performSave();
            else await performDownload();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ตรวจคำผิดไม่สำเร็จ');
        } finally {
            setChecking(false);
        }
    };

    const continuePending = async () => {
        const action = pendingAction;
        setPendingAction(null);
        setSuspects([]);
        if (action === 'save') performSave();
        else if (action === 'download') await performDownload();
    };

    const save = () => {
        void runWithSpellcheck('save');
    };

    const download = () => {
        void runWithSpellcheck('download');
    };

    const activeLabel = fields.find((field) => field.key === activeKey)?.label;

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="เขียนหนังสือราชการ">
            <Head title="เขียนหนังสือราชการ" />
            <div className="min-w-0 space-y-5 overflow-x-hidden p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-700">จัดการงานเอกสาร</p>
                        <h1 className="text-2xl font-semibold text-slate-900">พิมพ์หนังสือราชการตามคำพูด</h1>
                        <p className="mt-1 text-sm text-slate-500">เลือกส่วนที่ต้องการ แล้วพูดหรือพิมพ์ ตัวอย่างทางขวาตรงกับไฟล์ Word</p>
                    </div>
                    <MemoSubNav />
                </div>

                <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                    <div className="min-w-0 space-y-4">
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
                                    {speech.supported || whisper.supported
                                        ? preferWhisper
                                            ? 'กดไมค์ครั้งเดียวแล้วพูดได้เลย (แปลงเสียงผ่านเซิร์ฟเวอร์ ฟรีโควต้ารายวัน) กดอีกครั้งเพื่อหยุด — คำสั่ง: ยกเลิกข้อความ / ยกเลิกประโยค / วรรค'
                                            : 'กดไมค์ครั้งเดียวแล้วพูดได้เลย กดอีกครั้งเพื่อหยุด — คำสั่งเสียงหรือปุ่ม: ยกเลิกข้อความ / ลบข้อความ, ยกเลิกประโยค / ลบประโยค, วรรค'
                                        : speech.note || whisper.note}
                                </p>
                            </div>
                            {micListening && (
                                <div className="flex flex-col gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
                                    <span className="min-w-0">
                                        กำลังฟัง{activeLabel ? ` — ${activeLabel}` : ''}
                                        {whisper.busy ? ' · กำลังแปลงเสียง…' : ''}
                                        {interim ? ` “${interim}”` : ''}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => applySpeechAction('undo')}>
                                            ยกเลิกข้อความ
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => applySpeechAction('sentence')}>
                                            ยกเลิกประโยค
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => void stopMic()}>
                                            หยุดฟัง
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {speechError && <p className="text-sm text-rose-600">{speechError}</p>}
                        </div>

                        {fields.map((field) => {
                            const section = form.data.sections[field.key] ?? { enabled: field.enabled, value: '' };
                            const listeningHere = micListening && activeKey === field.key;
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
                                        {field.type !== 'date' && field.type !== 'rank' && (speech.supported || whisper.supported) && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant={listeningHere ? 'default' : 'outline'}
                                                className={cn('rounded-full', listeningHere && 'bg-emerald-600 hover:bg-emerald-700')}
                                                onClick={() => void toggleMic(field.key)}
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
                                    ) : field.key === 'signer_name' ? (
                                        <SignerUserPicker
                                            value={section.value}
                                            placeholder={field.placeholder ?? 'ค้นหาชื่อจากระบบ'}
                                            onChange={(name) => updateSection('signer_name', { value: name, enabled: true })}
                                            onPick={(user) => {
                                                const currentPosition = form.data.sections.signer_position?.value?.trim() ?? '';
                                                form.setData('sections', {
                                                    ...form.data.sections,
                                                    signer_name: { enabled: true, value: user.name },
                                                    signer_position: {
                                                        enabled: true,
                                                        value:
                                                            user.position && currentPosition === ''
                                                                ? user.position
                                                                : (form.data.sections.signer_position?.value ?? ''),
                                                    },
                                                });
                                            }}
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
                            <Button
                                type="button"
                                onClick={save}
                                disabled={form.processing || checking || downloading}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Save className="mr-2 size-4" />
                                {checking && pendingAction === null ? 'กำลังตรวจคำ' : form.processing ? 'กำลังบันทึก' : 'บันทึกฉบับร่าง'}
                            </Button>
                            <Button type="button" variant="outline" onClick={download} disabled={downloading || checking || form.processing}>
                                <Download className="mr-2 size-4" />
                                {checking && pendingAction === null ? 'กำลังตรวจคำ' : downloading ? 'กำลังสร้างไฟล์' : 'ดาวน์โหลด Word'}
                            </Button>
                        </div>
                    </div>

                    <div className="min-w-0 xl:sticky xl:top-4">
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

            <Dialog
                open={pendingAction !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingAction(null);
                        setSuspects([]);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>พบคำที่สงสัย</DialogTitle>
                        <DialogDescription>
                            คำต่อไปนี้ไม่อยู่ในพจนานุกรม ตรวจแก้ก่อน หรือยืนยันแล้ว{pendingAction === 'save' ? 'บันทึก' : 'ดาวน์โหลด'}ต่อได้
                        </DialogDescription>
                    </DialogHeader>
                    <ul className="max-h-56 list-disc space-y-1 overflow-auto rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-950">
                        {suspects.map((word) => (
                            <li key={word}>{word}</li>
                        ))}
                    </ul>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setPendingAction(null);
                                setSuspects([]);
                            }}
                        >
                            แก้ไขก่อน
                        </Button>
                        <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void continuePending()}>
                            ดำเนินการต่อ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function normalizeSpoken(spoken: string): string {
    return spoken
        .trim()
        .replace(/[\s.,!?。]+/g, '')
        .replace(/(ค่ะ|ครับ|คะ|นะ|นะคะ|นะครับ)+$/g, '');
}

function voiceCommand(spoken: string): 'undo' | 'sentence' | 'space' | null {
    const compact = normalizeSpoken(spoken);
    if (compact === '') return null;

    // Whole utterance is a command, or command clearly at the end.
    const undoPhrases = ['ยกเลิกข้อความ', 'ลบข้อความ', 'ยกเลิกทั้งหมด'];
    const sentencePhrases = ['ยกเลิกประโยค', 'ลบประโยค'];
    const spacePhrases = ['วรรค', 'เว้นวรรค'];

    for (const phrase of undoPhrases) {
        if (compact === phrase || compact.endsWith(phrase)) return 'undo';
    }
    for (const phrase of sentencePhrases) {
        if (compact === phrase || compact.endsWith(phrase)) return 'sentence';
    }
    for (const phrase of spacePhrases) {
        if (compact === phrase) return 'space';
    }
    return null;
}

/** Skip exact/near duplicates; if Chrome refined a longer phrase, return only the new tail. */
function dedupeAppendChunk(chunk: string, last: { text: string; at: number }): string | null {
    const now = Date.now();
    const prev = last.text.trim();
    const next = chunk.trim();
    if (next === '') return null;
    if (prev !== '' && now - last.at < 1500) {
        if (next === prev) return null;
        if (prev.startsWith(next) && next.length < prev.length) return null;
        if (next.startsWith(prev) && next.length > prev.length) {
            return next.slice(prev.length).trimStart();
        }
    }
    return next;
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
    /** True after click-to-listen until the user stops — survives silence/session restarts. */
    const wantListeningRef = useRef(false);
    const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handlerRef = useRef<(text: string) => void>(() => {});
    const interimRef = useRef<(text: string) => void>(() => {});
    const errorRef = useRef<(text: string) => void>(() => {});
    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [note, setNote] = useState('');

    const clearRestartTimer = () => {
        if (restartTimerRef.current !== null) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
    };

    const beginSession = () => {
        const SpeechApi = speechCtor();
        if (!SpeechApi || !wantListeningRef.current) return;

        const previous = recognitionRef.current;
        recognitionRef.current = null;
        try {
            previous?.stop();
        } catch {
            // ignore
        }

        interimRef.current('');

        const recognition = new SpeechApi();
        recognition.lang = 'th-TH';
        recognition.continuous = true;
        recognition.interimResults = true;
        let sessionLastFinal = '';
        recognition.onresult = (event) => {
            let finalText = '';
            let interimText = '';
            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                const transcript = event.results[index]?.[0]?.transcript ?? '';
                if (event.results[index]?.isFinal) finalText += transcript;
                else interimText += transcript;
            }
            const trimmed = finalText.trim();
            if (trimmed !== '') {
                if (trimmed !== sessionLastFinal) {
                    sessionLastFinal = trimmed;
                    handlerRef.current(finalText);
                }
            }
            if (wantListeningRef.current) interimRef.current(interimText);
            else interimRef.current('');
        };
        recognition.onerror = (event) => {
            // Mobile ends sessions on silence; keep wantListening and restart from onend.
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            const messages: Record<string, string> = {
                'not-allowed': 'อนุญาตการใช้ไมโครโฟนในเบราว์เซอร์ก่อน แล้วกดไมค์อีกครั้ง',
                network: 'เชื่อมต่อบริการรู้จำเสียงไม่ได้ ข้อความยังพิมพ์แก้ได้',
                'audio-capture': 'ไม่พบไมโครโฟน',
            };
            errorRef.current(messages[event.error] ?? 'ใช้การพูดไม่สำเร็จในขณะนี้');
            if (event.error === 'not-allowed' || event.error === 'audio-capture') {
                wantListeningRef.current = false;
                clearRestartTimer();
                setListening(false);
            }
        };
        recognition.onend = () => {
            if (recognitionRef.current !== recognition) return;
            recognitionRef.current = null;
            interimRef.current('');
            if (!wantListeningRef.current) {
                setListening(false);
                return;
            }
            // Still listening (click mode): Chrome ended on silence — restart until user stops.
            setListening(true);
            clearRestartTimer();
            restartTimerRef.current = setTimeout(() => {
                restartTimerRef.current = null;
                if (wantListeningRef.current) beginSession();
            }, 300);
        };

        recognitionRef.current = recognition;
        setListening(true);
        try {
            recognition.start();
        } catch {
            clearRestartTimer();
            restartTimerRef.current = setTimeout(() => {
                restartTimerRef.current = null;
                if (wantListeningRef.current) beginSession();
            }, 450);
        }
    };

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
            wantListeningRef.current = false;
            clearRestartTimer();
            try {
                recognitionRef.current?.stop();
            } catch {
                // ignore
            }
            recognitionRef.current = null;
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
        // Stop restarting, but keep the current recognition instance until onend
        // so late final results after release can still be committed.
        wantListeningRef.current = false;
        clearRestartTimer();
        setListening(false);
        interimRef.current('');
        const current = recognitionRef.current;
        try {
            current?.stop();
        } catch {
            // ignore
        }
    };

    const start = () => {
        if (!speechCtor()) {
            errorRef.current('การพูดใช้ได้ใน Chrome หรือ Edge');
            return;
        }
        clearRestartTimer();
        wantListeningRef.current = true;
        setListening(true);
        errorRef.current('');
        beginSession();
    };

    return { supported, listening, note, start, stop, setHandler };
}
