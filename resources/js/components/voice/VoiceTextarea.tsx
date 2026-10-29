import React, { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, CheckCheck, Loader2, Sparkles, Undo2, Space, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceDictation, SpeechAction, dropLastSentence } from './useVoiceDictation';
import { findSuspectWords } from './thaiSpellcheck';
import { SpellcheckModal } from './SpellcheckModal';

export interface VoiceTextareaProps extends Omit<React.ComponentProps<typeof Textarea>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    enableVoice?: boolean;
    enableSpellcheck?: boolean;
    containerClassName?: string;
    label?: string;
}

export function VoiceTextarea({
    value,
    onChange,
    enableVoice = true,
    enableSpellcheck = true,
    containerClassName,
    className,
    placeholder,
    disabled,
    rows = 3,
    ...props
}: VoiceTextareaProps) {
    const historyRef = useRef<string[]>([]);
    const [checkingSpell, setCheckingSpell] = useState(false);
    const [spellModalOpen, setSpellModalOpen] = useState(false);
    const [suspectWords, setSuspectWords] = useState<string[]>([]);

    const handleSpeechAction = (action: SpeechAction, spokenText = '') => {
        const text = spokenText.trim();
        if (action === 'undo') {
            const previous = historyRef.current.pop();
            if (previous !== undefined) onChange(previous);
            return;
        }

        historyRef.current.push(value);
        if (historyRef.current.length > 20) historyRef.current.shift();

        if (action === 'sentence') {
            onChange(dropLastSentence(value));
        } else if (action === 'space') {
            onChange(`${value} `);
        } else if (action === 'append' && text) {
            const joiner = value && !/[\s\n]$/.test(value) ? ' ' : '';
            onChange(`${value}${joiner}${text}`);
        }
    };

    const voice = useVoiceDictation({
        onAction: handleSpeechAction,
    });

    const isListening = voice.listening;

    const handleCheckSpell = async () => {
        if (!value.trim()) return;
        setCheckingSpell(true);
        try {
            const suspects = await findSuspectWords(value);
            setSuspectWords(suspects);
            setSpellModalOpen(true);
        } catch {
            // ignore network/loading errors
        } finally {
            setCheckingSpell(false);
        }
    };

    return (
        <div className={cn('space-y-1.5 w-full', containerClassName)}>
            <div className="relative">
                <Textarea
                    {...props}
                    rows={rows}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={
                        isListening
                            ? voice.interim
                                ? `กำลังฟัง: ${voice.interim}`
                                : 'กำลังฟังเสียง... พูดได้เลย (คำสั่ง: ยกเลิกข้อความ / ยกเลิกประโยค / วรรค)'
                            : placeholder
                    }
                    className={cn(
                        'transition-colors',
                        isListening && 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-200/50',
                        className
                    )}
                />
            </div>

            {/* Voice Active Bar */}
            {isListening && (
                <div className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-xs text-rose-900 sm:flex-row sm:items-center sm:justify-between animate-fadeIn">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                        <span className="truncate font-medium">
                            {voice.busy ? 'กำลังแปลงเสียง…' : voice.interim ? `“${voice.interim}”` : 'กำลังฟังเสียง… พูดได้ต่อเนื่อง'}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                            onClick={() => handleSpeechAction('undo')}
                        >
                            <Undo2 className="mr-1 h-3 w-3" /> ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                            onClick={() => handleSpeechAction('space')}
                        >
                            <Space className="mr-1 h-3 w-3" /> วรรค
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                            onClick={voice.stop}
                        >
                            <Square className="mr-1 h-3 w-3 fill-white" /> หยุดฟัง
                        </Button>
                    </div>
                </div>
            )}

            {/* Action Bar (Mic & Spellcheck toggle) */}
            <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    {enableVoice && voice.isSupported && !isListening && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            onClick={voice.toggle}
                            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                            <Mic className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> พิมพ์ด้วยเสียง
                        </Button>
                    )}

                    {enableSpellcheck && value.trim().length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={disabled || checkingSpell}
                            onClick={handleCheckSpell}
                            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                            {checkingSpell ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            ) : (
                                <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                            )}
                            ตรวจคำผิด
                        </Button>
                    )}
                </div>

                {voice.error && (
                    <span className="text-xs text-rose-500 font-medium">{voice.error}</span>
                )}
            </div>

            <SpellcheckModal
                open={spellModalOpen}
                onOpenChange={setSpellModalOpen}
                suspects={suspectWords}
            />
        </div>
    );
}
