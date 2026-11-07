"use client";

import { useMemo, useRef, useState } from "react";
import { ChoiceGroup } from "@/components/tools/tool-ui";
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
  applyFade,
  computeWaveformPeaks,
  decodeAudioFile,
  encodeWavBlob,
  envelopeAt,
  estimateDecodedPcmBytes,
  fadeCurves,
  formatTime,
  isTotalDecodedSizeSafe,
  maxFadeSeconds,
  maxUploadFileBytes,
  toAudioBuffer,
  useAudioPlayback,
  type FadeCurve,
} from "@/lib/audio";
import type { WaveformPeaks } from "@/lib/audio";
import { StaticWaveformView } from "../audio-shared/static-waveform-view";

const defaultFilenameBase = "TinyUtility-faded";

type DecodedAudio = { file: File; buffer: AudioBuffer; peaks: WaveformPeaks };
type FadeResultState = { blob: Blob; duration: number; fadeInSeconds: number; fadeOutSeconds: number };

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

export function AudioFadeTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [audio, setAudio] = useState<DecodedAudio | null>(null);
  const [fadeInSeconds, setFadeInSeconds] = useState(2);
  const [fadeOutSeconds, setFadeOutSeconds] = useState(2);
  const [curve, setCurve] = useState<FadeCurve>("linear");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<FadeResultState | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const playback = useAudioPlayback(audio?.buffer ?? null);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;

  const maxFade = audio ? Math.min(maxFadeSeconds, audio.buffer.duration) : maxFadeSeconds;

  const plan = useMemo(() => {
    if (!audio) return null;
    return applyFade(audio.buffer, { fadeInSeconds, fadeOutSeconds, curve });
  }, [audio, fadeInSeconds, fadeOutSeconds, curve]);

  const envelope = useMemo(() => {
    if (!audio || !plan?.ok) return undefined;
    const total = audio.buffer.length;
    return (position: number) => envelopeAt(Math.round(position * (total - 1)), total, plan.fadeInFrames, plan.fadeOutFrames, curve);
  }, [audio, plan, curve]);

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

    const peaks = computeWaveformPeaks(outcome.buffer, 1200);
    const initialFade = Math.min(2, outcome.buffer.duration / 4);
    setAudio({ file, buffer: outcome.buffer, peaks });
    setFadeInSeconds(Number(initialFade.toFixed(2)));
    setFadeOutSeconds(Number(initialFade.toFixed(2)));
    setFilenameBase(defaultFilenameBase);
    setPhase("idle");
  };

  const clearAll = () => {
    playback.seek(0);
    setAudio(null);
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

  const preview = async () => {
    if (!audio || !plan?.ok) return;

    if (playback.isPlaying) {
      playback.pause();
      return;
    }

    const bufferToPlay = toAudioBuffer(plan.output);
    await playback.play(0, bufferToPlay.duration, bufferToPlay);
  };

  const runFade = async () => {
    if (!audio || !plan?.ok) return;

    playback.pause();
    setErrorMessage(null);

    const { sampleRate, numberOfChannels, duration } = audio.buffer;
    const estimate = estimateDecodedPcmBytes(numberOfChannels, sampleRate, duration);

    if (!isTotalDecodedSizeSafe([estimate, estimate])) {
      setPhase("error");
      setErrorMessage("This audio is too large to process safely in your browser.");
      return;
    }

    setPhase("processing");

    try {
      const blob = encodeWavBlob(plan.output);
      setResult({ blob, duration, fadeInSeconds, fadeOutSeconds });
      setPhase("completed");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not apply the fade. Please try again.");
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
          resetLabel="Fade Another File"
          stats={[
            { label: "Fade in", value: `${result.fadeInSeconds.toFixed(1)}s` },
            { label: "Fade out", value: `${result.fadeOutSeconds.toFixed(1)}s` },
            { label: "Format", value: "WAV (16-bit PCM)" },
            { label: "File size", value: formatBytes(result.blob.size) },
          ]}
          subtitle="Your faded clip is ready to download."
          title="Fade Applied"
        >
          <button className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100" onClick={backToEditing} type="button">
            Choose a different fade
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
                      {formatBytes(audio.file.size)} · {(audio.buffer.sampleRate / 1000).toFixed(1)} kHz ·{" "}
                      {channelLabel(audio.buffer.numberOfChannels)} · {formatTime(audio.buffer.duration)}
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

                <StaticWaveformView
                  duration={audio.buffer.duration}
                  envelopeAt={envelope}
                  onSeek={(time) => playback.seek(Math.min(audio.buffer.duration, Math.max(0, time)))}
                  peaks={audio.peaks}
                  playhead={playback.currentTime}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor="fade-in-slider">
                      Fade in: {fadeInSeconds.toFixed(1)}s
                    </label>
                    <input
                      className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isBusy}
                      id="fade-in-slider"
                      max={maxFade}
                      min={0}
                      onChange={(event) => setFadeInSeconds(Number(event.target.value))}
                      step={0.1}
                      type="range"
                      value={fadeInSeconds}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor="fade-out-slider">
                      Fade out: {fadeOutSeconds.toFixed(1)}s
                    </label>
                    <input
                      className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isBusy}
                      id="fade-out-slider"
                      max={maxFade}
                      min={0}
                      onChange={(event) => setFadeOutSeconds(Number(event.target.value))}
                      step={0.1}
                      type="range"
                      value={fadeOutSeconds}
                    />
                  </div>
                </div>

                <ChoiceGroup
                  legend="Curve"
                  onChange={setCurve}
                  options={fadeCurves.map((entry) => ({ value: entry.value, label: entry.label }))}
                  value={curve}
                />
                <p className="text-xs text-slate-500">{fadeCurves.find((entry) => entry.value === curve)?.description}</p>

                {plan && !plan.ok ? (
                  <p className="text-sm text-amber-200" role="alert">
                    {plan.error}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy || !plan?.ok}
                    onClick={() => void preview()}
                    type="button"
                  >
                    {playback.isPlaying ? "Pause" : "Preview With Fade"}
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
              disabled={isBusy || !plan?.ok}
              onClick={() => void runFade()}
              type="button"
            >
              {phase === "processing" ? "Applying Fade…" : "Apply Fade"}
            </button>
          ) : null}

          {phase === "preparing" ? <ProcessingState subtitle="Getting your audio ready" title="Preparing" /> : null}
          {phase === "processing" ? <ProcessingState subtitle="Applying the fade" title="Processing" /> : null}
          {phase === "error" && errorMessage ? <ErrorCard message={errorMessage} title="Something went wrong" /> : null}
        </div>
      )}
    </section>
  );
}
