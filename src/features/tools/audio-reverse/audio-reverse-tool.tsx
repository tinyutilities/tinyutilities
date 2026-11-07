"use client";

import { useRef, useState } from "react";
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
  computeWaveformPeaks,
  decodeAudioFile,
  encodeWavBlob,
  estimateDecodedPcmBytes,
  formatTime,
  isTotalDecodedSizeSafe,
  maxUploadFileBytes,
  reversePcmSource,
  toAudioBuffer,
  useAudioPlayback,
} from "@/lib/audio";
import type { WaveformPeaks } from "@/lib/audio";
import { StaticWaveformView } from "../audio-shared/static-waveform-view";

const defaultFilenameBase = "TinyUtility-reversed";

type DecodedAudio = { file: File; buffer: AudioBuffer; peaks: WaveformPeaks };
type ReverseResult = { blob: Blob; duration: number };

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

export function AudioReverseTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [audio, setAudio] = useState<DecodedAudio | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ReverseResult | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [justDownloaded, setJustDownloaded] = useState(false);
  const [previewReversed, setPreviewReversed] = useState(false);

  const playback = useAudioPlayback(audio?.buffer ?? null);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;

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
    setAudio({ file, buffer: outcome.buffer, peaks });
    setFilenameBase(defaultFilenameBase);
    setPreviewReversed(false);
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

  const togglePreview = async (reversed: boolean) => {
    if (!audio) return;

    if (playback.isPlaying && previewReversed === reversed) {
      playback.pause();
      return;
    }

    playback.seek(0);
    setPreviewReversed(reversed);

    const bufferToPlay = reversed ? toAudioBuffer(reversePcmSource(audio.buffer)) : audio.buffer;
    await playback.play(0, bufferToPlay.duration, bufferToPlay);
  };

  const runReverse = async () => {
    if (!audio) return;

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
      const reversed = reversePcmSource(audio.buffer);
      const blob = encodeWavBlob(reversed);
      setResult({ blob, duration });
      setPhase("completed");
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not reverse the audio. Please try again.");
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
          resetLabel="Reverse Another File"
          stats={[
            { label: "Format", value: "WAV (16-bit PCM)" },
            { label: "File size", value: formatBytes(result.blob.size) },
          ]}
          subtitle="Your reversed clip is ready to download."
          title="Audio Reversed"
        >
          <button className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100" onClick={backToEditing} type="button">
            Back
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
                  onSeek={(time) => playback.seek(Math.min(audio.buffer.duration, Math.max(0, time)))}
                  peaks={audio.peaks}
                  playhead={playback.currentTime}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => void togglePreview(false)}
                    type="button"
                  >
                    {playback.isPlaying && !previewReversed ? "Pause" : "Preview Original"}
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => void togglePreview(true)}
                    type="button"
                  >
                    {playback.isPlaying && previewReversed ? "Pause" : "Preview Reversed"}
                  </button>
                  <p className="text-sm text-slate-400" role="status">
                    {formatTime(playback.currentTime)} / {formatTime(audio.buffer.duration)}
                  </p>
                </div>

                <p className="text-xs text-slate-500">
                  Reversing plays the clip from end to start. All channels are reversed together, so stereo placement is kept.
                </p>
              </div>
            )}
          </div>

          {audio ? (
            <button
              className="w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={isBusy}
              onClick={() => void runReverse()}
              type="button"
            >
              {phase === "processing" ? "Reversing…" : "Reverse Audio"}
            </button>
          ) : null}

          {phase === "preparing" ? <ProcessingState subtitle="Getting your audio ready" title="Preparing" /> : null}
          {phase === "processing" ? <ProcessingState subtitle="Reversing your audio" title="Processing" /> : null}
          {phase === "error" && errorMessage ? <ErrorCard message={errorMessage} title="Something went wrong" /> : null}
        </div>
      )}
    </section>
  );
}
