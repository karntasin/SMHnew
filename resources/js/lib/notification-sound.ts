/**
 * Notification Sound Player (Web Audio API Synthesizer)
 * Generates an elegant, crystal-clear chime suitable for medical and hospital environments.
 */

const STORAGE_KEY = 'fshh_notification_sound_muted';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

export function isSoundMuted(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setSoundMuted(muted: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
}

/**
 * Play a double-bell crystal chime sound
 */
export function playChimeSound(force = false): void {
    if (!force && isSoundMuted()) {
        return;
    }

    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Note 1: E6 (1318.51 Hz) - high gentle bell
        playTone(ctx, 1318.51, now, 0.45, 0.18);

        // Note 2: B6 (1975.53 Hz) - crystalline harmonic
        playTone(ctx, 1975.53, now + 0.12, 0.6, 0.22);
    } catch (e) {
        console.warn('Audio chime playback blocked or not supported yet', e);
    }
}

function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number, gainVal: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
}
