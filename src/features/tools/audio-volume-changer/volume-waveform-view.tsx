"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { WaveformPeaks } from "@/lib/audio";

type VolumeWaveformViewProps = {
  peaks: WaveformPeaks;
  duration: number;
  playhead: number;
  /** Linear gain to preview visually — bars are scaled (and clamped to the canvas's ±1 range,
   *  same as the actual processing will clamp samples) rather than recomputing a whole second
   *  waveform, so this stays just as cheap as the original render. */
  gain: number;
  onSeek: (time: number) => void;
};

const canvasHeight = 120;

/**
 * Read-only waveform display for Audio Volume Changer — same minimal shape as Audio Speed
 * Changer's waveform view (no drag handles, nothing to select), but the bars are additionally
 * scaled by `gain` so the envelope visually previews how loud/clipped the result would look,
 * without ever touching the underlying peak data or recomputing anything expensive.
 */
export function VolumeWaveformView({ peaks, duration, playhead, gain, onSeek }: VolumeWaveformViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = container.clientWidth;
    const height = canvasHeight;

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { min, max } = peaks;
    const bucketCount = min.length;
    if (bucketCount === 0 || width === 0) return;

    const midY = height / 2;
    const scaleY = height / 2 - 4;
    const barWidth = width / bucketCount;
    const safeGain = Number.isFinite(gain) && gain > 0 ? gain : 1;

    for (let i = 0; i < bucketCount; i += 1) {
      const x = i * barWidth;
      const scaledMin = Math.max(-1, Math.min(1, min[i] * safeGain));
      const scaledMax = Math.max(-1, Math.min(1, max[i] * safeGain));
      const clipped = Math.abs(min[i] * safeGain) > 1 || Math.abs(max[i] * safeGain) > 1;
      const top = midY + scaledMin * scaleY;
      const bottom = midY + scaledMax * scaleY;
      ctx.fillStyle = clipped ? "rgba(248, 113, 113, 0.85)" : "rgba(45, 212, 191, 0.7)";
      ctx.fillRect(x, Math.min(top, bottom), Math.max(1, barWidth - 0.5), Math.max(1, Math.abs(bottom - top)));
    }

    const safeDuration = duration > 0 ? duration : 1;
    const playheadX = (playhead / safeDuration) * width;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [peaks, duration, playhead, gain]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  const handleClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onSeek(ratio * (duration > 0 ? duration : 0));
  };

  return (
    <div
      className="relative touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-[#080b1a]/80"
      onPointerDown={handleClick}
      ref={containerRef}
      style={{ height: canvasHeight }}
    >
      <canvas aria-hidden="true" className="absolute inset-0 h-full w-full" ref={canvasRef} />
    </div>
  );
}
