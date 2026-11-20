/**
 * Face Detection, Landmark Tracking, Blink Liveness & 128-d Embedding Extraction
 * Powered by @vladmandic/face-api
 */

import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelLoadingPromise: Promise<void> | null = null;

export async function loadFaceApiModels(): Promise<void> {
    if (modelsLoaded) return;
    if (modelLoadingPromise) return modelLoadingPromise;

    modelLoadingPromise = (async () => {
        const MODEL_URL = '/models/face';
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL).catch(() => null),
                faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            modelsLoaded = true;
        } catch (err) {
            console.error('Failed to load local face models:', err);
            // Fallback attempt
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            modelsLoaded = true;
        }
    })();

    return modelLoadingPromise;
}

/**
 * Calculate Eye Aspect Ratio (EAR) for blink detection
 */
export function calculateEyeAspectRatio(eyePoints: faceapi.Point[]): number {
    if (eyePoints.length < 6) return 0.3;

    // Vertical distances
    const p2_p6 = Math.hypot(eyePoints[1].x - eyePoints[5].x, eyePoints[1].y - eyePoints[5].y);
    const p3_p5 = Math.hypot(eyePoints[2].x - eyePoints[4].x, eyePoints[2].y - eyePoints[4].y);

    // Horizontal distance
    const p1_p4 = Math.hypot(eyePoints[0].x - eyePoints[3].x, eyePoints[0].y - eyePoints[3].y);

    if (p1_p4 < 1e-6) return 0.3;
    return (p2_p6 + p3_p5) / (2.0 * p1_p4);
}

export interface FaceDetectionResult {
    detected: boolean;
    box?: { x: number; y: number; width: number; height: number };
    score?: number;
    ear?: number;
    isBlinking?: boolean;
    isCentered?: boolean;
    descriptor?: number[]; // 128-dimensional embedding vector
    landmarks?: faceapi.Point[];
}

/**
 * Detect face with high sensitivity and dual-engine fallback (Tiny 320 + SSD MobileNet V1)
 */
export async function detectFace(
    video: HTMLVideoElement,
    extractDescriptor: boolean = false
): Promise<FaceDetectionResult> {
    if (!modelsLoaded) {
        await loadFaceApiModels();
    }

    if (video.paused || video.ended || video.readyState < 2) {
        return { detected: false };
    }

    let result: any = null;

    // 1. Primary detector: High-sensitivity TinyFaceDetector (inputSize 320 for balanced range, threshold 0.28)
    try {
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.28 });
        let detectionQuery: any = faceapi.detectSingleFace(video, options).withFaceLandmarks(true);
        if (extractDescriptor) {
            detectionQuery = detectionQuery.withFaceDescriptor();
        }
        result = await detectionQuery;
    } catch (e) {
        console.warn('Tiny detector error:', e);
    }

    // 2. High-accuracy fallback: Google SSD MobileNet V1 (if tiny misses due to difficult lighting / angle)
    if (!result && faceapi.nets.ssdMobilenetv1.isLoaded) {
        try {
            const ssdOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.30 });
            let ssdQuery: any = faceapi.detectSingleFace(video, ssdOptions).withFaceLandmarks(true);
            if (extractDescriptor) {
                ssdQuery = ssdQuery.withFaceDescriptor();
            }
            result = await ssdQuery;
        } catch (e) {
            console.warn('SSD detector fallback error:', e);
        }
    }

    if (!result) {
        return { detected: false };
    }

    const box = result.detection.box;
    const landmarks = result.landmarks.positions;
    const score = result.detection.score ?? 0.85;

    // Left eye (indices 36-41) and Right eye (indices 42-47)
    const leftEye = landmarks.slice(36, 42);
    const rightEye = landmarks.slice(42, 48);

    const leftEAR = calculateEyeAspectRatio(leftEye);
    const rightEAR = calculateEyeAspectRatio(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2.0;

    // Check if face is reasonably in view (relaxed boundaries for natural mobile/desktop camera angles)
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;

    const isCentered =
        faceCenterX > videoWidth * 0.10 &&
        faceCenterX < videoWidth * 0.90 &&
        faceCenterY > videoHeight * 0.10 &&
        faceCenterY < videoHeight * 0.90 &&
        box.width > videoWidth * 0.08;

    const isBlinking = avgEAR < 0.21;

    return {
        detected: true,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        score,
        ear: avgEAR,
        isBlinking,
        isCentered,
        descriptor: result.descriptor ? Array.from(result.descriptor) : undefined,
        landmarks,
    };
}

/**
 * Capture high-quality cropped facial snapshot as Base64 JPEG
 */
export function captureFaceSnapshot(
    video: HTMLVideoElement,
    box?: { x: number; y: number; width: number; height: number }
): string {
    const canvas = document.createElement('canvas');
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    if (box) {
        // Expand bounding box slightly for pleasant portrait crop
        const padX = box.width * 0.25;
        const padY = box.height * 0.35;
        const cropX = Math.max(0, box.x - padX);
        const cropY = Math.max(0, box.y - padY);
        const cropW = Math.min(vw - cropX, box.width + padX * 2);
        const cropH = Math.min(vh - cropY, box.height + padY * 2);

        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, 300, 300);
        }
    } else {
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, vw, vh, 0, 0, 300, 300);
        }
    }

    return canvas.toDataURL('image/jpeg', 0.85);
}

export interface CameraPermissionState {
    status: 'granted' | 'prompt' | 'denied' | 'unsupported';
    message?: string;
}

/**
 * Check browser camera permission status
 */
export async function checkCameraPermission(): Promise<CameraPermissionState> {
    if (typeof window === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
        return { status: 'unsupported' };
    }

    try {
        const res = await navigator.permissions.query({ name: 'camera' as any });
        return { status: res.state as 'granted' | 'prompt' | 'denied' };
    } catch {
        return { status: 'unsupported' };
    }
}

/**
 * Request camera stream with mobile-optimized constraints and cascading fallbacks
 * Compatible with Apple iOS Safari, Android Chrome, and Desktop Webcams
 */
export async function requestCameraStream(facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream> {
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (typeof window !== 'undefined' && !window.isSecureContext && !isLocalhost) {
        const error = new Error('เบราว์เซอร์ไม่อนุญาตให้เปิดกล้องผ่าน HTTP บน IP กรุณาเข้าใช้งานผ่าน HTTPS (https://...)');
        (error as any).code = 'INSECURE_CONTEXT';
        throw error;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const error = new Error('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง (ต้องใช้งานผ่าน HTTPS หรือ localhost)');
        (error as any).code = 'UNSUPPORTED';
        throw error;
    }

    // Attempt 1: Ideal 640x480 with specified facing mode
    try {
        return await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: facingMode },
                width: { ideal: 640 },
                height: { ideal: 480 },
            },
            audio: false,
        });
    } catch (err1: any) {
        if (err1.name === 'NotAllowedError' || err1.name === 'PermissionDeniedError') {
            const error = new Error('กล้องถูกปฏิเสธการเข้าถึง');
            (error as any).code = 'PERMISSION_DENIED';
            throw error;
        }

        // Attempt 2: Relaxed resolution constraint for older iOS Safari / Android models
        try {
            return await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false,
            });
        } catch (err2: any) {
            if (err2.name === 'NotAllowedError' || err2.name === 'PermissionDeniedError') {
                const error = new Error('กล้องถูกปฏิเสธการเข้าถึง');
                (error as any).code = 'PERMISSION_DENIED';
                throw error;
            }

            // Attempt 3: Bare video constraint
            try {
                return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            } catch (err3: any) {
                if (err3.name === 'NotAllowedError' || err3.name === 'PermissionDeniedError') {
                    const error = new Error('กล้องถูกปฏิเสธการเข้าถึง');
                    (error as any).code = 'PERMISSION_DENIED';
                    throw error;
                } else if (err3.name === 'NotFoundError' || err3.name === 'DevicesNotFoundError') {
                    const error = new Error('ไม่พบอุปกรณ์กล้องบนอุปกรณ์นี้');
                    (error as any).code = 'NO_CAMERA';
                    throw error;
                } else if (err3.name === 'NotReadableError' || err3.name === 'TrackStartError') {
                    const error = new Error('กล้องกำลังถูกใช้งานโดยแอปพลิเคชันอื่น กรุณาปิดแอปอื่นแล้วลองใหม่');
                    (error as any).code = 'CAMERA_IN_USE';
                    throw error;
                }
                throw err3;
            }
        }
    }
}
