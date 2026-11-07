"use client";

import { useId, useMemo, useState } from "react";
import { CheckboxField, CopyButton, ErrorMessage, InfoNote, Panel, PanelLabel, PrivacyNote } from "@/components/tools/tool-ui";
import { contrastReport, formatColor, parseColor, rgbToHex } from "@/lib/color/convert";

const formatLabels = [
  ["hex", "HEX"],
  ["rgb", "RGB"],
  ["hsl", "HSL"],
  ["hsv", "HSV"],
  ["cmyk", "CMYK"],
] as const;

const white = { r: 255, g: 255, b: 255 };
const black = { r: 0, g: 0, b: 0 };

function Badge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        pass ? "bg-emerald-300/15 text-emerald-200" : "bg-red-300/15 text-red-200"
      }`}
    >
      {label}: {pass ? "Pass" : "Fail"}
    </span>
  );
}

export function ColorConverterTool() {
  const inputId = useId();
  const pickerId = useId();
  const [input, setInput] = useState("#1E90FF");
  const [upperHex, setUpperHex] = useState(false);

  const parsed = useMemo(() => parseColor(input), [input]);
  const formats = parsed.ok ? formatColor(parsed.color, upperHex) : null;
  const pickerValue = parsed.ok ? rgbToHex(parsed.color) : "#000000";

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your input never leaves your device. Conversion happens entirely in your browser.</PrivacyNote>

      <Panel>
        <PanelLabel htmlFor={inputId}>Color</PanelLabel>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            aria-invalid={!parsed.ok}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
            id={inputId}
            onChange={(event) => setInput(event.target.value)}
            placeholder="#1E90FF, rgb(30, 144, 255), hsl(210, 100%, 56%)…"
            spellCheck={false}
            type="text"
            value={input}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300" htmlFor={pickerId}>
            Pick
            <input
              className="h-11 w-14 cursor-pointer rounded-lg border border-white/10 bg-[#080b1a] p-1"
              id={pickerId}
              onChange={(event) => setInput(event.target.value)}
              type="color"
              value={pickerValue}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Accepts HEX (3, 4, 6 or 8 digits), rgb()/rgba(), hsl()/hsla(), hsv() and cmyk(). CSS color names are not supported.
        </p>
        {!parsed.ok && input.trim() ? <ErrorMessage>{parsed.error}</ErrorMessage> : null}
      </Panel>

      {parsed.ok && formats ? (
        <>
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Converted values</h3>
              <CheckboxField checked={upperHex} onChange={setUpperHex}>
                Uppercase HEX
              </CheckboxField>
            </div>

            <div
              aria-label="Color preview"
              className="mt-4 h-24 rounded-2xl border border-white/10"
              role="img"
              style={{
                backgroundColor: `rgba(${Math.round(parsed.color.r)}, ${Math.round(parsed.color.g)}, ${Math.round(parsed.color.b)}, ${parsed.color.a})`,
                backgroundImage: parsed.color.a < 1 ? "repeating-conic-gradient(#8884 0% 25%, transparent 0% 50%)" : undefined,
                backgroundSize: "16px 16px",
              }}
            />

            <ul className="mt-4 space-y-3">
              {formatLabels.map(([key, label]) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4"
                  key={key}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                    <p className="mt-1 break-all font-mono text-sm text-white">{formats[key]}</p>
                  </div>
                  <CopyButton label={`Copy ${label}`} text={formats[key]} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              HSL, HSV and CMYK are rounded to one decimal place. CMYK is a simple mathematical conversion, not a print color profile.
            </p>
          </Panel>

          <Panel>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">WCAG contrast</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                { label: "On white", background: white },
                { label: "On black", background: black },
              ].map(({ label, background }) => {
                const report = contrastReport(parsed.color, background);
                return (
                  <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4" key={label}>
                    <p className="text-sm font-semibold text-white">
                      {label}: {report.ratio.toFixed(2)}:1
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge label="AA text" pass={report.aaNormal} />
                      <Badge label="AA large" pass={report.aaLarge} />
                      <Badge label="AAA text" pass={report.aaaNormal} />
                      <Badge label="AAA large" pass={report.aaaLarge} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <InfoNote>
                Ratios compare this color, used as text, against pure white and pure black backgrounds, using the WCAG 2.x formula.
                Transparency is ignored. Large text means 18 pt (24 px) or 14 pt bold.
              </InfoNote>
            </div>
          </Panel>
        </>
      ) : null}
    </section>
  );
}
