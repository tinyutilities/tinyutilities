"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { WaveformPeaks } from "@/lib/audio";

type SpeedWaveformViewProps = {
  peaks: WaveformPeaks;
  /** Duration of whatever is CURRENTLY playing back (changes with speed during preview) — the
   *  playhead position is expressed in this same timeline. */
  duration: number;
  playhead: number;
  onSeek: (time: number) => void;
};

const canvasHeight = 120;

/**
 * A read-only waveform display — no drag handles, no selection region. Audio Speed Changer has
 * nothing to select (the whole clip always plays), so this intentionally stays much simpler than
 * Audio Trimmer's `WaveformView`: just the envelope plus a click-to-seek playhead.
 */
export function SpeedWaveformView({ peaks, duration, playhead, onSeek }: SpeedWaveformViewProps) {
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
      const top = midY + min[i] * scaleY;
      const bottom = midY + max[i] * scaleY;
      ctx.fillStyle = "rgba(45, 212, 191, 0.7)";
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
  }, [peaks, duration, playhead]);

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
