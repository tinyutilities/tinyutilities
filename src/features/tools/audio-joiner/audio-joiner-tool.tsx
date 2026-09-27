"use client";

import { useRef, useState } from "react";
import {
  buildDownloadFilename,
  ErrorCard,
  FilenameField,
  formatBytes,
  ProcessingState,
  SelectedFileRow,
  SuccessCard,
  UploadCard,
} from "@/components/upload";
import type { UploadPhase } from "@/components/upload";
import {
  decodeAudioFile,
  encodeWavBlob,
  estimateDecodedPcmBytes,
  formatTime,
  isChannelCountJoinable,
  isTotalDecodedSizeSafe,
  joinPcmSources,
  maxJoinInputFiles,
  maxUploadFileBytes,
  moveItem,
  removeItem,
  toAudioBuffer,
  useAudioPlayback,
} from "@/lib/audio";
import type { JoinStage } from "@/lib/audio";

const defaultFilenameBase = "TinyUtility-joined";

type JoinFileEntry = {
  id: string;
  file: File;
  buffer: AudioBuffer;
};

function channelLabel(count: number) {
  if (count === 1) return "Mono";
  if (count === 2) return "Stereo";
  return `${count} channels`;
}

function describeJoinStage(stage: JoinStage): string {
  switch (stage) {
    case "preparing":
      return "Preparing audio…";
    case "resampling":
      return "Resampling audio…";
    case "joining":
      return "Joining tracks…";
    default:
      return "Working…";
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function AudioJoinerTool() {
  const downloadedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [files, setFiles] = useState<JoinFileEntry[]>([]);
  const [joinedBuffer, setJoinedBuffer] = useState<AudioBuffer | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; duration: number; fileCount: number } | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const playback = useAudioPlayback(joinedBuffer);

  const isBusy = phase === "preparing" || phase === "processing";
  const showSuccessHero = phase === "completed" && result !== null;
  const canJoin = files.length >= 2 && !isBusy;
  const totalDuration = files.reduce((sum, entry) => sum + entry.buffer.duration, 0);

  const invalidateJoinedBuffer = () => {
    playback.pause();
    setJoinedBuffer(null);
    setResult(null);
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    if (files.length + incoming.length > maxJoinInputFiles) {
      setPhase("error");
      setErrorMessage(`You can join up to ${maxJoinInputFiles} files at once.`);
      return;
    }

    setPhase("preparing");
    setErrorMessage(null);

    const newEntries: JoinFileEntry[] = [];
    const failures: string[] = [];

    for (const file of incoming) {
      if (file.size === 0) {
        failures.push(`"${file.name}" is empty`);
        continue;
      }

      if (file.size > maxUploadFileBytes) {
        failures.push(`"${file.name}" is too large`);
        continue;
      }

      const outcome = await decodeAudioFile(file);

      if (!outcome.ok) {
        failures.push(`Couldn't read "${file.name}". The file may be corrupted or unsupported by your browser`);
        continue;
      }

      if (!isChannelCountJoinable(outcome.buffer.numberOfChannels)) {
        failures.push(`"${file.name}" has ${outcome.buffer.numberOfChannels} channels — only mono and stereo audio is supported`);
        continue;
      }

      newEntries.push({ id: createId(), file, buffer: outcome.buffer });
    }

    if (newEntries.length > 0) {
      const combined = [...files, ...newEntries];
      const estimates = combined.map((entry) =>
        estimateDecodedPcmBytes(entry.buffer.numberOfChannels, entry.buffer.sampleRate, entry.buffer.duration),
      );

      if (!isTotalDecodedSizeSafe(estimates)) {
        setPhase("error");
        setErrorMessage("These files are too large to join safely in your browser.");
        return;
      }

      setFiles(combined);
      invalidateJoinedBuffer();
    }

    if (failures.length > 0) {
      setPhase("error");
      setErrorMessage(failures.length === 1 ? `${failures[0]}.` : `${failures.length} files couldn't be added: ${failures.join("; ")}.`);
    } else {
      setPhase("idle");
    }
  };

  const moveUp = (index: number) => {
    setFiles((current) => moveItem(current, index, -1));
    invalidateJoinedBuffer();
  };

  const moveDown = (index: number) => {
    setFiles((current) => moveItem(current, index, 1));
    invalidateJoinedBuffer();
  };

  const removeFile = (index: number) => {
    setFiles((current) => removeItem(current, index));
    invalidateJoinedBuffer();
    setErrorMessage(null);
    setPhase("idle");
  };

  const clearAll = () => {
    playback.pause();
    setFiles([]);
    setJoinedBuffer(null);
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

  const ensureJoinedBuffer = async (): Promise<AudioBuffer | null> => {
    if (joinedBuffer) return joinedBuffer;
    if (files.length < 2) return null;

    setPhase("processing");
    setErrorMessage(null);

    try {
      const source = await joinPcmSources(
        files.map((entry) => entry.buffer),
        (stage) => setStatusText(describeJoinStage(stage)),
      );
      const buffer = toAudioBuffer(source);
      setJoinedBuffer(buffer);
      setPhase("idle");
      return buffer;
    } catch (error) {
      setPhase("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not prepare the joined audio.");
      return null;
    }
  };

  const togglePreview = async () => {
    if (playback.isPlaying) {
      playback.pause();
      return;
    }

    const buffer = await ensureJoinedBuffer();
    if (!buffer) return;

    const resumeFrom = playback.currentTime > 0 && playback.currentTime < buffer.duration ? playback.currentTime : 0;
    playback.play(resumeFrom, buffer.duration, buffer);
  };

  const runJoin = async () => {
    const buffer = await ensureJoinedBuffer();
    if (!buffer) return;

    playback.pause();
    setPhase("processing");
    setStatusText("Encoding WAV file…");
    setErrorMessage(null);

    try {
      const blob = encodeWavBlob(buffer);
      setStatusText("Finalizing…");
      setResult({ blob, duration: buffer.duration, fileCount: files.length });
      setPhase("completed");
    } catch (error) {
      console.error("Audio join export failed:", error);
      setPhase("error");
      setErrorMessage("Could not create the joined audio file. Please try again.");
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
          resetLabel="Join More Audio"
          stats={[
            { label: "Source files", value: `${result.fileCount}` },
            { label: "Format", value: "WAV (16-bit PCM)" },
            { label: "File size", value: formatBytes(result.blob.size) },
          ]}
          subtitle="Your joined clip is ready to download."
          title="Audio Ready"
        >
          <button
            className="mx-auto block text-sm font-medium text-cyan-300 transition hover:text-cyan-100"
            onClick={backToEditing}
            type="button"
          >
            Edit / Back
          </button>
        </SuccessCard>
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
            {files.length === 0 ? (
              <UploadCard
                accept="audio/*"
                disabled={isBusy}
                formatsLabel="common audio formats your browser can decode (MP3, WAV, M4A, OGG, and more)"
                helperText={`Select at least two files. Maximum ${formatBytes(maxUploadFileBytes)} each.`}
                multiple
                onFiles={(fileList) => void addFiles(fileList)}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Audio files</h2>
                    <p className="mt-1 text-sm text-slate-400" role="status">
                      {files.length} file{files.length === 1 ? "" : "s"} · {formatTime(totalDuration)} total
                    </p>
                  </div>
                  <button
                    className="shrink-0 rounded-full border border-red-300/25 px-4 py-2 text-xs font-semibold text-red-200 transition hover:border-red-200/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isBusy}
                    onClick={clearAll}
                    type="button"
                  >
                    Clear all
                  </button>
                </div>

                <ol className="grid gap-3">
                  {files.map((entry, index) => (
                    <li className="flex items-center gap-3" key={entry.id}>
                      <span
                        aria-hidden="true"
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-white/5 text-xs font-semibold text-slate-300 ring-1 ring-white/10"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <SelectedFileRow
                          actions={
                            <>
                              <button
                                aria-label={`Move ${entry.file.name} earlier in the sequence`}
                                className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={isBusy || index === 0}
                                onClick={() => moveUp(index)}
                                type="button"
                              >
                                Up
                              </button>
                              <button
                                aria-label={`Move ${entry.file.name} later in the sequence`}
                                className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={isBusy || index === files.length - 1}
                                onClick={() => moveDown(index)}
                                type="button"
                              >
                                Down
                              </button>
                              <button
                                aria-label={`Remove ${entry.file.name}`}
                                className="rounded-full border border-red-300/25 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-200/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={isBusy}
                                onClick={() => removeFile(index)}
                                type="button"
                              >
                                Remove
                              </button>
                            </>
                          }
                          detail={channelLabel(entry.buffer.numberOfChannels)}
                          name={entry.file.name}
                          sizeLabel={formatBytes(entry.file.size)}
                          typeLabel={formatTime(entry.buffer.duration)}
                        />
                      </div>
                    </li>
                  ))}
                </ol>

                <UploadCard
                  accept="audio/*"
                  compact
                  disabled={isBusy || files.length >= maxJoinInputFiles}
                  formatsLabel="common audio formats your browser can decode"
                  multiple
                  onFiles={(fileList) => void addFiles(fileList)}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canJoin}
                    onClick={() => void togglePreview()}
                    type="button"
                  >
                    {playback.isPlaying ? "Pause" : "Preview Joined Audio"}
                  </button>
                  {joinedBuffer ? (
                    <p className="text-sm text-slate-400" role="status">
                      {formatTime(playback.currentTime)} / {formatTime(joinedBuffer.duration)}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {files.length > 0 ? (
            <button
              className="w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={!canJoin}
              onClick={() => void runJoin()}
              type="button"
            >
              {phase === "processing" ? "Joining…" : "Join Audio"}
            </button>
          ) : null}

          {files.length === 1 ? (
            <p className="text-sm text-slate-400">Add at least one more file to join.</p>
          ) : null}

          {phase === "preparing" ? <ProcessingState subtitle="Decoding your audio files" title="Preparing" /> : null}
          {phase === "processing" ? <ProcessingState subtitle={statusText || "Working…"} title="Joining" /> : null}
          {phase === "error" && errorMessage ? <ErrorCard message={errorMessage} title="Something went wrong" /> : null}
        </div>
      )}
    </section>
  );
}
