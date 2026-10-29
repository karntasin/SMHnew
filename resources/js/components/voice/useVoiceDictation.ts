import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { convertThaiWordsToNumbers } from './thaiNumberNormalizer';

declare const route: (name: string, params?: any) => string;

export type SpeechAction = 'undo' | 'sentence' | 'space' | 'append';
type SpeechCallback = (action: SpeechAction, spokenText?: string) => void;

// Whisper VAD timing (optimized for responsiveness)
const SILENCE_MS = 500;
const SPEECH_THRESHOLD = 0.01;
const MIN_SPEECH_MS = 200;
const TIMESLICE_MS = 200;
const MAX_CHUNK_MS = 6000;

function pickMimeType(): string {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
    ];
    if (typeof MediaRecorder === 'undefined') return '';
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

export function whisperDictationSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== 'undefined' &&
        Boolean(pickMimeType()) &&
        window.isSecureContext
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

export function getBrowserSpeechCtor(): SpeechCtor | undefined {
    if (typeof window === 'undefined') return undefined;
    const browser = window as Window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export function detectVoiceCommand(text: string): SpeechAction | null {
    const normalized = text.trim().replace(/[\s.,!?。]+/g, '').replace(/(ค่ะ|ครับ|คะ|นะ|นะคะ|นะครับ)+$/g, '');
    if (normalized === 'ยกเลิกข้อความ' || normalized === 'ลบข้อความ' || normalized === 'กดยกเลิก') {
        return 'undo';
    }
    if (normalized === 'ยกเลิกประโยค' || normalized === 'ลบประโยค') {
        return 'sentence';
    }
    if (normalized === 'วรรค' || normalized === 'เว้นวรรค' || normalized === 'เคาะ') {
        return 'space';
    }
    return null;
}

export function dropLastSentence(value: string): string {
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

/**
 * Global singleton coordinator ensuring mutually exclusive active microphone sessions.
 * When a new voice session starts, any previously active session is automatically stopped.
 */
type SessionStopCallback = () => void;
let activeSessionId: string | null = null;
let activeSessionStop: SessionStopCallback | null = null;

export function registerActiveSession(id: string, stop: SessionStopCallback) {
    if (activeSessionId && activeSessionId !== id && activeSessionStop) {
        try {
            activeSessionStop();
        } catch {
            // ignore
        }
    }
    activeSessionId = id;
    activeSessionStop = stop;
}

export function unregisterActiveSession(id: string) {
    if (activeSessionId === id) {
        activeSessionId = null;
        activeSessionStop = null;
    }
}

export function useVoiceDictation({
    onAction,
}: {
    onAction: SpeechCallback;
}) {
    const sessionIdRef = useRef<string>('');
    if (!sessionIdRef.current) {
        sessionIdRef.current = `voice_session_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
    }

    const [listening, setListening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [interim, setInterim] = useState('');
    const [error, setError] = useState('');
    const [engine, setEngine] = useState<'browser' | 'whisper'>('browser');

    const onActionRef = useRef(onAction);
    onActionRef.current = onAction;

    const wantRef = useRef(false);
    const useWhisperRef = useRef(false);
    const chunkStartedAtRef = useRef(0);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);
    const hadSpeechRef = useRef(false);
    const speechStartedAtRef = useRef(0);
    const silenceSinceRef = useRef(0);
    const flushingRef = useRef(false);
    const mimeRef = useRef('');
    const recognitionRef = useRef<InstanceType<SpeechCtor> | null>(null);
    const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasBrowserSpeech = Boolean(getBrowserSpeechCtor());
    const hasWhisper = whisperDictationSupported();
    const isSupported = hasBrowserSpeech || hasWhisper;

    const stopAudioTracks = () => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        try {
            recorderRef.current?.stop();
        } catch {
            // ignore
        }
        recorderRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        try {
            void audioCtxRef.current?.close();
        } catch {
            // ignore
        }
        audioCtxRef.current = null;
        analyserRef.current = null;
        chunksRef.current = [];
        hadSpeechRef.current = false;
        silenceSinceRef.current = 0;
        speechStartedAtRef.current = 0;
    };

    const stopBrowserSpeech = () => {
        if (restartTimerRef.current !== null) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
        const rec = recognitionRef.current;
        if (rec) {
            rec.onend = null;
            rec.onerror = null;
            rec.onresult = null;
            try {
                rec.stop();
            } catch {
                // ignore
            }
            recognitionRef.current = null;
        }
    };

    const stop = useCallback(() => {
        wantRef.current = false;
        stopAudioTracks();
        stopBrowserSpeech();
        setListening(false);
        setBusy(false);
        setInterim('');
        unregisterActiveSession(sessionIdRef.current);
    }, []);

    useEffect(() => {
        return () => {
            wantRef.current = false;
            stopAudioTracks();
            stopBrowserSpeech();
            unregisterActiveSession(sessionIdRef.current);
        };
    }, []);

    const processTranscript = (spoken: string) => {
        const text = spoken.trim();
        if (!text) return;
        const cmd = detectVoiceCommand(text);
        if (cmd) {
            onActionRef.current(cmd);
        } else {
            // Convert spoken Thai numbers (e.g. 'หนึ่ง', 'สอง', 'ยี่สิบห้า') into Arabic numerals
            const normalizedText = convertThaiWordsToNumbers(text);
            onActionRef.current('append', normalizedText);
        }
    };

    const startBrowserSpeech = (): boolean => {
        const SpeechApi = getBrowserSpeechCtor();
        if (!SpeechApi || !wantRef.current) return false;

        stopBrowserSpeech();
        const instance = new SpeechApi();
        instance.lang = 'th-TH';
        instance.continuous = true;
        instance.interimResults = true;

        instance.onresult = (event) => {
            let fullInterim = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const res = event.results[i]!;
                const piece = res[0]?.transcript ?? '';
                if (res.isFinal) {
                    processTranscript(piece);
                } else {
                    fullInterim += piece;
                }
            }
            if (wantRef.current) {
                // Show interim with numbers converted in real-time
                setInterim(convertThaiWordsToNumbers(fullInterim));
            }
        };

        instance.onerror = (e) => {
            if (e.error === 'no-speech' && wantRef.current) return;
            if (e.error === 'aborted') {
                if (!wantRef.current) {
                    unregisterActiveSession(sessionIdRef.current);
                }
                return;
            }
            // If browser recognition fails, fallback to Whisper
            if (hasWhisper && !useWhisperRef.current) {
                useWhisperRef.current = true;
                setEngine('whisper');
                stopBrowserSpeech();
                void startWhisperSpeech();
            } else {
                setError(`ข้อผิดพลาดไมโครโฟน: ${e.error}`);
                wantRef.current = false;
                setListening(false);
                unregisterActiveSession(sessionIdRef.current);
            }
        };

        instance.onend = () => {
            if (!wantRef.current) return;
            restartTimerRef.current = setTimeout(() => {
                if (wantRef.current) {
                    try {
                        instance.start();
                    } catch {
                        // ignore
                    }
                }
            }, 300);
        };

        recognitionRef.current = instance;
        try {
            instance.start();
            setListening(true);
            setEngine('browser');
            return true;
        } catch {
            return false;
        }
    };

    const uploadBlob = async (blob: Blob) => {
        if (blob.size < 600) return;
        setBusy(true);
        setInterim('กำลังแปลงเสียง…');
        try {
            const form = new FormData();
            const ext = mimeRef.current.includes('mp4') ? 'm4a' : mimeRef.current.includes('ogg') ? 'ogg' : 'webm';
            form.append('audio', blob, `voice.${ext}`);
            const transcribeUrl = typeof route === 'function' ? route('admin-docs.memos.transcribe') : '/admin-docs/memos/transcribe';
            const { data } = await axios.post<{ success?: boolean; text?: string; error?: string; code?: string }>(
                transcribeUrl,
                form,
                { timeout: 30000 },
            );
            if (data?.success && data.text && data.text.trim() !== '') {
                processTranscript(data.text.trim());
            }
        } catch (err: any) {
            setError(err?.response?.data?.error || 'แปลงเสียงไม่สำเร็จ');
        } finally {
            setBusy(false);
            if (wantRef.current) setInterim('');
        }
    };

    const flushSpeech = async () => {
        if (flushingRef.current || !wantRef.current) return;
        const parts = chunksRef.current;
        if (parts.length === 0) return;
        const spokeFor = speechStartedAtRef.current ? Date.now() - speechStartedAtRef.current : 0;
        if (!hadSpeechRef.current || spokeFor < MIN_SPEECH_MS) {
            chunksRef.current = [];
            hadSpeechRef.current = false;
            silenceSinceRef.current = 0;
            speechStartedAtRef.current = 0;
            return;
        }
        flushingRef.current = true;
        chunksRef.current = [];
        hadSpeechRef.current = false;
        silenceSinceRef.current = 0;
        speechStartedAtRef.current = 0;
        const blob = new Blob(parts, { type: mimeRef.current || 'audio/webm' });
        try {
            await uploadBlob(blob);
        } finally {
            flushingRef.current = false;
        }
    };

    const tickVad = () => {
        if (!wantRef.current || !analyserRef.current) return;
        const analyser = analyserRef.current;
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
            const v = (data[i]! - 128) / 128;
            sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const now = Date.now();
        if (rms >= SPEECH_THRESHOLD) {
            if (!hadSpeechRef.current) {
                speechStartedAtRef.current = now;
                chunkStartedAtRef.current = now;
            }
            hadSpeechRef.current = true;
            silenceSinceRef.current = 0;
        } else if (hadSpeechRef.current) {
            if (silenceSinceRef.current === 0) silenceSinceRef.current = now;
            if (now - silenceSinceRef.current >= SILENCE_MS) {
                void flushSpeech();
            }
        }
        if (
            hadSpeechRef.current &&
            chunkStartedAtRef.current > 0 &&
            now - chunkStartedAtRef.current >= MAX_CHUNK_MS
        ) {
            void flushSpeech();
            chunkStartedAtRef.current = now;
        }
        rafRef.current = requestAnimationFrame(tickVad);
    };

    const startWhisperSpeech = async () => {
        try {
            mimeRef.current = pickMimeType();
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                },
            });
            if (!wantRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            streamRef.current = stream;
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioCtxRef.current = audioCtx;
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            analyserRef.current = analyser;

            const recorder = new MediaRecorder(stream, mimeRef.current ? { mimeType: mimeRef.current } : undefined);
            recorderRef.current = recorder;
            chunksRef.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
            };
            recorder.start(TIMESLICE_MS);

            setListening(true);
            setEngine('whisper');
            hadSpeechRef.current = false;
            silenceSinceRef.current = 0;
            speechStartedAtRef.current = 0;
            chunkStartedAtRef.current = Date.now();
            rafRef.current = requestAnimationFrame(tickVad);
        } catch {
            setError('ไม่สามารถเปิดใช้งานไมโครโฟนได้');
            wantRef.current = false;
            setListening(false);
            unregisterActiveSession(sessionIdRef.current);
        }
    };

    const start = useCallback(async () => {
        if (wantRef.current) return;

        // Ensure only one active microphone session across the app at any time.
        // Automatically stops any previously active session.
        registerActiveSession(sessionIdRef.current, () => {
            stop();
        });

        setError('');
        setInterim('');
        wantRef.current = true;

        // Prioritize Browser Native Speech Recognition (th-TH) for instant real-time response (<100ms)
        if (hasBrowserSpeech && !useWhisperRef.current) {
            const ok = startBrowserSpeech();
            if (ok) return;
        }

        // Fallback to Whisper AI
        if (hasWhisper) {
            await startWhisperSpeech();
            return;
        }

        setError('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการพิมพ์ด้วยเสียง');
        wantRef.current = false;
        setListening(false);
        unregisterActiveSession(sessionIdRef.current);
    }, [hasBrowserSpeech, hasWhisper, stop]);

    const toggle = useCallback(() => {
        if (listening) {
            stop();
        } else {
            void start();
        }
    }, [listening, start, stop]);

    return {
        isSupported,
        listening,
        busy,
        interim,
        error,
        engine,
        start,
        stop,
        toggle,
    };
}
