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
  applyGainToPcmSource,
  clampDb,
  computePeakAmplitude,
  computeWaveformPeaks,
  dbPresets,
  dbToGain,
  decodeAudioFile,
  encodeWavBlob,
  formatTime,
  isDbValid,
  isTotalDecodedSizeSafe,
  estimateDecodedPcmBytes,
  maxUploadFileBytes,
  predictOutputPeak,
  useAudioPlayback,
  willClip,
} from "@/lib/audio";
import type { WaveformPeaks } from "@/lib/audio";
import { VolumeWaveformView } from "./volume-waveform-view";

const defaultFilenameBase = "TinyUtility-volume-adjusted";

type DecodedAudio = {
  file: File;
  buffer: AudioBuffer;
  peaks: WaveformPeaks;
};

type VolumeResult = {
  blob: Blob;
  db: number;
  duration: number;
  sampleRate: number;
  channels: number;
  outputPeak: number;
  clipped: boolean;
};

type ProcessingStage = "preparing" | "processing" | "encoding";

const stageCopy: Record<ProcessingStage, { title: string; subtitle: string }> = {
  preparing: { title: "Preparing", subtitle: "Getting your audio ready" },
  processing: { title: "Adjusting Volume", subtitle: "Applying gain to your audio" },
  encoding: { title: "Encoding", subtitle: "Writing the WAV file" },
};

function channelLabel(count: number) {
  if (count === 1) return "Mono";
  if (count === 2) return "Stereo";
  return `${count} channels`;
}

function dbLabel(db: number) {
  const rounded = Number(db.toFixed(1));
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} dB`;
}

function dbDescription(db: number) {
  if (db === 0) return "Plays at the original volume.";
  if (db < 0) return `Makes audio quieter (${dbLabel(db)}).`;
  return `Makes audio louder (${dbLabel(db)}).`;
}

function peakPercent(peak: number) {
  return `${Math.round(Math.min(1, peak) * 100)}%`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function AudioVolumeChangerTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [audio, setAudio] = useState<DecodedAudio | null>(null);
  const [db, setDb] = useState(0);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [stage, setStage] = useState<ProcessingStage>("preparing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<VolumeResult | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const playback = useAudioPlayback(audio?.buffer ?? null);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;

  const sourcePeak = useMemo(() => {
    if (!audio) return 0;
    return computePeakAmplitude(audio.buffer);
  }, [audio]);

  const gain = dbToGain(db);
  const predictedPeak = predictOutputPeak(sourcePeak, gain);
  const clipPredicted = willClip(sourcePeak, gain);

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
    setDb(0);
    setFilenameBase(defaultFilenameBase);
    setPhase("idle");
  };

  const clearAll = () => {
    playback.seek(0);
    setAudio(null);
    setDb(0);
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

  const applyDb = (next: number) => {
    // A volume change makes any in-flight preview stale (a different gain needs a fresh source)
    // — stop cleanly rather than trying to reconfigure a node that's already playing.
    if (playback.isPlaying) playback.pause();
    playback.seek(0);
    setDb(clampDb(next));
  };

  const togglePreview = async () => {
    if (!audio) return;

    if (playback.isPlaying) {
      playback.pause();
      return;
    }

    const resumeFrom = playback.currentTime > 0 && playback.currentTime < audio.buffer.duration ? playback.currentTime : 0;
    await playback.play(resumeFrom, audio.buffer.duration, audio.buffer, 1, gain);
  };

  const runChangeVolume = async () => {
    if (!audio || !isDbValid(db)) return;

    playback.pause();
    setErrorMessage(null);

    const { sampleRate, numberOfChannels, duration } = audio.buffer;
    const bufferEstimate = estimateDecodedPcmBytes(numberOfChannels, sampleRate, duration);

    if (!isTotalDecodedSizeSafe([bufferEstimate, bufferEstimate])) {
      setPhase("error");
      setErrorMessage("This audio is too large to process safely in your browser.");
      return;
    }

    setPhase("processing");

    try {
      setStage("processing");
      const gained = applyGainToPcmSource(audio.buffer, gain);

      setStage("encoding");
      const blob = encodeWavBlob(gained);
      const outputPeak = computePeakAmplitude(gained);

      setResult({
        blob,
        db,
        duration,
        sampleRate,
        channels: numberOfChannels,
        outputPeak,
        clipped: clipPredicted,
      });
      setPhase("completed");
    } catch (error) {
      console.error("Audio volume change failed:", error);
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not change the audio volume. Please try again.");
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
          heroStat={{ label: "Volume", value: dbLabel(result.db) }}
          justDownloaded={justDownloaded}
          onDownload={downloadResult}
          onReset={clearAll}
          resetLabel="Change Another File"
          stats={[
            { label: "Duration", value: formatTime(result.duration) },
            { label: "Format", value: "WAV (16-bit PCM)" },
            { label: "File size", value: formatBytes(result.blob.size) },
            {
              label: "Clipping",
              value: result.clipped ? "Clipped at output ceiling" : "No clipping",
              span: result.clipped,
            },
          ]}
          subtitle="Your volume-adjusted clip is ready to download."
          title="Audio Ready"
        >
          <button
            className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            onClick={backToEditing}
            type="button"
          >
            Choose a different volume
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

                <VolumeWaveformView
                  duration={audio.buffer.duration}
                  gain={gain}
                  onSeek={(time) => playback.seek(Math.min(audio.buffer.duration, Math.max(0, time)))}
                  peaks={audio.peaks}
                  playhead={playback.currentTime}
                />

                <fieldset>
                  <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Volume</legend>

                  <div className="mt-3 flex items-center gap-4">
                    <label className="sr-only" htmlFor="volume-db-slider">
                      Volume adjustment in decibels
                    </label>
                    <input
                      aria-valuetext={dbLabel(db)}
                      className="h-2 w-full flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isBusy}
                      id="volume-db-slider"
                      max={12}
                      min={-12}
                      onChange={(event) => applyDb(Number(event.target.value))}
                      step={0.5}
                      type="range"
                      value={db}
                    />
                    <output className="w-20 shrink-0 text-right font-mono text-base font-semibold text-white">
                      {dbLabel(db)}
                    </output>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Volume preset">
                    {dbPresets.map((preset) => {
                      const isSelected = db === preset;
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
                          onClick={() => applyDb(preset)}
                          role="radio"
                          type="button"
                        >
                          {dbLabel(preset)}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-sm text-slate-400">{dbDescription(db)}</p>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Original peak</span>
                    <p className="mt-1 font-mono text-lg text-white">{peakPercent(sourcePeak)}</p>
                  </div>
                  <div
                    className={`rounded-xl border px-4 py-3 ${
                      clipPredicted ? "border-red-400/40 bg-red-400/10" : "border-cyan-300/25 bg-cyan-300/10"
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                        clipPredicted ? "text-red-200" : "text-cyan-200"
                      }`}
                    >
                      Predicted peak
                    </span>
                    <p className="mt-1 font-mono text-lg text-white">{peakPercent(predictedPeak)}</p>
                  </div>
                </div>

                <div
                  aria-live="polite"
                  className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                    clipPredicted
                      ? "border-red-400/40 bg-red-400/10 text-red-200"
                      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  }`}
                  role="status"
                >
                  {clipPredicted
                    ? `Potential clipping: peaks may be distorted at ${dbLabel(db)}.`
                    : "No clipping expected."}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => void togglePreview()}
                    type="button"
                  >
                    {playback.isPlaying ? "Pause" : "Preview at This Volume"}
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
              disabled={isBusy || !isDbValid(db)}
              onClick={() => void runChangeVolume()}
              type="button"
            >
              {phase === "processing" ? "Changing Volume…" : "Change Volume"}
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
