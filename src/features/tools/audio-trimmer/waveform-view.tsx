"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { WaveformPeaks } from "@/lib/audio";

type WaveformViewProps = {
  peaks: WaveformPeaks;
  duration: number;
  selectionStart: number;
  selectionEnd: number;
  playhead: number;
  disabled?: boolean;
  /** `edge` is omitted when the whole selection was dragged (moved as a block). */
  onSelectionChange: (next: { start: number; end: number }, edge?: "start" | "end") => void;
  onSeek: (time: number) => void;
};

const canvasHeight = 140;
const handleHitSlop = 18; // px on each side of a handle line that still counts as "grabbing that handle"

/**
 * Renders the actual decoded waveform (from `computeWaveformPeaks`) on a single canvas — never
 * one DOM node per sample — plus draggable start/end handles as real DOM elements layered on
 * top, so they get proper focus, ARIA, and large touch targets without any canvas hit-testing.
 */
export function WaveformView({
  peaks,
  duration,
  selectionStart,
  selectionEnd,
  playhead,
  disabled = false,
  onSelectionChange,
  onSeek,
}: WaveformViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<
    | { mode: "start" | "end" | "region"; pointerId: number; rectLeft: number; rectWidth: number; regionOffsetStart?: number; regionSpan?: number }
    | null
  >(null);

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
    const safeDuration = duration > 0 ? duration : 1;
    const selStartRatio = selectionStart / safeDuration;
    const selEndRatio = selectionEnd / safeDuration;

    const barWidth = width / bucketCount;

    for (let i = 0; i < bucketCount; i += 1) {
      const bucketRatio = i / bucketCount;
      const isSelected = bucketRatio >= selStartRatio && bucketRatio <= selEndRatio;
      const x = i * barWidth;
      const top = midY + min[i] * scaleY;
      const bottom = midY + max[i] * scaleY;

      ctx.fillStyle = isSelected ? "rgba(45, 212, 191, 0.85)" : "rgba(148, 163, 184, 0.35)";
      ctx.fillRect(x, Math.min(top, bottom), Math.max(1, barWidth - 0.5), Math.max(1, Math.abs(bottom - top)));
    }

    // Playhead
    const playheadX = (playhead / safeDuration) * width;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [peaks, duration, selectionStart, selectionEnd, playhead]);

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

  const timeFromClientX = (clientX: number, rectLeft: number, rectWidth: number) => {
    if (rectWidth <= 0) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rectLeft) / rectWidth));
    return ratio * duration;
  };

  const beginHandleDrag = (edge: "start" | "end") => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode: edge, pointerId: event.pointerId, rectLeft: rect.left, rectWidth: rect.width };
  };

  const beginRegionDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "region",
      pointerId: event.pointerId,
      rectLeft: rect.left,
      rectWidth: rect.width,
      regionOffsetStart: timeFromClientX(event.clientX, rect.left, rect.width) - selectionStart,
      regionSpan: selectionEnd - selectionStart,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const time = timeFromClientX(event.clientX, drag.rectLeft, drag.rectWidth);

    if (drag.mode === "start") {
      onSelectionChange({ start: time, end: selectionEnd }, "start");
    } else if (drag.mode === "end") {
      onSelectionChange({ start: selectionStart, end: time }, "end");
    } else if (drag.mode === "region" && drag.regionOffsetStart !== undefined && drag.regionSpan !== undefined) {
      const nextStart = time - drag.regionOffsetStart;
      onSelectionChange({ start: nextStart, end: nextStart + drag.regionSpan });
    }
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const handleBackgroundClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || dragRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    onSeek(timeFromClientX(event.clientX, rect.left, rect.width));
  };

  const safeDuration = duration > 0 ? duration : 1;
  const startPercent = (selectionStart / safeDuration) * 100;
  const endPercent = (selectionEnd / safeDuration) * 100;

  const nudgeHandle = (edge: "start" | "end") => (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 1 : 0.05;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (edge === "start") onSelectionChange({ start: selectionStart - step, end: selectionEnd }, "start");
      else onSelectionChange({ start: selectionStart, end: selectionEnd - step }, "end");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (edge === "start") onSelectionChange({ start: selectionStart + step, end: selectionEnd }, "start");
      else onSelectionChange({ start: selectionStart, end: selectionEnd + step }, "end");
    }
  };

  return (
    <div
      className="relative touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-[#080b1a]/80"
      onPointerDown={handleBackgroundClick}
      ref={containerRef}
      style={{ height: canvasHeight }}
    >
      <canvas aria-hidden="true" className="absolute inset-0 h-full w-full" ref={canvasRef} />

      {/* Dimmed regions outside the selection, layered above the canvas for a clear visual cut line. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 bg-[#080b1a]/60" style={{ width: `${startPercent}%` }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 bg-[#080b1a]/60" style={{ width: `${100 - endPercent}%` }} />

      {/* Draggable region body (between the two handles) — repositions the whole selection. */}
      <div
        className="absolute inset-y-0 cursor-grab active:cursor-grabbing"
        onPointerCancel={endDrag}
        onPointerDown={beginRegionDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        style={{ left: `${startPercent}%`, width: `${Math.max(0, endPercent - startPercent)}%` }}
      />

      {(["start", "end"] as const).map((edge) => (
        <div
          aria-label={edge === "start" ? "Selection start handle" : "Selection end handle"}
          aria-valuemax={duration}
          aria-valuemin={0}
          aria-valuenow={edge === "start" ? selectionStart : selectionEnd}
          className="absolute inset-y-0 flex w-6 -translate-x-1/2 cursor-ew-resize items-center justify-center focus:outline-none"
          key={edge}
          onKeyDown={nudgeHandle(edge)}
          onPointerCancel={endDrag}
          onPointerDown={beginHandleDrag(edge)}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          role="slider"
          style={{ left: `${edge === "start" ? startPercent : endPercent}%`, padding: `0 ${handleHitSlop}px` }}
          tabIndex={disabled ? -1 : 0}
        >
          <span className="pointer-events-none h-full w-1.5 rounded-full bg-teal-300 shadow-[0_0_0_3px_rgba(45,212,191,0.25)] ring-2 ring-[#060816]" />
        </div>
      ))}
    </div>
  );
}
