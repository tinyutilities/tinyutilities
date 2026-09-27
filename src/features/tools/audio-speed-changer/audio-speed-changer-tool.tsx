"use client";

import { useMemo, useRef, useState } from "react";
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
  changeAudioSpeed,
  clampSpeed,
  computeOutputDuration,
  computeWaveformPeaks,
  decodeAudioFile,
  encodeWavBlob,
  formatTime,
  isDecodedSizeSafe,
  isSpeedValid,
  maxUploadFileBytes,
  speedPresets,
  useAudioPlayback,
} from "@/lib/audio";
import type { WaveformPeaks } from "@/lib/audio";
import { SpeedWaveformView } from "./speed-waveform-view";

const defaultFilenameBase = "TinyUtility-sped";

type DecodedAudio = {
  file: File;
  buffer: AudioBuffer;
  peaks: WaveformPeaks;
};

type SpeedResult = {
  blob: Blob;
  outputDuration: number;
  speed: number;
  sampleRate: number;
  channels: number;
};

type ProcessingStage = "preparing" | "changing" | "encoding";

const stageCopy: Record<ProcessingStage, { title: string; subtitle: string }> = {
  preparing: { title: "Preparing", subtitle: "Getting your audio ready" },
  changing: { title: "Changing Speed", subtitle: "Rendering audio at the new speed" },
  encoding: { title: "Encoding", subtitle: "Writing the WAV file" },
};

function channelLabel(count: number) {
  if (count === 1) return "Mono";
  if (count === 2) return "Stereo";
  return `${count} channels`;
}

function speedLabel(speed: number) {
  // Trims a trailing ".00"/".0" so presets read "1x" and "1.5x", not "1.00x" and "1.50x".
  return `${Number(speed.toFixed(2)).toString()}x`;
}

function speedDescription(speed: number) {
  if (speed === 1) return "Plays at the original speed and pitch.";
  if (speed < 1) return `Makes audio slower and lowers its pitch (${speedLabel(speed)}).`;
  return `Makes audio faster and raises its pitch (${speedLabel(speed)}).`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function AudioSpeedChangerTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [audio, setAudio] = useState<DecodedAudio | null>(null);
  const [speed, setSpeed] = useState(1);
  const [customSpeedText, setCustomSpeedText] = useState("1");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [stage, setStage] = useState<ProcessingStage>("preparing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const playback = useAudioPlayback(audio?.buffer ?? null);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;

  const previewOutputDuration = useMemo(() => {
    if (!audio) return 0;
    return computeOutputDuration(audio.buffer.duration, speed);
  }, [audio, speed]);

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

    setStage("preparing");
    setPhase("preparing");

    const outcome = await decodeAudioFile(file);

    if (!outcome.ok) {
      setPhase("error");
      setErrorMessage(outcome.error.message);
      return;
    }

    const peaks = computeWaveformPeaks(outcome.buffer, 1200);

    setAudio({ file, buffer: outcome.buffer, peaks });
    setSpeed(1);
    setCustomSpeedText("1");
    setFilenameBase(defaultFilenameBase);
    setPhase("idle");
  };

  const clearAll = () => {
    playback.seek(0);
    setAudio(null);
    setSpeed(1);
    setCustomSpeedText("1");
    setPhase("idle");
    setErrorMessage(null);
    setResult(null);
    setJustDownloaded(false);
  };

  const backToEditing = () => {
    setResult(null);
    setPhase("idle");
    setJustDownloaded(false);
  };

  const applySpeed = (next: number) => {
    // A speed change makes any in-flight preview stale (a different playbackRate needs a fresh
    // source) — stop cleanly rather than trying to reconfigure a node that's already playing.
    if (playback.isPlaying) playback.pause();
    playback.seek(0);
    const clamped = clampSpeed(next);
    setSpeed(clamped);
    setCustomSpeedText(String(clamped));
  };

  const commitCustomSpeed = () => {
    const parsed = Number(customSpeedText);
    if (Number.isFinite(parsed) && isSpeedValid(parsed)) {
      applySpeed(parsed);
    } else {
      setCustomSpeedText(String(speed));
    }
  };

  const togglePreview = async () => {
    if (!audio) return;

    if (playback.isPlaying) {
      playback.pause();
      return;
    }

    const resumeFrom = playback.currentTime > 0 && playback.currentTime < audio.buffer.duration ? playback.currentTime : 0;
    await playback.play(resumeFrom, audio.buffer.duration, audio.buffer, speed);
  };

  const runChangeSpeed = async () => {
    if (!audio || !isSpeedValid(speed)) return;

    playback.pause();
    setErrorMessage(null);

    const outputDuration = computeOutputDuration(audio.buffer.duration, speed);

    if (!isDecodedSizeSafe(audio.buffer.numberOfChannels, audio.buffer.sampleRate, outputDuration)) {
      setPhase("error");
      setErrorMessage("This audio is too large to process safely in your browser.");
      return;
    }

    setPhase("processing");

    try {
      setStage("changing");
      const outputSource = await changeAudioSpeed(audio.buffer, speed);

      setStage("encoding");
      const blob = encodeWavBlob(outputSource);

      setResult({
        blob,
        outputDuration,
        speed,
        sampleRate: outputSource.sampleRate,
        channels: outputSource.numberOfChannels,
      });
      setPhase("completed");
    } catch (error) {
      console.error("Audio speed change failed:", error);
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not change the audio speed. Please try again.");
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
          heroStat={{ label: "New Duration", value: formatTime(result.outputDuration) }}
          justDownloaded={justDownloaded}
          onDownload={downloadResult}
          onReset={clearAll}
          resetLabel="Change Another File"
          stats={[
            { label: "Speed", value: speedLabel(result.speed) },
            { label: "Original duration", value: audio ? formatTime(audio.buffer.duration) : "—" },
            { label: "Format", value: "WAV (16-bit PCM)" },
            { label: "File size", value: formatBytes(result.blob.size) },
          ]}
          subtitle="Your speed-changed clip is ready to download."
          title="Audio Ready"
        >
          <button
            className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            onClick={backToEditing}
            type="button"
          >
            Choose a different speed
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

                <SpeedWaveformView
                  duration={audio.buffer.duration}
                  onSeek={(time) => playback.seek(Math.min(audio.buffer.duration, Math.max(0, time)))}
                  peaks={audio.peaks}
                  playhead={playback.currentTime}
                />

                <fieldset>
                  <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Speed</legend>
                  <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Playback speed">
                    {speedPresets.map((preset) => {
                      const isSelected = speed === preset;
                      return (
                        <button
                          aria-checked={isSelected}
                          className={`min-w-[4.5rem] rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                            isSelected
                              ? "border-cyan-300/60 bg-cyan-300/20 text-white"
                              : "border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/40 hover:bg-white/10"
                          }`}
                          disabled={isBusy}
                          key={preset}
                          onClick={() => applySpeed(preset)}
                          role="radio"
                          type="button"
                        >
                          {speedLabel(preset)}
                        </button>
                      );
                    })}
                  </div>

                  <label className="mt-4 block max-w-[10rem]">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Custom speed (0.5x&ndash;2x)
                    </span>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-3 py-2.5 font-mono text-sm text-white outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isBusy}
                      inputMode="decimal"
                      onBlur={commitCustomSpeed}
                      onChange={(event) => setCustomSpeedText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      value={customSpeedText}
                    />
                  </label>

                  <p className="mt-3 text-sm text-slate-400">{speedDescription(speed)}</p>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Original</span>
                    <p className="mt-1 font-mono text-lg text-white">{formatTime(audio.buffer.duration)}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
                      At {speedLabel(speed)}
                    </span>
                    <p className="mt-1 font-mono text-lg text-white">{formatTime(previewOutputDuration)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => void togglePreview()}
                    type="button"
                  >
                    {playback.isPlaying ? "Pause" : "Preview at This Speed"}
                  </button>
                  <p className="text-sm text-slate-400" role="status">
                    {formatTime(playback.currentTime)} / {formatTime(audio.buffer.duration)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {audio ? (
            <button
              className="w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={isBusy || !isSpeedValid(speed)}
              onClick={() => void runChangeSpeed()}
              type="button"
            >
              {phase === "processing" ? "Changing Speed…" : "Change Speed"}
            </button>
          ) : null}

          {phase === "preparing" ? <ProcessingState subtitle={stageCopy.preparing.subtitle} title={stageCopy.preparing.title} /> : null}
          {phase === "processing" ? <ProcessingState subtitle={stageCopy[stage].subtitle} title={stageCopy[stage].title} /> : null}
          {phase === "error" && errorMessage ? <ErrorCard message={errorMessage} title="Something went wrong" /> : null}
        </div>
      )}
    </section>
  );
}
