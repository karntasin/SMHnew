import { FormEvent, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import {
    AlertCircle,
    Camera,
    CameraOff,
    Flashlight,
    FlashlightOff,
    ImageUp,
    RefreshCw,
    ScanLine,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
    value: string;
    onChange: (value: string) => void;
    onDetected: (code: string) => void | Promise<void>;
    error?: string;
    className?: string;
    /** เปิดกล้องทันทีเมื่อ mount */
    autoStart?: boolean;
};

const BARCODE_DETECTOR_FORMATS = [
    'code_128',
    'code_39',
    'code_93',
    'ean_13',
    'ean_8',
    'qr_code',
    'upc_a',
    'upc_e',
    'data_matrix',
    'itf',
    'codabar',
];

function hasNativeBarcodeDetector(): boolean {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

function checkIsInAppBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Line\/|FBAN|FBAV|Instagram|MicroMessenger|musical_ly|BytedanceWebview/i.test(ua);
}

/**
 * สร้าง BarcodeDetector แบบปลอดภัย ไม่โยน TypeError หากฟอร์แมตใดฟอร์แมตหนึ่งไม่รองรับบนอุปกรณ์นั้น
 */
async function createSafeBarcodeDetector(): Promise<any | null> {
    if (!hasNativeBarcodeDetector()) return null;
    try {
        const DetectorClass = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
        if (!DetectorClass) return null;

        if (typeof DetectorClass.getSupportedFormats === 'function') {
            try {
                const supported: string[] = await DetectorClass.getSupportedFormats();
                if (Array.isArray(supported) && supported.length > 0) {
                    const formats = BARCODE_DETECTOR_FORMATS.filter((f) => supported.includes(f));
                    if (formats.length > 0) {
                        return new DetectorClass({ formats });
                    }
                    return new DetectorClass({ formats: supported });
                }
            } catch {
                // fall through
            }
        }
        try {
            return new DetectorClass({ formats: BARCODE_DETECTOR_FORMATS });
        } catch {
            return new DetectorClass();
        }
    } catch (e) {
        console.warn('Native BarcodeDetector skipped:', e);
        return null;
    }
}

/**
 * ขอสิทธิ์เปิดกล้องแบบ Progressive Fallback (4 ระดับ) เพื่อป้องกัน OverconstrainedError บนมือถือทุกรุ่น
 */
async function getMediaStreamWithFallback(facing: 'environment' | 'user'): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('เบราว์เซอร์หรือบริบทปัจจุบันไม่รองรับ WebRTC MediaDevices');
    }

    const tiers: MediaStreamConstraints[] = [
        // Tier 1: กล้องหลังความละเอียด HD ยืดหยุ่น
        {
            audio: false,
            video: {
                facingMode: { ideal: facing },
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
            },
        },
        // Tier 2: กล้องหลังแบบไม่จำกัดความกว้าง/ยาว (รองรับมือถือแนวตั้ง 100%)
        {
            audio: false,
            video: {
                facingMode: { ideal: facing },
            },
        },
        // Tier 3: เจาะจง facingMode โดยตรง
        {
            audio: false,
            video: {
                facingMode: facing,
            },
        },
        // Tier 4: กล้องใดก็ได้ที่มีบนเครื่อง (สำหรับกรณี driver กล้องส่งค่า facingMode ผิด)
        {
            audio: false,
            video: true,
        },
    ];

    let lastError: unknown = null;
    for (let i = 0; i < tiers.length; i++) {
        try {
            return await navigator.mediaDevices.getUserMedia(tiers[i]);
        } catch (err: unknown) {
            lastError = err;
            const name = typeof err === 'object' && err !== null && 'name' in err ? String((err as any).name) : '';
            // หากผู้ใช้หรือระบบกดปฏิเสธสิทธิ์ (NotAllowed) หรือเป็น SecurityError ให้หยุดทันที
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
                throw err;
            }
            console.warn(`getUserMedia attempt tier ${i + 1} failed with ${name}, trying next fallback...`);
        }
    }
    throw lastError;
}

function createZxingReader() {
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
    ]);
    return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100, delayBetweenScanSuccess: 1200 });
}

/**
 * เล่นเสียง Beep สังเคราะห์ผ่าน Web Audio API เลียนแบบเครื่องอ่านบาร์โค้ดโรงพยาบาล
 */
function playScannerBeep() {
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    } catch {
        // ignore audio errors
    }
}

/**
 * สั่นเครื่องสั้นๆ เลียนแบบ Play Store Barcode Scanner
 */
function triggerHaptic() {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([60]);
        }
    } catch {
        // ignore
    }
}

/**
 * ถอดรหัสภาพบาร์โค้ดที่มีประสิทธิภาพสูง:
 * 1. ใช้ Native BarcodeDetector ก่อน (เร็วมากบน Android/iOS17+)
 * 2. หากยังไม่พบ จะทำการย่อขนาดภาพ (downscale ไม่เกิน 1280px) และหมุนตรวจจับ 0°, 90°, 270°, 180°
 * 3. Fallback ผ่าน ZXing พร้อมปรับ Contrast/Thresholding
 */
async function decodeImageUltra(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

    // Step 1: ลอง Native BarcodeDetector บน Raw Bitmap ทันที
    if (hasNativeBarcodeDetector()) {
        try {
            const detector = await createSafeBarcodeDetector();
            if (detector) {
                const detected = await detector.detect(bitmap);
                if (detected && detected.length > 0 && detected[0].rawValue) {
                    return detected[0].rawValue.trim();
                }
            }
        } catch {
            // fallback
        }
    }

    // Step 2: สร้าง Canvas ย่อขนาดรูปให้อยู่ในสเกลที่อ่านบาร์โค้ดได้แม่นยำ (max 1280px)
    const maxDim = 1280;
    let width = bitmap.width;
    let height = bitmap.height;
    if (width > maxDim || height > maxDim) {
        if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
        } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
        }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Cannot acquire canvas context');

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(bitmap, 0, 0, width, height);

    // ลอง Native BarcodeDetector บน Canvas
    if (hasNativeBarcodeDetector()) {
        try {
            const detector = await createSafeBarcodeDetector();
            if (detector) {
                const detected = await detector.detect(canvas);
                if (detected && detected.length > 0 && detected[0].rawValue) {
                    return detected[0].rawValue.trim();
                }
            }
        } catch {
            // fallback
        }
    }

    // Step 3: ZXing Multi-angle Scan (0°, 90°, 270°, 180°)
    const zxing = createZxingReader();
    const angles = [0, 90, 270, 180];

    for (const angle of angles) {
        let testCanvas = canvas;
        if (angle !== 0) {
            testCanvas = document.createElement('canvas');
            const testCtx = testCanvas.getContext('2d', { willReadFrequently: true });
            if (angle === 90 || angle === 270) {
                testCanvas.width = height;
                testCanvas.height = width;
            } else {
                testCanvas.width = width;
                testCanvas.height = height;
            }
            if (testCtx) {
                testCtx.translate(testCanvas.width / 2, testCanvas.height / 2);
                testCtx.rotate((angle * Math.PI) / 180);
                testCtx.drawImage(canvas, -width / 2, -height / 2);
            }
        }

        try {
            const res = zxing.decodeFromCanvas(testCanvas);
            if (res && res.getText()) {
                return res.getText().trim();
            }
        } catch {
            // continue next angle
        }
    }

    // Step 4: Fallback เพิ่มความคมชัด (Contrast Boost) สำหรับรูปที่แสงสะท้อนหรือมืด
    try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const highContrast = avg > 128 ? Math.min(255, avg * 1.25) : Math.max(0, avg * 0.75);
            data[i] = highContrast;
            data[i + 1] = highContrast;
            data[i + 2] = highContrast;
        }
        ctx.putImageData(imgData, 0, 0);

        const res = zxing.decodeFromCanvas(canvas);
        if (res && res.getText()) {
            return res.getText().trim();
        }
    } catch {
        // ignore
    }

    throw new Error('ไม่พบบาร์โค้ดในภาพ กรุณาถ่ายในที่สว่าง หรือหันบาร์โค้ดให้ตรงกรอบ');
}

export default function InlineBarcodeScanner({
    value,
    onChange,
    onDetected,
    error,
    className,
    autoStart = false,
}: Props) {
    const [cameraOn, setCameraOn] = useState(false);
    const [starting, setStarting] = useState(false);
    const [status, setStatus] = useState('');
    const [localError, setLocalError] = useState('');
    const [secureContext, setSecureContext] = useState(true);
    const [isInApp, setIsInApp] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [detectedFlash, setDetectedFlash] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorLoopRef = useRef<number | null>(null);
    const lastCodeRef = useRef('');
    const handlingRef = useRef(false);

    useEffect(() => {
        setSecureContext(typeof window !== 'undefined' ? window.isSecureContext : true);
        setIsInApp(checkIsInAppBrowser());
    }, []);

    const emitDetected = async (raw: string) => {
        const code = raw.trim();
        if (!code || handlingRef.current) return;
        if (code === lastCodeRef.current) return;
        lastCodeRef.current = code;
        handlingRef.current = true;

        // Sensory Feedback: Beep + Haptic + Green Flash
        playScannerBeep();
        triggerHaptic();
        setDetectedFlash(true);

        onChange(code);
        setStatus(`อ่านรหัสสำเร็จ: ${code}`);
        setLocalError('');

        try {
            await onDetected(code);
            // ปิดกล้องหลังอ่านสำเร็จ 450ms เพื่อให้เห็นกรอบเขียวยืนยัน
            window.setTimeout(() => {
                stopCamera();
                setDetectedFlash(false);
            }, 450);
        } catch {
            setDetectedFlash(false);
        } finally {
            handlingRef.current = false;
            window.setTimeout(() => {
                lastCodeRef.current = '';
            }, 2000);
        }
    };

    const stopCamera = () => {
        if (detectorLoopRef.current) {
            cancelAnimationFrame(detectorLoopRef.current);
            detectorLoopRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setTorchOn(false);
        setHasTorch(false);
        setCameraOn(false);
        setStarting(false);
        setDetectedFlash(false);
    };

    const toggleTorch = async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        if (!track) return;
        try {
            const next = !torchOn;
            await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
                advanced: [{ torch: next }],
            });
            setTorchOn(next);
        } catch {
            // torch not supported on this device
        }
    };

    const switchCamera = () => {
        const next = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(next);
        if (cameraOn) {
            stopCamera();
            window.setTimeout(() => void startCamera(next), 200);
        }
    };

    const startCamera = async (targetFacing = facingMode) => {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            setLocalError(
                'เบราว์เซอร์ไม่อนุญาตให้เปิดกล้องสดผ่าน HTTP ที่ไม่ใช่ localhost\n' +
                '• แนะนำให้เข้าใช้งานผ่านลิงก์ HTTPS: https://fshh-app.online\n' +
                '• หรือแตะปุ่ม "ถ่ายรูปบาร์โค้ดทันที" ด้านล่าง เพื่อเปิดกล้องถ่ายได้ 100%'
            );
            return;
        }
        if (!videoRef.current) return;

        setStarting(true);
        setLocalError('');
        setStatus('กำลังเปิดกล้อง...');

        try {
            stopCamera();

            const stream = await getMediaStreamWithFallback(targetFacing);
            streamRef.current = stream;

            const video = videoRef.current;
            if (video) {
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
                video.muted = true;
                video.autoplay = true;
                video.srcObject = stream;

                try {
                    await video.play();
                } catch (playErr) {
                    console.warn('video.play() rejected (will resume upon loadedmetadata):', playErr);
                }
            }

            // เช็คว่ามีไฟฉาย (Torch) หรือไม่
            const track = stream.getVideoTracks()[0];
            if (track && 'getCapabilities' in track) {
                const caps = (track as MediaStreamTrack & { getCapabilities: () => { torch?: boolean } }).getCapabilities();
                if (caps?.torch) {
                    setHasTorch(true);
                }
            }

            setCameraOn(true);
            setStarting(false);
            setStatus('เล็งบาร์โค้ดให้อยู่ในกรอบ — เส้นเลเซอร์จะตรวจจับอัตโนมัติ');

            // เริ่มต้นระบบตรวจจับบาร์โค้ด (Hybrid: Hardware BarcodeDetector + Canvas ZXing Fallback)
            const nativeDetector = await createSafeBarcodeDetector();
            const zxing = createZxingReader();
            const scanCanvas = document.createElement('canvas');
            const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

            let lastScanTime = 0;
            const loop = async (time: number) => {
                if (!videoRef.current || videoRef.current.readyState < 2 || handlingRef.current) {
                    detectorLoopRef.current = requestAnimationFrame(loop);
                    return;
                }

                // สแกนทุก 80ms สำหรับ Native หรือ 180ms สำหรับ Canvas ZXing
                const scanInterval = nativeDetector ? 80 : 180;
                if (time - lastScanTime > scanInterval) {
                    lastScanTime = time;

                    if (nativeDetector) {
                        try {
                            const barcodes = await nativeDetector.detect(videoRef.current);
                            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                                void emitDetected(barcodes[0].rawValue);
                                return;
                            }
                        } catch {
                            // ignore frame error
                        }
                    } else if (scanCtx && videoRef.current.videoWidth > 0) {
                        try {
                            scanCanvas.width = videoRef.current.videoWidth;
                            scanCanvas.height = videoRef.current.videoHeight;
                            scanCtx.drawImage(videoRef.current, 0, 0, scanCanvas.width, scanCanvas.height);
                            const res = zxing.decodeFromCanvas(scanCanvas);
                            if (res && res.getText()) {
                                void emitDetected(res.getText());
                                return;
                            }
                        } catch {
                            // ignore NotFoundException
                        }
                    }
                }

                detectorLoopRef.current = requestAnimationFrame(loop);
            };

            detectorLoopRef.current = requestAnimationFrame(loop);
        } catch (err: unknown) {
            console.error('Camera open error:', err);
            const errObj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : {};
            const errName = String(errObj.name || (err === false ? 'TimeoutError' : 'Error'));
            const errMsg = String(errObj.message || err || '');

            if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                setLocalError(
                    'สิทธิ์กล้องยังไม่ได้รับการอนุญาต [NotAllowedError]:\n' +
                    '1. แตะที่ไอคอน 🔒 แม่กุญแจหน้าช่องพิมพ์ URL เพื่อเลือก "อนุญาตกล้อง"\n' +
                    '2. ตรวจสอบสิทธิ์ระดับเครื่องมือถือ: ไปที่ การตั้งค่าโทรศัพท์ (Settings) > แอป (Apps) > Chrome หรือ Safari > สิทธิ์ (Permissions) > กล้อง (Camera) > เลือก "อนุญาต"\n' +
                    '3. หรือแตะปุ่ม "ถ่ายรูปบาร์โค้ดทันที" ด้านล่าง เพื่อใช้กล้องระบบโดยตรง 100%'
                );
            } else if (errName === 'SecurityError' || !window.isSecureContext) {
                setLocalError(
                    'เบราว์เซอร์บล็อกกล้องสดบน HTTP [SecurityError]:\n' +
                    'กรุณาเข้าใช้งานผ่าน https://fshh-app.online หรือแตะปุ่ม "ถ่ายรูปบาร์โค้ดทันที" ด้านล่าง'
                );
            } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
                setLocalError(
                    'กล้องกำลังถูกแอปอื่นใช้งานอยู่ [NotReadableError]:\n' +
                    'กรุณาสลับไปปิดแอปกล้องหรือแอปอื่นที่เปิดกล้องค้างไว้ แล้วกดเปิดใหม่อีกครั้ง'
                );
            } else if (errName === 'OverconstrainedError') {
                setLocalError('กล้องในอุปกรณ์ไม่รองรับการตั้งค่าความละเอียดที่ร้องขอ [OverconstrainedError]');
            } else {
                setLocalError(`ไม่สามารถเปิดกล้องได้ [${errName}${errMsg ? `: ${errMsg}` : ''}] กรุณาลองแตะปุ่ม "ถ่ายรูปบาร์โค้ดทันที" ด้านล่าง`);
            }
            stopCamera();
        } finally {
            setStarting(false);
        }
    };

    const scanImage = async (file?: File) => {
        if (!file) return;
        setLocalError('');
        setStatus('กำลังประมวลผลอ่านบาร์โค้ดจากรูป...');
        try {
            const code = await decodeImageUltra(file);
            await emitDetected(code);
        } catch (err) {
            console.warn('Decode image failed:', err);
            setLocalError('อ่านบาร์โค้ดจากรูปไม่ได้ — ลองเปิดกล้องสดเล็งผ่านเส้นเลเซอร์แดง หรือใช้เครื่องยิงบาร์โค้ด');
            setStatus('');
        } finally {
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (autoStart) void startCamera();
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart]);

    const onManualSubmit = (event: FormEvent) => {
        event.preventDefault();
        lastCodeRef.current = '';
        void emitDetected(value);
    };

    const displayError = localError || error || '';

    return (
        <div className={cn('space-y-3', className)}>
            <form onSubmit={onManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        placeholder="ยิงบาร์โค้ดด้วยเครื่องยิง แล้วกด Enter หรือเปิดกล้องสแกน"
                        autoComplete="off"
                        inputMode="text"
                        className="font-mono pr-10"
                    />
                    <ScanLine className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                </div>
                <Button type="submit" variant="secondary" className="font-medium">
                    ค้นหา
                </Button>
            </form>

            {isInApp && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                        <span>📱</span> ตรวจพบว่าคุณเปิดเว็บผ่านแอปแชท (เช่น LINE หรือ Facebook)
                    </div>
                    <p className="mt-1 leading-relaxed">
                        เบราว์เซอร์ในตัวแอปมักจะบล็อกกล้องสดอัตโนมัติ — <b>แนะนำให้แตะที่ปุ่ม 3 จุด (⋮ หรือ ⋯) แล้วเลือก &quot;เปิดด้วยเบราว์เซอร์ภายนอก&quot; (Chrome / Safari)</b> หรือใช้ปุ่มถ่ายรูปด้านล่าง
                    </p>
                </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
                <Button
                    type="button"
                    className={cn(
                        'h-11 font-medium transition-all shadow-sm',
                        cameraOn
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white',
                    )}
                    disabled={starting}
                    onClick={() => (cameraOn ? stopCamera() : void startCamera())}
                >
                    {cameraOn ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                    {cameraOn ? 'ปิดกล้องสแกน' : starting ? 'กำลังเปิดกล้อง...' : 'เปิดกล้องสแกน (เลเซอร์แดง)'}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    className="h-11 border-slate-300 dark:border-slate-700 font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm"
                    onClick={() => imageInputRef.current?.click()}
                >
                    <ImageUp className="mr-2 h-4 w-4 text-violet-600 dark:text-violet-400" />
                    ถ่ายรูป / เลือกไฟล์บาร์โค้ด
                </Button>
            </div>

            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => void scanImage(event.target.files?.[0])}
            />

            {!secureContext && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    💡 <b>คำแนะนำ:</b> ขณะนี้เปิดผ่าน HTTP ทำให้เบราว์เซอร์บล็อกกล้องสดอัตโนมัติ — คุณสามารถใช้ปุ่ม <b>“ถ่ายรูป / เลือกไฟล์บาร์โค้ด”</b> หรือเข้าผ่านโดเมน HTTPS (<b>https://fshh-app.online</b>)
                </div>
            )}

            {/* Viewfinder Container: Play Store Style with animated red laser line */}
            <div
                className={cn(
                    'relative overflow-hidden rounded-3xl border-2 bg-slate-950 shadow-2xl transition-all duration-300',
                    detectedFlash ? 'border-emerald-400 ring-4 ring-emerald-400/40' : 'border-slate-800',
                    cameraOn || starting ? 'block' : 'hidden',
                )}
            >
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
                />

                {/* Play Store Viewfinder Overlay */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    {/* Semi-transparent dark mask around scan target */}
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Central Scan Reticle Box */}
                    <div
                        className={cn(
                            'relative h-[48%] w-[82%] max-w-sm overflow-hidden rounded-2xl border-2 transition-colors duration-200',
                            detectedFlash ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/40',
                        )}
                    >
                        {/* 4 L-shaped Corner Brackets */}
                        <div
                            className={cn(
                                'absolute left-0 top-0 h-6 w-6 border-l-4 border-t-4 transition-colors',
                                detectedFlash ? 'border-emerald-400' : 'border-red-500',
                            )}
                        />
                        <div
                            className={cn(
                                'absolute right-0 top-0 h-6 w-6 border-r-4 border-t-4 transition-colors',
                                detectedFlash ? 'border-emerald-400' : 'border-red-500',
                            )}
                        />
                        <div
                            className={cn(
                                'absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 transition-colors',
                                detectedFlash ? 'border-emerald-400' : 'border-red-500',
                            )}
                        />
                        <div
                            className={cn(
                                'absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 transition-colors',
                                detectedFlash ? 'border-emerald-400' : 'border-red-500',
                            )}
                        />

                        {/* Animated Red Glowing Laser Beam */}
                        <div
                            className={cn(
                                'barcode-laser absolute left-[4%] right-[4%] h-0.5 transition-all',
                                detectedFlash
                                    ? 'barcode-laser-success bg-emerald-400'
                                    : 'bg-red-500',
                            )}
                        />
                    </div>

                    <div className="absolute bottom-4 inset-x-4 text-center">
                        <span className="inline-block rounded-full bg-black/75 px-3 py-1 text-xs font-medium text-white shadow backdrop-blur">
                            {detectedFlash ? '✓ อ่านรหัสสำเร็จ!' : 'เล็งบาร์โค้ดให้อยู่ในกรอบ · สแกนอัตโนมัติ'}
                        </span>
                    </div>
                </div>

                {/* In-Camera Control Toolbar (Close, Torch, Camera Switch) */}
                {cameraOn && (
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                        {hasTorch && (
                            <button
                                type="button"
                                className={cn(
                                    'rounded-full p-2.5 text-white backdrop-blur transition',
                                    torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-black/60 hover:bg-black/80',
                                )}
                                onClick={toggleTorch}
                                title={torchOn ? 'ปิดไฟฉาย' : 'เปิดไฟฉาย'}
                            >
                                {torchOn ? <Flashlight className="h-4 w-4" /> : <FlashlightOff className="h-4 w-4" />}
                            </button>
                        )}

                        <button
                            type="button"
                            className="rounded-full bg-black/60 p-2.5 text-white backdrop-blur hover:bg-black/80 transition"
                            onClick={switchCamera}
                            title="สลับกล้องหน้า/หลัง"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>

                        <button
                            type="button"
                            className="rounded-full bg-black/60 p-2.5 text-white backdrop-blur hover:bg-rose-600 transition"
                            onClick={stopCamera}
                            title="ปิดกล้อง"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {status && !displayError && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {status}
                </p>
            )}

            {displayError && (
                <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/40">
                    <div className="flex items-start gap-2 text-xs font-medium leading-relaxed text-rose-800 dark:text-rose-200 whitespace-pre-line">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <div>{displayError}</div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        className="w-full h-11 rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-medium text-xs shadow-sm transition"
                        onClick={() => imageInputRef.current?.click()}
                    >
                        <ImageUp className="mr-1.5 h-4 w-4" />
                        📸 แตะตรงนี้เพื่อเปิดกล้องมือถือถ่ายบาร์โค้ดทันที (ใช้ได้ 100% ทุกเครื่อง)
                    </Button>
                </div>
            )}
        </div>
    );
}
