"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Button,
  CopyButton,
  ErrorMessage,
  Panel,
  PanelLabel,
  PrivacyNote,
  TextArea,
  WarningNote,
} from "@/components/tools/tool-ui";
import { decodeJwt } from "@/lib/jwt/decode";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function JwtDecoderTool() {
  const inputId = useId();
  const [token, setToken] = useState("");
  // Expiry status is relative to "now"; refresh it periodically so an open page doesn't go stale.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const result = useMemo(() => (token.trim() ? decodeJwt(token, now) : null), [token, now]);

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your token never leaves your device. It is decoded entirely in your browser.</PrivacyNote>

      <WarningNote>
        <strong className="text-white">Decoding is not verification.</strong> This tool does not check the signature, issuer, audience or
        any other rule, and anyone can create a token with any contents. Never trust decoded claims as proof of identity; verify tokens on
        your server using the correct key.
      </WarningNote>

      <Panel>
        <PanelLabel htmlFor={inputId} meta={`${token.length.toLocaleString()} characters`}>
          Token
        </PanelLabel>
        <TextArea
          id={inputId}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste a JWT (xxxxx.yyyyy.zzzzz) or an Authorization: Bearer header."
          value={token}
        />
        <div className="mt-4">
          <Button disabled={!token} onClick={() => setToken("")} variant="danger">
            Clear
          </Button>
        </div>
        {result && !result.ok ? <ErrorMessage>{result.error}</ErrorMessage> : null}
      </Panel>

      {result?.ok ? (
        <>
          {result.warnings.length > 0 ? (
            <WarningNote>
              <p className="font-semibold text-white">Things to check</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </WarningNote>
          ) : null}

          {result.timeClaims.length > 0 ? (
            <Panel>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Time claims</h3>
              <p className="mt-2 text-xs text-slate-500">Compared with your device&apos;s clock.</p>
              <dl className="mt-4 space-y-3">
                {result.timeClaims.map((claim) => (
                  <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4" key={claim.claim}>
                    <dt className="text-sm font-semibold text-white">{claim.label}</dt>
                    <dd className={`mt-1 text-sm ${claim.attention ? "text-amber-200" : "text-emerald-300"}`}>{claim.status}</dd>
                    <dd className="mt-1 font-mono text-xs text-slate-400">
                      {claim.iso} · {claim.seconds}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          ) : null}

          <Panel>
            <PanelLabel>Header{result.algorithm ? ` · ${result.algorithm}` : ""}</PanelLabel>
            <pre className="mt-3 max-h-96 overflow-auto rounded-2xl border border-white/10 bg-[#080b1a]/80 p-4 font-mono text-sm leading-6 text-slate-100">
              {pretty(result.header)}
            </pre>
            <div className="mt-4">
              <CopyButton text={pretty(result.header)} />
            </div>
          </Panel>

          <Panel>
            <PanelLabel>Payload</PanelLabel>
            <pre className="mt-3 max-h-96 overflow-auto rounded-2xl border border-white/10 bg-[#080b1a]/80 p-4 font-mono text-sm leading-6 text-slate-100">
              {pretty(result.payload)}
            </pre>
            <div className="mt-4">
              <CopyButton text={pretty(result.payload)} />
            </div>
          </Panel>

          <Panel>
            <PanelLabel>Signature (not verified)</PanelLabel>
            <p className="mt-3 break-all font-mono text-sm leading-6 text-slate-300">
              {result.signature || "(empty)"}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Shown as encoded text. Checking it requires the signing key, which this tool never asks for.
            </p>
          </Panel>
        </>
      ) : null}
    </section>
  );
}
