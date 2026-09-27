"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  buildDownloadFilename,
  ErrorCard,
  FilenameField,
  formatBytes,
  ProcessingState,
  SuccessCard,
  UploadCard,
} from "@/components/upload";
import type { UploadPhase } from "@/components/upload";
import {
  clampSelection,
  computeWaveformPeaks,
  decodeAudioFile,
  encodeWavBlob,
  formatTime,
  fullSelection,
  maxUploadFileBytes,
  parseTimeInput,
  useAudioPlayback,
} from "@/lib/audio";
import type { TimeSelection, WaveformPeaks } from "@/lib/audio";
import { WaveformView } from "./waveform-view";

const defaultFilenameBase = "TinyUtility-trimmed";
/** Fixed resolution for the computed waveform — plenty of detail at any display width without
 *  recomputing on resize (the canvas just maps these buckets across whatever width it has). */
const waveformBucketCount = 1200;

type DecodedAudio = {
  file: File;
  buffer: AudioBuffer;
  peaks: WaveformPeaks;
};

function channelLabel(count: number) {
  if (count === 1) return "Mono";
  if (count === 2) return "Stereo";
  return `${count} channels`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function AudioTrimmerTool() {
  const startInputId = useId();
  const endInputId = useId();
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [audio, setAudio] = useState<DecodedAudio | null>(null);
  const [selection, setSelection] = useState<TimeSelection>({ start: 0, end: 0 });
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; duration: number } | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [draftEnd, setDraftEnd] = useState<string | null>(null);

  const playback = useAudioPlayback(audio?.buffer ?? null);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;
  const hasValidSelection = audio !== null && selection.end - selection.start > 0;

  // Any time the selection edges actually change (drag, numeric edit, or a fresh file), stop
  // playback and reset the visible playhead to the new start — a source mid-playback can't have
  // its stop point changed once started, so "adjust selection while playing" is handled by
  // cleanly restarting from the new range rather than trying to mutate the live source.
  useEffect(() => {
    playback.seek(selection.start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.start, selection.end]);

  const addFile = async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];
    if (!file) return;

    setResult(null);
    setErrorMessage(null);
    setAudio(null);

    if (file.size === 0) {
      setPhase("error");
      setErrorMessage("This file is empty.");
      return;
    }

    if (file.size > maxUploadFileBytes) {
      setPhase("error");
      setErrorMessage("That audio file is too large to process safely in your browser.");
      return;
    }

    setPhase("preparing");

    const outcome = await decodeAudioFile(file);

    if (!outcome.ok) {
      setPhase("error");
      setErrorMessage(outcome.error.message);
      return;
    }

    const peaks = computeWaveformPeaks(outcome.buffer, waveformBucketCount);

    setAudio({ file, buffer: outcome.buffer, peaks });
    setSelection(fullSelection(outcome.buffer.duration));
    setFilenameBase(defaultFilenameBase);
    setPhase("idle");
  };

  const clearAll = () => {
    playback.seek(0);
    setAudio(null);
    setSelection({ start: 0, end: 0 });
    setPhase("idle");
    setErrorMessage(null);
    setResult(null);
    setJustDownloaded(false);
    setDraftStart(null);
    setDraftEnd(null);
  };

  const backToEditing = () => {
    setResult(null);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const updateSelection = (next: TimeSelection, edge?: "start" | "end") => {
    if (!audio) return;
    setSelection(clampSelection(next, audio.buffer.duration, edge ?? "both"));
  };

  const commitDraftStart = () => {
    if (draftStart === null || !audio) {
      setDraftStart(null);
      return;
    }
    const parsed = parseTimeInput(draftStart);
    if (parsed !== null) {
      updateSelection({ start: parsed, end: selection.end }, "start");
    }
    setDraftStart(null);
  };

  const commitDraftEnd = () => {
    if (draftEnd === null || !audio) {
      setDraftEnd(null);
      return;
    }
    const parsed = parseTimeInput(draftEnd);
    if (parsed !== null) {
      updateSelection({ start: selection.start, end: parsed }, "end");
    }
    setDraftEnd(null);
  };

  const togglePlayback = () => {
    if (!audio) return;

    if (playback.isPlaying) {
      playback.pause();
      return;
    }

    const resumeFrom =
      playback.currentTime >= selection.start && playback.currentTime < selection.end
        ? playback.currentTime
        : selection.start;

    playback.play(resumeFrom, selection.end);
  };

  const runTrim = () => {
    if (!audio || !hasValidSelection) return;

    playback.pause();
    setPhase("processing");
    setErrorMessage(null);

    try {
      const { sampleRate } = audio.buffer;
      const startFrame = Math.max(0, Math.round(selection.start * sampleRate));
      const endFrame = Math.min(audio.buffer.length, Math.round(selection.end * sampleRate));

      if (endFrame <= startFrame) {
        setPhase("error");
        setErrorMessage("The selected range is too short to export. Try a slightly longer selection.");
        return;
      }

      const blob = encodeWavBlob(audio.buffer, { startFrame, endFrame });
      setResult({ blob, duration: (endFrame - startFrame) / sampleRate });
      setPhase("completed");
    } catch (error) {
      console.error("Audio trim export failed:", error);
      setPhase("error");
      setErrorMessage("Could not export the trimmed audio. Please try again.");
    }
  };

  const markDownloaded = () => {
    setJustDownloaded(true);
    if (downloadedTimeoutRef.current) clearTimeout(downloadedTimeoutRef.current);
    downloadedTimeoutRef.current = setTimeout(() => setJustDownloaded(false), 3000);
  };

  const downloadResult = () => {
    if (!result) return;
    downloadBlob(result.blob, buildDownloadFilename(filenameBase, "wav", defaultFilenameBase));
    markDownloaded();
  };

  const selectionDuration = Math.max(0, selection.end - selection.start);

  const metadataLine = useMemo(() => {
    if (!audio) return null;
    const { buffer } = audio;
    return `${(buffer.sampleRate / 1000).toFixed(1)} kHz · ${channelLabel(buffer.numberOfChannels)} · ${formatTime(buffer.duration)}`;
  }, [audio]);

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        Your audio is processed locally in your browser. It isn&apos;t uploaded to our servers.
      </div>

      {showSuccessHero && result ? (
        <SuccessCard
          beforeActions={<FilenameField extension="wav" onChange={setFilenameBase} value={filenameBase} />}
          downloadLabel="Download WAV"
          heroStat={{ label: "Duration", value: formatTime(result.duration) }}
          justDownloaded={justDownloaded}
          onDownload={downloadResult}
          onReset={clearAll}
          resetLabel="Trim Another File"
          stats={[
            { label: "Format", value: "WAV (16-bit PCM)" },
            { label: "File size", value: formatBytes(result.blob.size) },
            { label: "Sample rate", value: audio ? `${(audio.buffer.sampleRate / 1000).toFixed(1)} kHz` : "—" },
          ]}
          subtitle="Your trimmed clip is ready to download."
          title="Audio Ready"
        >
          <button
            className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            onClick={backToEditing}
            type="button"
          >
            Adjust selection again
          </button>
        </SuccessCard>
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            {!audio ? (
              <UploadCard
                accept="audio/*"
                disabled={isBusy}
                formatsLabel="common audio formats your browser can decode (MP3, WAV, M4A, OGG, and more)"
                helperText={`Maximum ${formatBytes(maxUploadFileBytes)}.`}
                onFiles={(files) => void addFile(files)}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{audio.file.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatBytes(audio.file.size)}
                      {metadataLine ? ` · ${metadataLine}` : ""}
                    </p>
                  </div>
                  <button
                    className="shrink-0 rounded-full border border-red-300/25 px-4 py-2 text-xs font-semibold text-red-200 transition hover:border-red-200/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isBusy}
                    onClick={clearAll}
                    type="button"
                  >
                    Remove
                  </button>
                </div>

                <WaveformView
                  disabled={isBusy}
                  duration={audio.buffer.duration}
                  onSeek={(time) => playback.seek(Math.min(selection.end, Math.max(selection.start, time)))}
                  onSelectionChange={updateSelection}
                  peaks={audio.peaks}
                  playhead={playback.currentTime}
                  selectionEnd={selection.end}
                  selectionStart={selection.start}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy || !hasValidSelection}
                    onClick={togglePlayback}
                    type="button"
                  >
                    {playback.isPlaying ? "Pause" : "Preview Selection"}
                  </button>
                  <p className="text-sm text-slate-400" role="status">
                    {formatTime(playback.currentTime)} / {formatTime(selectionDuration)} selected
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block" htmlFor={startInputId}>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Start</span>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-3 py-2.5 font-mono text-sm text-white outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                      id={startInputId}
                      inputMode="decimal"
                      onBlur={commitDraftStart}
                      onChange={(event) => setDraftStart(event.target.value)}
                      onFocus={() => setDraftStart(formatTime(selection.start))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      value={draftStart ?? formatTime(selection.start)}
                    />
                  </label>
                  <label className="block" htmlFor={endInputId}>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">End</span>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-3 py-2.5 font-mono text-sm text-white outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                      id={endInputId}
                      inputMode="decimal"
                      onBlur={commitDraftEnd}
                      onChange={(event) => setDraftEnd(event.target.value)}
                      onFocus={() => setDraftEnd(formatTime(selection.end))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      value={draftEnd ?? formatTime(selection.end)}
                    />
                  </label>
                  <div className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Duration</span>
                    <output className="mt-2 block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-slate-300">
                      {formatTime(selectionDuration)}
                    </output>
                  </div>
                </div>
              </div>
            )}
          </div>

          {audio ? (
            <button
              className="w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={isBusy || !hasValidSelection}
              onClick={runTrim}
              type="button"
            >
              {phase === "processing" ? "Trimming…" : "Trim Audio"}
            </button>
          ) : null}

          {phase === "preparing" ? <ProcessingState subtitle="Decoding your audio file" title="Preparing" /> : null}
          {phase === "processing" ? <ProcessingState subtitle="Encoding the trimmed WAV file" title="Trimming" /> : null}
          {phase === "error" && errorMessage ? <ErrorCard message={errorMessage} title="Something went wrong" /> : null}
        </div>
      )}
    </section>
  );
}
