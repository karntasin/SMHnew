import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    stream: MediaStream | null;
    isRecording: boolean;
    className?: string;
    barColor?: string;
}

export default function AudioVisualizer({
    stream,
    isRecording,
    className = 'w-full h-24',
    barColor = '#3b82f6',
}: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isRecording || !stream) {
            if (animIdRef.current) {
                cancelAnimationFrame(animIdRef.current);
                animIdRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => {});
                audioContextRef.current = null;
            }

            // Draw flat idle line
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#9ca3af33';
                    ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
                }
            }
            return;
        }

        try {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const draw = () => {
                animIdRef.current = requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const width = canvas.width;
                const height = canvas.height;
                const barCount = 28;
                const barWidth = (width / barCount) * 0.65;
                const spacing = (width / barCount) * 0.35;

                for (let i = 0; i < barCount; i++) {
                    const dataIndex = Math.floor((i / barCount) * bufferLength);
                    const rawValue = dataArray[dataIndex] || 0;
                    const percent = rawValue / 255;
                    const barHeight = Math.max(4, percent * height * 0.9);

                    const x = i * (barWidth + spacing) + spacing / 2;
                    const y = (height - barHeight) / 2;

                    // Gradient for modern sleek look
                    const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
                    grad.addColorStop(0, '#8b5cf6');
                    grad.addColorStop(0.5, barColor);
                    grad.addColorStop(1, '#06b6d4');

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth, barHeight, 4);
                    ctx.fill();
                }
            };

            draw();
        } catch (err) {
            console.error('Audio visualizer init error:', err);
        }

        return () => {
            if (animIdRef.current) {
                cancelAnimationFrame(animIdRef.current);
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => {});
            }
        };
    }, [isRecording, stream, barColor]);

    return (
        <canvas
            ref={canvasRef}
            width={360}
            height={90}
            className={`rounded-xl bg-gray-50/50 dark:bg-gray-900/50 ${className}`}
        />
    );
}
