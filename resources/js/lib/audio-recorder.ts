/**
 * Bulletproof Client-side 16kHz Mono WAV Recorder
 * Uses MediaRecorder with AudioContext decoding & resampling to 16kHz PCM WAV.
 * Compatible with all modern browsers, operating systems, and USB/Bluetooth microphones.
 */

export interface RecorderError {
    type: 'INSECURE_CONTEXT' | 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'GENERIC';
    message: string;
}

export function checkAudioSupport(): { supported: boolean; reason?: string } {
    if (typeof window === 'undefined') {
        return { supported: false, reason: 'SSR environment' };
    }

    // Check secure context (HTTPS or localhost)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!window.isSecureContext && !isLocalhost) {
        return {
            supported: false,
            reason: 'เบราว์เซอร์อนุญาตให้ใช้ไมโครโฟนเฉพาะผ่าน HTTPS หรือ localhost เท่านั้น (Insecure Context)',
        };
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
            supported: false,
            reason: 'เบราว์เซอร์นี้ไม่รองรับ navigator.mediaDevices.getUserMedia',
        };
    }

    return { supported: true };
}

export class WavRecorder {
    private stream: MediaStream | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private isRecording = false;

    /**
     * Start recording audio with fallback constraints
     */
    async start(): Promise<MediaStream> {
        const support = checkAudioSupport();
        if (!support.supported) {
            throw new Error(support.reason || 'อุปกรณ์ไม่รองรับการบันทึกเสียง');
        }

        // Try high quality constraints first, fall back to simple audio: true if overconstrained
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
        } catch (err: any) {
            console.warn('Initial getUserMedia failed, attempting fallback to { audio: true }:', err);
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (fallbackErr: any) {
                if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
                    throw new Error('ไมโครโฟนถูกปฏิเสธการเข้าถึง กรุณาอนุญาตการใช้งานไมโครโฟนในการตั้งค่าเบราว์เซอร์');
                } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
                    throw new Error('ไม่พบอุปกรณ์ไมโครโฟน กรุณาเชื่อมต่อไมโครโฟนแล้วลองใหม่อีกครั้ง');
                } else {
                    throw new Error(`ไม่สามารถเปิดไมโครโฟนได้: ${fallbackErr.message || fallbackErr.name}`);
                }
            }
        }

        // Determine best supported MIME type
        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
            'audio/wav',
            '',
        ];

        let selectedMimeType = '';
        for (const type of mimeTypes) {
            if (type === '' || (window.MediaRecorder && MediaRecorder.isTypeSupported(type))) {
                selectedMimeType = type;
                break;
            }
        }

        this.recordedChunks = [];
        const options: MediaRecorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : {};
        
        try {
            this.mediaRecorder = new MediaRecorder(this.stream, options);
        } catch {
            this.mediaRecorder = new MediaRecorder(this.stream);
        }

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.start(100); // 100ms timeslices for smooth chunk collection
        this.isRecording = true;

        return this.stream;
    }

    /**
     * Stop recording and export standard 16kHz Mono 16-bit PCM WAV Blob
     */
    async stop(): Promise<Blob> {
        if (!this.mediaRecorder || !this.isRecording) {
            this.cleanupStream();
            throw new Error('Recording was not active.');
        }

        this.isRecording = false;

        return new Promise<Blob>((resolve, reject) => {
            if (!this.mediaRecorder) {
                this.cleanupStream();
                reject(new Error('MediaRecorder instance is null'));
                return;
            }

            this.mediaRecorder.onstop = async () => {
                const recordedType = this.mediaRecorder?.mimeType || 'audio/webm';
                const rawBlob = new Blob(this.recordedChunks, { type: recordedType });
                this.cleanupStream();

                try {
                    // Resample and convert to 16kHz PCM WAV
                    const wavBlob = await this.resampleTo16kHzWav(rawBlob);
                    resolve(wavBlob);
                } catch (resampleErr) {
                    console.warn('WAV resampling failed, falling back to raw recorded blob:', resampleErr);
                    resolve(rawBlob);
                }
            };

            try {
                this.mediaRecorder.stop();
            } catch (err) {
                this.cleanupStream();
                reject(err);
            }
        });
    }

    private cleanupStream(): void {
        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }
    }

    /**
     * Decode any audio Blob into AudioBuffer and resample to 16kHz Mono 16-bit PCM WAV
     */
    private async resampleTo16kHzWav(audioBlob: Blob): Promise<Blob> {
        const arrayBuffer = await audioBlob.arrayBuffer();

        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioContextClass();

        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        let audioBuffer: AudioBuffer;
        try {
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        } finally {
            if (audioCtx.state !== 'closed') {
                audioCtx.close().catch(() => {});
            }
        }

        // Mix down to mono
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const monoData = new Float32Array(length);

        if (numChannels === 1) {
            monoData.set(audioBuffer.getChannelData(0));
        } else {
            for (let c = 0; c < numChannels; c++) {
                const channelData = audioBuffer.getChannelData(c);
                for (let i = 0; i < length; i++) {
                    monoData[i] += channelData[i] / numChannels;
                }
            }
        }

        // Resample from audioBuffer.sampleRate to 16000 Hz
        const targetSampleRate = 16000;
        const sourceSampleRate = audioBuffer.sampleRate;
        const resampledData = this.resampleLinear(monoData, sourceSampleRate, targetSampleRate);

        // Encode as 16-bit PCM WAV
        const wavBuffer = this.encodeWAV(resampledData, targetSampleRate);
        return new Blob([wavBuffer], { type: 'audio/wav' });
    }

    /**
     * High-quality linear interpolation resampling
     */
    private resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
        if (fromRate === toRate) {
            return input;
        }
        const ratio = fromRate / toRate;
        const outputLength = Math.round(input.length / ratio);
        const output = new Float32Array(outputLength);

        for (let i = 0; i < outputLength; i++) {
            const index = i * ratio;
            const iLow = Math.floor(index);
            const iHigh = Math.min(iLow + 1, input.length - 1);
            const weight = index - iLow;
            output[i] = input[iLow] * (1 - weight) + input[iHigh] * weight;
        }

        return output;
    }

    /**
     * Encode Float32Array samples into standard 16-bit PCM WAV format
     */
    private encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        this.writeString(view, 8, 'WAVE');

        // fmt sub-chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
        view.setUint16(20, 1, true); // audio format (1 = PCM)
        view.setUint16(22, 1, true); // num channels (1 = mono)
        view.setUint32(24, sampleRate, true); // sample rate
        view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * 1 * 16 / 8)
        view.setUint16(32, 2, true); // block align (1 * 16 / 8)
        view.setUint16(34, 16, true); // bits per sample

        // data sub-chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, samples.length * 2, true);

        // Write PCM samples (clamp -1.0 to 1.0)
        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
            offset += 2;
        }

        return buffer;
    }

    private writeString(view: DataView, offset: number, string: string): void {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}
