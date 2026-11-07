"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { WaveformPeaks } from "@/lib/audio";

type StaticWaveformViewProps = {
  peaks: WaveformPeaks;
  duration: number;
  playhead: number;
  onSeek: (time: number) => void;
  /** Optional overlay, e.g. a fade envelope. Returns gain (0-1) at a 0-1 position through the clip. */
  envelopeAt?: (position: number) => number;
};

const canvasHeight = 120;

/**
 * A read-only waveform (no selection handles) with a seekable playhead — the shared view for
 * tools that process a whole clip rather than a selected range (Reverse, Fade). Reuses
 * `computeWaveformPeaks`'s output, like the selectable `WaveformView` used by Trimmer/Joiner.
 */
export function StaticWaveformView({ peaks, duration, playhead, onSeek, envelopeAt }: StaticWaveformViewProps) {
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

    for (let i = 0; i < bucketCount; i += 1) {
      const x = i * barWidth;
      const envelope = envelopeAt ? envelopeAt(i / bucketCount) : 1;
      const top = midY + min[i] * scaleY * envelope;
      const bottom = midY + max[i] * scaleY * envelope;

      ctx.fillStyle = envelope < 0.999 ? "rgba(148, 163, 184, 0.45)" : "rgba(45, 212, 191, 0.85)";
      ctx.fillRect(x, Math.min(top, bottom), Math.max(1, barWidth - 0.5), Math.max(1, Math.abs(bottom - top)));
    }

    if (envelopeAt) {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const gain = envelopeAt(x / width);
        const y = height - gain * (height - 6) - 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const safeDuration = duration > 0 ? duration : 1;
    const playheadX = (playhead / safeDuration) * width;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [peaks, duration, playhead, envelopeAt]);

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
    onSeek(ratio * duration);
  };

  return (
    <div
      className="relative touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-[#080b1a]/80"
      onPointerDown={handleClick}
      ref={containerRef}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={playhead}
      style={{ height: canvasHeight }}
    >
      <canvas aria-hidden="true" className="absolute inset-0 h-full w-full" ref={canvasRef} />
    </div>
  );
}
