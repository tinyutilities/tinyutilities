"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { copyText } from "@/lib/browser/clipboard";

/**
 * Small presentational primitives for the text/developer tools, extracted from the class strings
 * the existing tools (e.g. URL Encoder / Decoder) already use, so new tools stay visually
 * identical without re-pasting ~15 long Tailwind strings each. Existing tools are not migrated.
 */

export function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
      {children}
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-300">
      {children}
    </div>
  );
}

export function WarningNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-5 text-sm leading-6 text-amber-100" role="note">
      {children}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function PanelLabel({ htmlFor, children, meta }: { htmlFor?: string; children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300" htmlFor={htmlFor}>
        {children}
      </label>
      {meta ? <span className="text-xs text-slate-500">{meta}</span> : null}
    </div>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">{children}</code>;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`mt-3 min-h-[10rem] w-full resize-y rounded-2xl border border-white/10 bg-[#080b1a]/80 p-4 font-mono text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20 read-only:bg-[#080b1a]/60 ${className}`}
      spellCheck={false}
      {...props}
    />
  );
}

const buttonVariants = {
  primary:
    "bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-white shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30",
  secondary:
    "border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-cyan-100 hover:border-cyan-200/50 hover:bg-cyan-300/15",
  neutral:
    "border border-white/15 bg-white/5 px-5 py-2.5 text-slate-200 hover:border-white/30 hover:bg-white/10",
  danger: "border border-red-300/25 bg-red-300/10 px-5 py-2.5 text-red-100 hover:border-red-200/50",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants };

export function Button({ variant = "secondary", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-full text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${buttonVariants[variant]} ${className}`}
      type={type}
      {...props}
    />
  );
}

/** Copy-to-clipboard button with its own accessible status message. */
export function CopyButton({ text, label = "Copy", disabled }: { text: string; label?: string; disabled?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);

  const handleCopy = async () => {
    const copied = await copyText(text);
    setMessage(copied ? "Copied to clipboard." : "Could not copy automatically. Select the text and copy it manually.");
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <Button disabled={disabled ?? !text} onClick={handleCopy}>
        {label}
      </Button>
      {message ? (
        <span className="text-xs text-slate-400" role="status">
          {message}
        </span>
      ) : null}
    </span>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-sm text-red-300" role="alert">
      {children}
    </p>
  );
}

type Option<T extends string> = { value: T; label: string };

/** Accessible single-choice pill group (radio semantics). */
export function ChoiceGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-white">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition focus-within:ring-2 focus-within:ring-cyan-300/40 ${
                selected
                  ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-50"
                  : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30"
              }`}
              key={option.value}
            >
              <input
                checked={selected}
                className="sr-only"
                name={legend}
                onChange={() => onChange(option.value)}
                type="radio"
                value={option.value}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CheckboxField({
  checked,
  onChange,
  children,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-200">
      <input
        checked={checked}
        className="mt-1 size-4 shrink-0 accent-cyan-400"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        {children}
        {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      </span>
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  id,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  id: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-white" htmlFor={id}>
        {label}
      </label>
      <select
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
        id={id}
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
