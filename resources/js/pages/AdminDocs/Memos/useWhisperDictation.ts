import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

type Handler = (text: string) => void;

const SILENCE_MS = 900;
const SPEECH_THRESHOLD = 0.01;
const MIN_SPEECH_MS = 280;
const TIMESLICE_MS = 250;
const MAX_CHUNK_MS = 8000;

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

export function useWhisperDictation() {
    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [useBrowserFallback, setUseBrowserFallback] = useState(false);
    const wantRef = useRef(false);
    const fallbackRef = useRef(false);
    const chunkStartedAtRef = useRef(0);
    const handlerRef = useRef<Handler>(() => {});
    const interimRef = useRef<Handler>(() => {});
    const errorRef = useRef<Handler>(() => {});
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

    useEffect(() => {
        if (whisperDictationSupported()) {
            setSupported(true);
            setNote('');
        } else {
            setSupported(false);
            setNote('อุปกรณ์นี้ยังใช้ไมค์แปลงเสียงผ่านเซิร์ฟเวอร์ไม่ได้');
        }
        return () => {
            wantRef.current = false;
            stopTracks();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stopTracks = () => {
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

    const setHandler = (onFinal: Handler, onInterim: Handler, onError: Handler) => {
        handlerRef.current = onFinal;
        interimRef.current = onInterim;
        errorRef.current = onError;
    };

    const uploadBlob = async (blob: Blob) => {
        if (blob.size < 800) return;
        setBusy(true);
        interimRef.current('กำลังแปลงเสียง…');
        try {
            const form = new FormData();
            const ext = mimeRef.current.includes('mp4') ? 'm4a' : mimeRef.current.includes('ogg') ? 'ogg' : 'webm';
            form.append('audio', blob, `memo.${ext}`);
            const { data } = await axios.post<{ success?: boolean; text?: string; error?: string; code?: string }>(
                route('admin-docs.memos.transcribe'),
                form,
                // Let the browser set multipart boundary — do not force Content-Type.
                { timeout: 60000 },
            );
            if (data?.success && data.text && data.text.trim() !== '') {
                handlerRef.current(data.text.trim());
            } else if (data?.success && (!data.text || data.text.trim() === '')) {
                // Silence / empty transcript — keep listening.
            } else {
                // Quota, misconfig, or unexpected payload → browser SpeechRecognition.
                fallbackRef.current = true;
                setUseBrowserFallback(true);
                errorRef.current(data?.error ?? 'ใช้ไมค์สำรองของเบราว์เซอร์แทน');
                wantRef.current = false;
                stopTracks();
                setListening(false);
            }
        } catch (error: unknown) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            const code = axios.isAxiosError(error) ? (error.response?.data as { code?: string } | undefined)?.code : undefined;
            // 404 = Worker ยังไม่ deploy / 502–503 / 429 → สลับ Web Speech ทันที
            fallbackRef.current = true;
            setUseBrowserFallback(true);
            errorRef.current(
                status === 404
                    ? 'ยังไม่ได้เปิดบริการแปลงเสียงบนเซิร์ฟเวอร์ — สลับไปไมค์เบราว์เซอร์'
                    : code === 'QUOTA' || status === 429
                      ? 'โควต้าแปลงเสียงเต็มวันนี้ — สลับไปไมค์เบราว์เซอร์'
                      : 'แปลงเสียงผ่านเซิร์ฟเวอร์ไม่ได้ — สลับไปไมค์เบราว์เซอร์',
            );
            wantRef.current = false;
            stopTracks();
            setListening(false);
        } finally {
            setBusy(false);
            if (wantRef.current) interimRef.current('');
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
        // Flush long utterances even without a clear silence gap (mobile noise floor).
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

    const startRecorder = (stream: MediaStream) => {
        const mime = mimeRef.current;
        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.start(TIMESLICE_MS);
    };

    const start = async () => {
        if (!whisperDictationSupported() || fallbackRef.current) {
            errorRef.current('ใช้ไมค์แปลงเสียงผ่านเซิร์ฟเวอร์ไม่ได้บนอุปกรณ์นี้');
            return false;
        }
        mimeRef.current = pickMimeType();
        wantRef.current = true;
        setListening(true);
        errorRef.current('');
        interimRef.current('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                },
            });
            if (!wantRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return false;
            }
            streamRef.current = stream;
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new AudioCtx();
            audioCtxRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            analyserRef.current = analyser;
            startRecorder(stream);
            rafRef.current = requestAnimationFrame(tickVad);
            return true;
        } catch {
            wantRef.current = false;
            setListening(false);
            errorRef.current('อนุญาตไมโครโฟนในเบราว์เซอร์ก่อน แล้วกดไมค์อีกครั้ง');
            return false;
        }
    };

    const stop = async () => {
        wantRef.current = false;
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        try {
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                await new Promise<void>((resolve) => {
                    const rec = recorderRef.current!;
                    rec.onstop = () => resolve();
                    try {
                        rec.requestData();
                    } catch {
                        // ignore
                    }
                    try {
                        rec.stop();
                    } catch {
                        resolve();
                    }
                });
            }
        } catch {
            // ignore
        }
        await flushSpeech();
        stopTracks();
        setListening(false);
        interimRef.current('');
    };

    return {
        supported,
        listening,
        busy,
        note,
        useBrowserFallback,
        start,
        stop,
        setHandler,
        resetFallback: () => {
            fallbackRef.current = false;
            setUseBrowserFallback(false);
        },
    };
}
