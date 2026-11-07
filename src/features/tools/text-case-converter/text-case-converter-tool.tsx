"use client";

import { useId, useMemo, useState } from "react";
import {
  Button,
  ChoiceGroup,
  CheckboxField,
  CopyButton,
  Panel,
  PanelLabel,
  PrivacyNote,
  TextArea,
} from "@/components/tools/tool-ui";
import { caseModes, convertCase, type CaseMode } from "@/lib/text/case";

const modeOptions = caseModes.map((mode) => ({ value: mode.value, label: mode.label }));

export function TextCaseConverterTool() {
  const inputId = useId();
  const outputId = useId();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<CaseMode>("title");
  const [keepSmallWordsLower, setKeepSmallWordsLower] = useState(false);

  const output = useMemo(() => convertCase(input, mode, { keepSmallWordsLower }), [input, mode, keepSmallWordsLower]);
  const example = caseModes.find((entry) => entry.value === mode)?.example;

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your text never leaves your device. Conversion happens entirely in your browser.</PrivacyNote>

      <Panel>
        <PanelLabel htmlFor={inputId} meta={`${input.length.toLocaleString()} characters`}>
          Input
        </PanelLabel>
        <TextArea
          id={inputId}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type or paste your text here."
          value={input}
        />
      </Panel>

      <Panel>
        <ChoiceGroup legend="Convert to" onChange={setMode} options={modeOptions} value={mode} />
        {example ? <p className="mt-3 text-xs text-slate-500">Example: {example}</p> : null}
        {mode === "title" ? (
          <div className="mt-4">
            <CheckboxField
              checked={keepSmallWordsLower}
              hint="a, an, the, and, of, in, on… stay lowercase unless first or last"
              onChange={setKeepSmallWordsLower}
            >
              Keep small words lowercase
            </CheckboxField>
          </div>
        ) : null}
        {mode === "sentence" ? (
          <p className="mt-3 text-xs text-slate-500">
            Capitalises the first letter of each sentence and line. Proper nouns and acronyms are not detected, so review the result.
          </p>
        ) : null}
      </Panel>

      <Panel>
        <PanelLabel htmlFor={outputId} meta={`${output.length.toLocaleString()} characters`}>
          Result
        </PanelLabel>
        <TextArea id={outputId} placeholder="The converted text appears here." readOnly value={output} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CopyButton text={output} />
          <Button
            disabled={!input}
            onClick={() => setInput(output)}
            title="Replace the input with the result so you can convert it again"
            variant="neutral"
          >
            Use result as input
          </Button>
          <Button disabled={!input} onClick={() => setInput("")} variant="danger">
            Clear
          </Button>
        </div>
      </Panel>
    </section>
  );
}
