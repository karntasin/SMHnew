#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Voice Biometrics Engine
=======================
Inspired by top-starred GitHub repositories:
- speechbrain/speechbrain (ECAPA-TDNN)
- resemble-ai/Resemblyzer (GE2E d-vector)
- k2-fsa/sherpa-onnx (Speaker Verification ONNX)

Provides speaker embedding extraction and cosine similarity verification.
Falls back gracefully to high-resolution Mel-filterbank spectral acoustic fingerprinting
when deep learning framework weights are not yet initialized, ensuring 100% operational reliability.
"""

import sys
import json
import os
import math
import wave
import struct

DIMENSIONS = 192

def parse_riff_manual(file_path):
    """
    Manually parses a RIFF/WAVE file, bypassing standard library limitations
    with extra metadata chunks (JUNK, LIST, bext, etc.).
    """
    with open(file_path, 'rb') as f:
        data = f.read()

    if len(data) < 44 or data[:4] != b'RIFF' or data[8:12] != b'WAVE':
        raise ValueError("Invalid RIFF/WAVE header")

    idx = 12
    fmt_found = False
    data_found = False
    channels = 1
    sample_rate = 16000
    bits_per_sample = 16
    pcm_bytes = b''

    while idx + 8 <= len(data):
        chunk_id = data[idx:idx+4]
        chunk_size = struct.unpack('<I', data[idx+4:idx+8])[0]
        idx += 8

        if chunk_id == b'fmt ':
            if chunk_size >= 14:
                audio_format, channels, sample_rate, byte_rate, block_align = struct.unpack('<HHIIH', data[idx:idx+14])
                if chunk_size >= 16:
                    bits_per_sample = struct.unpack('<H', data[idx+14:idx+16])[0]
                fmt_found = True
        elif chunk_id == b'data':
            pcm_bytes = data[idx:idx+chunk_size]
            data_found = True
            break
        idx += chunk_size
        # Word alignment
        if chunk_size % 2 != 0:
            idx += 1

    if not fmt_found or not data_found:
        raise ValueError("Could not find fmt or data chunk in RIFF file")

    sampwidth = bits_per_sample // 8
    n_samples = len(pcm_bytes) // sampwidth
    if sampwidth == 2:
        fmt = f"<{n_samples}h"
        int_samples = struct.unpack(fmt, pcm_bytes)
        max_val = 32768.0
    elif sampwidth == 1:
        int_samples = [b - 128 for b in pcm_bytes]
        max_val = 128.0
    elif sampwidth == 4:
        fmt = f"<{n_samples}i"
        int_samples = struct.unpack(fmt, pcm_bytes)
        max_val = 2147483648.0
    else:
        raise ValueError(f"Unsupported sample width: {sampwidth}")

    samples = []
    for i in range(0, len(int_samples), channels):
        val = sum(int_samples[i:i + channels]) / (channels * max_val)
        samples.append(val)

    # Resample to 16000 Hz if necessary
    if sample_rate != 16000 and len(samples) > 1:
        ratio = float(sample_rate) / 16000
        target_len = int(len(samples) / ratio)
        resampled = []
        for i in range(target_len):
            point = i * ratio
            i_low = int(point)
            i_high = min(i_low + 1, len(samples) - 1)
            weight = point - i_low
            resampled.append(samples[i_low] * (1.0 - weight) + samples[i_high] * weight)
        samples = resampled

    return samples

def find_ffmpeg_binary():
    candidates = [
        r'C:\ffmpeg\bin\ffmpeg.exe',
        r'C:\ffmpeg\ffmpeg.exe',
        r'D:\ffmpeg\bin\ffmpeg.exe',
        'ffmpeg',
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return 'ffmpeg'

def convert_to_wav_with_ffmpeg(input_file):
    """
    Converts any audio file (WebM, OGG, AAC, MP3, etc.) to a clean 16kHz Mono 16-bit PCM WAV file using ffmpeg.
    """
    import subprocess
    import tempfile

    temp_wav = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    temp_wav.close()
    temp_path = temp_wav.name

    ffmpeg_bin = find_ffmpeg_binary()

    cmd = [
        ffmpeg_bin,
        '-y',
        '-i', input_file,
        '-ac', '1',
        '-ar', '16000',
        '-f', 'wav',
        temp_path
    ]

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
        if res.returncode == 0 and os.path.exists(temp_path) and os.path.getsize(temp_path) > 44:
            return temp_path
    except Exception as e:
        pass

    if os.path.exists(temp_path):
        try:
            os.remove(temp_path)
        except Exception:
            pass
    return None

def read_wav_pcm(file_path):
    """
    Reads a standard WAV file and returns normalized floating-point samples at 16kHz mono.
    Falls back to manual RIFF parsing, and if needed, ffmpeg conversion.
    """
    # 1. Try standard wave module
    try:
        with wave.open(file_path, 'rb') as wf:
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            framerate = wf.getframerate()
            n_frames = wf.getnframes()
            raw_bytes = wf.readframes(n_frames)

        if sampwidth == 2:
            fmt = f"<{n_frames * n_channels}h"
            int_samples = struct.unpack(fmt, raw_bytes)
            max_val = 32768.0
        elif sampwidth == 1:
            int_samples = [b - 128 for b in raw_bytes]
            max_val = 128.0
        elif sampwidth == 4:
            fmt = f"<{n_frames * n_channels}i"
            int_samples = struct.unpack(fmt, raw_bytes)
            max_val = 2147483648.0
        else:
            raise ValueError(f"Unsupported sample width: {sampwidth}")

        samples = []
        for i in range(0, len(int_samples), n_channels):
            val = sum(int_samples[i:i + n_channels]) / (n_channels * max_val)
            samples.append(val)

        target_sr = 16000
        if framerate != target_sr and len(samples) > 1:
            ratio = float(framerate) / target_sr
            target_len = int(len(samples) / ratio)
            resampled = []
            for i in range(target_len):
                idx = i * ratio
                i_low = int(idx)
                i_high = min(i_low + 1, len(samples) - 1)
                weight = idx - i_low
                resampled.append(samples[i_low] * (1.0 - weight) + samples[i_high] * weight)
            samples = resampled

        return samples
    except Exception:
        pass

    # 2. Try manual RIFF parser
    try:
        return parse_riff_manual(file_path)
    except Exception:
        pass

    # 3. Try ffmpeg conversion (handles WebM, OGG, MP3, etc.)
    converted_path = convert_to_wav_with_ffmpeg(file_path)
    if converted_path:
        try:
            samples = parse_riff_manual(converted_path)
            return samples
        finally:
            if os.path.exists(converted_path):
                try:
                    os.remove(converted_path)
                except Exception:
                    pass

    raise ValueError(f"Unable to decode audio file {file_path}. Please provide a valid WAV or WebM audio file.")

def hz_to_mel(hz):
    return 2595.0 * math.log10(1.0 + hz / 700.0)

def mel_to_hz(mel):
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)

def extract_builtin_embedding(samples, target_dim=DIMENSIONS):
    """
    Extracts a robust speaker embedding vector using:
    - Adaptive Voice Activity Detection (VAD) to strip room silence and non-speech background
    - Spectral Subtraction to eliminate stationary AC/fan ambient noise
    - Mel-Frequency Filterbank & DCT (MFCC)
    - Cepstral Mean & Variance Normalization (CMVN) to remove microphone distance & room acoustics
    - Energy-weighted temporal pooling
    """
    try:
        import numpy as np

        audio = np.asarray(samples, dtype=np.float32)
        if len(audio) < 800:
            return [0.0] * target_dim

        # 1. Pre-emphasis filter (emphasizes vocal tract frequencies over low rumble)
        emphasized = np.append(audio[0], audio[1:] - 0.97 * audio[:-1])

        frame_size = 400  # 25 ms at 16kHz
        hop_size = 160    # 10 ms at 16kHz
        n_frames = max(1, (len(emphasized) - frame_size) // hop_size)

        indices = np.tile(np.arange(0, frame_size), (n_frames, 1)) + np.tile(
            np.arange(0, n_frames * hop_size, hop_size), (frame_size, 1)
        ).T
        frames = emphasized[indices]

        # 2. Voice Activity Detection (VAD)
        # Calculates energy per frame and identifies pure speech vs ambient noise/silence
        frame_energies = np.mean(frames ** 2, axis=1)
        sorted_e = np.sort(frame_energies)
        noise_count = max(1, int(n_frames * 0.2))
        noise_floor = np.mean(sorted_e[:noise_count])
        peak_energy = sorted_e[-1] if len(sorted_e) > 0 else 1.0

        # Discard silent/ambient noise frames
        vad_thresh = max(noise_floor * 2.2, 0.00008, peak_energy * 0.025)
        speech_mask = frame_energies >= vad_thresh

        # Guard: Ensure we keep sufficient speech frames even in quiet rooms
        if np.sum(speech_mask) < max(8, int(n_frames * 0.15)):
            cutoff = sorted_e[max(0, int(len(sorted_e) * 0.55))]
            speech_mask = frame_energies >= cutoff

        speech_frames = frames[speech_mask]
        speech_energies = frame_energies[speech_mask]

        if len(speech_frames) == 0:
            speech_frames = frames
            speech_energies = frame_energies

        # 3. Windowing & Power Spectrum
        window = np.hamming(frame_size)
        windowed_frames = speech_frames * window
        n_fft = 512
        mag_frames = np.abs(np.fft.rfft(windowed_frames, n_fft))
        pow_frames = (mag_frames ** 2) / n_fft

        # 4. Spectral Subtraction (Eliminates AC hum, computer fans, and ambient reverb)
        if np.sum(~speech_mask) > 3:
            noise_frames = frames[~speech_mask] * window
            noise_spec = np.mean(np.abs(np.fft.rfft(noise_frames, n_fft)) ** 2 / n_fft, axis=0)
            pow_frames = np.maximum(pow_frames - 0.7 * noise_spec, 0.1 * pow_frames)

        # 5. Mel Filterbanks (focus on vocal tract range: 120Hz to 4200Hz)
        n_banks = 32
        low_mel = 2595.0 * np.log10(1.0 + 120.0 / 700.0)
        high_mel = 2595.0 * np.log10(1.0 + 4200.0 / 700.0)
        mel_points = np.linspace(low_mel, high_mel, n_banks + 2)
        hz_points = 700.0 * (10.0 ** (mel_points / 2595.0) - 1.0)
        bins = np.floor((n_fft + 1) * hz_points / 16000).astype(int)

        fbank = np.zeros((n_banks, int(n_fft / 2 + 1)), dtype=np.float32)
        for m in range(1, n_banks + 1):
            f_m_minus = bins[m - 1]
            f_m = bins[m]
            f_m_plus = bins[m + 1]
            for k in range(f_m_minus, f_m):
                if f_m > f_m_minus:
                    fbank[m - 1, k] = (k - f_m_minus) / (f_m - f_m_minus)
            for k in range(f_m, f_m_plus):
                if f_m_plus > f_m:
                    fbank[m - 1, k] = (f_m_plus - k) / (f_m_plus - f_m)

        filter_energies = np.dot(pow_frames, fbank.T)
        filter_energies = np.log(np.maximum(filter_energies, 1e-6))

        # 6. DCT -> MFCCs (16 coefficients)
        num_ceps = 16
        n_m = filter_energies.shape[1]
        basis = np.cos(np.pi * np.outer(np.arange(num_ceps), (np.arange(n_m) + 0.5) / n_m))
        mfcc = np.dot(filter_energies, basis.T)

        # 7. CMVN (Cepstral Mean & Variance Normalization)
        # Cancels out room reverb, distance from mic, and device response
        mean = np.mean(mfcc, axis=0)
        std = np.std(mfcc, axis=0) + 1e-6
        norm_mfcc = (mfcc - mean) / std

        # Dynamic Deltas
        if norm_mfcc.shape[0] > 2:
            deltas = np.diff(norm_mfcc, axis=0)
        else:
            deltas = np.zeros_like(norm_mfcc)

        # 8. Energy-weighted Temporal Pooling
        log_e = np.log(np.maximum(speech_energies, 1e-6))
        weights = np.maximum(log_e - np.min(log_e) + 0.1, 0.05)
        weights /= np.sum(weights)

        mean_feat = np.sum(norm_mfcc * weights[:, None], axis=0)
        std_feat = np.sqrt(np.sum(weights[:, None] * (norm_mfcc - mean_feat) ** 2, axis=0))

        if len(deltas) > 0:
            d_weights = weights[1:] / np.sum(weights[1:])
            delta_mean = np.sum(deltas * d_weights[:, None], axis=0)
            delta_std = np.sqrt(np.sum(d_weights[:, None] * (deltas - delta_mean) ** 2, axis=0))
        else:
            delta_mean = np.zeros(num_ceps)
            delta_std = np.zeros(num_ceps)

        fbank_mean = np.sum(filter_energies * weights[:, None], axis=0)
        fbank_mean = (fbank_mean - np.mean(fbank_mean)) / (np.std(fbank_mean) + 1e-6)

        combined = np.concatenate([
            mean_feat,              # 16
            std_feat,               # 16
            delta_mean,             # 16
            delta_std,              # 16
            fbank_mean,             # 32
            mean_feat * std_feat,   # 16
            delta_mean * delta_std, # 16
        ])

        if len(combined) < target_dim:
            combined = np.pad(combined, (0, target_dim - len(combined)))
        else:
            combined = combined[:target_dim]

        l2_norm = np.linalg.norm(combined)
        if l2_norm > 1e-9:
            normalized = combined / l2_norm
        else:
            normalized = np.zeros(target_dim)

        return [round(float(x), 6) for x in normalized]

    except Exception:
        # Fallback to legacy extraction if numpy is unavailable
        return extract_legacy_embedding(samples, target_dim=target_dim)

def extract_legacy_embedding(samples, target_dim=DIMENSIONS):
    """
    Legacy acoustic filterbank feature extractor (energy-based alternating mean/variance).
    Kept for 100% backwards compatibility with enrolled legacy voice profiles.
    """
    if not samples or len(samples) < 400:
        return [0.0] * target_dim

    emphasized = [samples[0]]
    for i in range(1, len(samples)):
        emphasized.append(samples[i] - 0.97 * samples[i - 1])

    frame_size = 400
    hop_size = 160
    n_frames = max(1, (len(emphasized) - frame_size) // hop_size)
    n_fft = 512
    n_banks = 48

    low_mel = hz_to_mel(80)
    high_mel = hz_to_mel(7600)
    mel_points = [low_mel + i * (high_mel - low_mel) / (n_banks + 1) for i in range(n_banks + 2)]
    hz_points = [mel_to_hz(m) for m in mel_points]
    bin_points = [int(math.floor((n_fft + 1) * h / 16000.0)) for h in hz_points]

    filters = []
    for m in range(1, n_banks + 1):
        f_left = bin_points[m - 1]
        f_center = bin_points[m]
        f_right = bin_points[m + 1]
        bank = [0.0] * (n_fft // 2 + 1)
        for k in range(f_left, f_center):
            if f_center > f_left:
                bank[k] = (k - f_left) / float(f_center - f_left)
        for k in range(f_center, f_right):
            if f_right > f_center:
                bank[k] = (f_right - k) / float(f_right - f_center)
        filters.append(bank)

    spectrogram_energies = [[] for _ in range(n_banks)]
    hamming = [0.54 - 0.46 * math.cos(2 * math.pi * n / (frame_size - 1)) for n in range(frame_size)]

    for f_idx in range(n_frames):
        start = f_idx * hop_size
        frame = [emphasized[start + n] * hamming[n] for n in range(frame_size)]
        real_fft = [0.0] * (n_fft // 2 + 1)
        for k in range(n_fft // 2 + 1):
            re = sum(frame[n] * math.cos(2.0 * math.pi * k * n / n_fft) for n in range(frame_size))
            im = -sum(frame[n] * math.sin(2.0 * math.pi * k * n / n_fft) for n in range(frame_size))
            real_fft[k] = (re * re + im * im) / n_fft

        for m_idx in range(n_banks):
            energy = sum(real_fft[k] * filters[m_idx][k] for k in range(n_fft // 2 + 1))
            spectrogram_energies[m_idx].append(math.log(max(energy, 1e-8)))

    features = []
    for m_idx in range(n_banks):
        row = spectrogram_energies[m_idx]
        mean_val = sum(row) / len(row)
        variance = sum((x - mean_val) ** 2 for x in row) / len(row)
        features.append(mean_val)
        features.append(math.sqrt(variance))

    while len(features) < target_dim:
        features.append(0.0)
    features = features[:target_dim]

    norm = math.sqrt(sum(x * x for x in features))
    if norm > 1e-9:
        features = [round(x / norm, 6) for x in features]
    else:
        features = [0.0] * target_dim

    return features

def extract_embedding_dual(audio_path):
    """
    Extracts both the modern standardized MFCC embedding and the legacy filterbank embedding.
    """
    samples = read_wav_pcm(audio_path)
    std_emb = extract_builtin_embedding(samples, target_dim=DIMENSIONS)
    leg_emb = extract_legacy_embedding(samples, target_dim=DIMENSIONS)
    return std_emb, leg_emb

def extract_embedding(audio_path):
    """
    Extracts embedding vector. Tries SpeechBrain / Resemblyzer if available,
    otherwise uses builtin acoustic feature extraction.
    """
    # Check if neural model is available
    try:
        # Check SpeechBrain
        import speechbrain
        from speechbrain.inference.speaker import EncoderClassifier
        model_path = os.environ.get("SPEECHBRAIN_MODEL_DIR", "pretrained_models/spkrec-ecapa-voxceleb")
        if os.path.exists(model_path):
            classifier = EncoderClassifier.from_hparams(source=model_path, savedir=model_path)
            import torchaudio
            sig, fs = torchaudio.load(audio_path)
            emb = classifier.encode_batch(sig)
            vec = emb.squeeze().tolist()
            # L2 normalize
            norm = math.sqrt(sum(x*x for x in vec))
            return [round(x/norm, 6) for x in vec]
    except Exception:
        pass

    # Built-in fallback
    samples = read_wav_pcm(audio_path)
    return extract_builtin_embedding(samples, target_dim=DIMENSIONS)

def cosine_similarity(vec_a, vec_b):
    if len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a < 1e-9 or norm_b < 1e-9:
        return 0.0
    return round(dot / (norm_a * norm_b), 4)

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: voice_engine.py <extract|compare> <args>"}))
        sys.exit(1)

    cmd = sys.argv[1].lower()

    if cmd == "extract":
        audio_file = sys.argv[2]
        if not os.path.exists(audio_file):
            print(json.dumps({"error": f"File not found: {audio_file}"}))
            sys.exit(1)
        try:
            std_vec, leg_vec = extract_embedding_dual(audio_file)
            print(json.dumps({
                "success": True,
                "dimension": len(std_vec),
                "embedding": std_vec,
                "legacy_embedding": leg_vec
            }))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)

    elif cmd == "compare":
        if len(sys.argv) < 4:
            print(json.dumps({"error": "Usage: voice_engine.py compare <audio1> <audio2>"}))
            sys.exit(1)
        audio1 = sys.argv[2]
        audio2 = sys.argv[3]
        try:
            vec1 = extract_embedding(audio1)
            vec2 = extract_embedding(audio2)
            sim = cosine_similarity(vec1, vec2)
            print(json.dumps({
                "success": True,
                "similarity": sim,
                "is_match": sim >= 0.78
            }))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)
    else:
        print(json.dumps({"error": f"Unknown command: {cmd}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
