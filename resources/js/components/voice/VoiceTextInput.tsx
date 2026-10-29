import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceDictation, SpeechAction, dropLastSentence } from './useVoiceDictation';

export interface VoiceTextInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    enableVoice?: boolean;
    containerClassName?: string;
}

export function VoiceTextInput({
    value,
    onChange,
    enableVoice = true,
    containerClassName,
    className,
    placeholder,
    disabled,
    ...props
}: VoiceTextInputProps) {
    const historyRef = useRef<string[]>([]);

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

    return (
        <div className={cn('relative w-full', containerClassName)}>
            <Input
                {...props}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                placeholder={isListening ? (voice.interim ? `กำลังฟัง: ${voice.interim}` : 'กำลังฟังเสียง... พูดได้เลย') : placeholder}
                className={cn(
                    'pr-10 transition-colors',
                    isListening && 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-200/50',
                    className
                )}
            />
            {enableVoice && voice.isSupported && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {voice.busy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={voice.toggle}
                            title={isListening ? 'หยุดพิมพ์ด้วยเสียง' : 'คลิกเพื่อพิมพ์ด้วยเสียง'}
                            className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                                isListening
                                    ? 'bg-rose-500 text-white shadow-xs animate-pulse hover:bg-rose-600'
                                    : 'text-muted-foreground hover:bg-slate-100 hover:text-slate-800'
                            )}
                        >
                            {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                        </button>
                    )}
                </div>
            )}
            {voice.error && (
                <p className="mt-1 text-xs text-rose-500">{voice.error}</p>
            )}
        </div>
    );
}
