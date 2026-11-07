"use client";

import { useId, useMemo, useState } from "react";
import {
  Button,
  CheckboxField,
  CopyButton,
  Panel,
  PanelLabel,
  PrivacyNote,
  SelectField,
  TextArea,
} from "@/components/tools/tool-ui";
import { defaultLineOptions, processLines, type LineOptions, type SortMode } from "@/lib/text/lines";

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: "none", label: "Keep original order" },
  { value: "asc", label: "Sort A → Z" },
  { value: "desc", label: "Sort Z → A" },
  { value: "length-asc", label: "Shortest lines first" },
  { value: "length-desc", label: "Longest lines first" },
  { value: "reverse", label: "Reverse order" },
];

export function TextCleanerLineSorterTool() {
  const inputId = useId();
  const outputId = useId();
  const sortId = useId();
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<LineOptions>(defaultLineOptions);

  const update = <K extends keyof LineOptions>(key: K, value: LineOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));

  const result = useMemo(() => processLines(input, options), [input, options]);
  const sorting = options.sort === "asc" || options.sort === "desc";

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your text never leaves your device. Cleaning and sorting happen entirely in your browser.</PrivacyNote>

      <Panel>
        <PanelLabel htmlFor={inputId} meta={`${input.length.toLocaleString()} characters`}>
          Input (one item per line)
        </PanelLabel>
        <TextArea
          id={inputId}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste your lines here."
          value={input}
        />
      </Panel>

      <Panel>
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Options</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <CheckboxField checked={options.trimLines} onChange={(value) => update("trimLines", value)}>
            Trim spaces at the start and end of each line
          </CheckboxField>
          <CheckboxField checked={options.collapseSpaces} onChange={(value) => update("collapseSpaces", value)}>
            Collapse repeated spaces and tabs into one space
          </CheckboxField>
          <CheckboxField checked={options.removeEmpty} onChange={(value) => update("removeEmpty", value)}>
            Remove empty and blank lines
          </CheckboxField>
          <div className="space-y-2">
            <CheckboxField
              checked={options.removeDuplicates}
              hint="The first occurrence is kept"
              onChange={(value) => update("removeDuplicates", value)}
            >
              Remove duplicate lines
            </CheckboxField>
            {options.removeDuplicates ? (
              <div className="pl-7">
                <CheckboxField
                  checked={options.ignoreCaseForDuplicates}
                  onChange={(value) => update("ignoreCaseForDuplicates", value)}
                >
                  Ignore letter case
                </CheckboxField>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SelectField id={sortId} label="Order" onChange={(value) => update("sort", value)} options={sortOptions} value={options.sort} />
          {sorting ? (
            <div className="space-y-3 self-end">
              <CheckboxField
                checked={options.naturalSort}
                hint="Puts item2 before item10"
                onChange={(value) => update("naturalSort", value)}
              >
                Sort numbers by value
              </CheckboxField>
              <CheckboxField checked={options.ignoreCaseForSort} onChange={(value) => update("ignoreCaseForSort", value)}>
                Ignore letter case
              </CheckboxField>
            </div>
          ) : null}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Steps run in this order: trim, collapse spaces, remove empty lines, remove duplicates, then sort.
        </p>
      </Panel>

      <Panel>
        <PanelLabel htmlFor={outputId} meta={`${result.stats.outputLines.toLocaleString()} lines`}>
          Result
        </PanelLabel>
        <TextArea id={outputId} placeholder="The cleaned text appears here." readOnly value={result.text} />
        {input ? (
          <p className="mt-3 text-sm text-slate-400" role="status">
            {result.stats.inputLines.toLocaleString()} lines in, {result.stats.outputLines.toLocaleString()} out
            {result.stats.emptyRemoved > 0 ? ` · ${result.stats.emptyRemoved.toLocaleString()} empty removed` : ""}
            {result.stats.duplicatesRemoved > 0 ? ` · ${result.stats.duplicatesRemoved.toLocaleString()} duplicates removed` : ""}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CopyButton text={result.text} />
          <Button disabled={!input} onClick={() => setInput(result.text)} variant="neutral">
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
