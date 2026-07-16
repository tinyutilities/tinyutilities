"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const characterSets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*_-+=?",
};

const ambiguousCharacters = new Set(["0", "O", "o", "1", "I", "l"]);

type GeneratorOptions = {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

type GeneratorStatus = "idle" | "loading" | "success" | "error";

const initialOptions: GeneratorOptions = {
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

function getRandomIndex(max: number) {
  if (max <= 0) {
    throw new Error("Random index maximum must be greater than zero.");
  }

  const values = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;

  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);

  return values[0] % max;
}

function shuffleCharacters(characters: string[]) {
  const shuffled = [...characters];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIndex(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.join("");
}

function countOccurrences(value: string, search: string) {
  if (!search) {
    return 0;
  }

  let count = 0;
  let index = value.indexOf(search);

  while (index !== -1) {
    count += 1;
    index = value.indexOf(search, index + 1);
  }

  return count;
}

function insertAtRandomPosition(value: string, insertion: string) {
  const insertionIndex = getRandomIndex(value.length + 1);

  return `${value.slice(0, insertionIndex)}${insertion}${value.slice(insertionIndex)}`;
}

function getPersonalWordRandomPool(allCharacters: string, personalWord: string) {
  const personalCharacters = new Set([...personalWord]);
  const filteredCharacters = [...allCharacters].filter((character) => !personalCharacters.has(character)).join("");

  return filteredCharacters || allCharacters;
}

function filterAmbiguousCharacters(characters: string) {
  return [...characters].filter((character) => !ambiguousCharacters.has(character)).join("");
}

function getEnabledSets(options: GeneratorOptions, excludeAmbiguous: boolean) {
  return Object.entries(characterSets)
    .filter(([key]) => options[key as keyof GeneratorOptions])
    .map(([, characters]) => (excludeAmbiguous ? filterAmbiguousCharacters(characters) : characters))
    .filter(Boolean);
}

function calculateStrength(length: number, characterPoolSize: number) {
  if (characterPoolSize === 0) {
    return { label: "Unavailable", width: "0%", className: "bg-red-400", value: 0 };
  }

  const entropy = length * Math.log2(characterPoolSize);

  if (entropy < 50) {
    return { label: "Weak", width: "25%", className: "bg-red-400", value: 25 };
  }

  if (entropy < 75) {
    return { label: "Fair", width: "50%", className: "bg-yellow-300", value: 50 };
  }

  if (entropy < 100) {
    return { label: "Strong", width: "75%", className: "bg-cyan-300", value: 75 };
  }

  return { label: "Excellent", width: "100%", className: "bg-teal-300", value: 100 };
}

function copyWithFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

export function PasswordGeneratorTool() {
  const generationTimeout = useRef<number | null>(null);
  const [length, setLength] = useState(20);
  const [options, setOptions] = useState<GeneratorOptions>(initialOptions);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [personalWord, setPersonalWord] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<GeneratorStatus>("idle");
  const [message, setMessage] = useState("Choose your settings and generate a password.");
  const hasPersonalWordLengthError = personalWord.length > length;

  const enabledSets = useMemo(
    () => getEnabledSets(options, excludeAmbiguous),
    [excludeAmbiguous, options],
  );

  const strength = useMemo(
    () => calculateStrength(length, enabledSets.join("").length),
    [enabledSets, length],
  );

  const generatePassword = useCallback(() => {
    if (generationTimeout.current !== null) {
      window.clearTimeout(generationTimeout.current);
    }

    if (hasPersonalWordLengthError) {
      setStatus("error");
      setMessage("Password length must be at least as long as the personal word.");
      setPassword("");
      return;
    }

    const randomLength = length - personalWord.length;

    if (randomLength > 0 && enabledSets.length === 0) {
      setStatus("error");
      setMessage("Enable at least one character type.");
      setPassword("");
      return;
    }

    setStatus("loading");
    setMessage("Generating password...");

    generationTimeout.current = window.setTimeout(() => {
      const allCharacters = enabledSets.join("");
      let nextPassword = "";

      if (!personalWord) {
        const requiredCharacters = enabledSets.map((characters) => characters[getRandomIndex(characters.length)]);
        const remainingLength = Math.max(length - requiredCharacters.length, 0);
        const generatedCharacters = [...requiredCharacters];

        for (let index = 0; index < remainingLength; index += 1) {
          generatedCharacters.push(allCharacters[getRandomIndex(allCharacters.length)]);
        }

        nextPassword = shuffleCharacters(generatedCharacters).slice(0, length);
      } else {
        const randomCharacters = getPersonalWordRandomPool(allCharacters, personalWord);

        for (let attempt = 0; attempt < 50; attempt += 1) {
          const generatedCharacters: string[] = [];

          for (let index = 0; index < randomLength; index += 1) {
            generatedCharacters.push(randomCharacters[getRandomIndex(randomCharacters.length)]);
          }

          nextPassword = insertAtRandomPosition(shuffleCharacters(generatedCharacters), personalWord);

          if (countOccurrences(nextPassword, personalWord) === 1) {
            break;
          }
        }
      }

      setPassword(nextPassword);
      setStatus("success");
      setMessage("Password generated successfully.");
      generationTimeout.current = null;
    }, 150);
  }, [enabledSets, hasPersonalWordLengthError, length, personalWord]);

  useEffect(() => {
    generatePassword();
  }, [generatePassword]);

  useEffect(() => {
    return () => {
      if (generationTimeout.current !== null) {
        window.clearTimeout(generationTimeout.current);
      }
    };
  }, []);

  const copyPassword = async () => {
    if (!password) {
      setStatus("error");
      setMessage("Generate a password before copying.");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(password);
      } else if (!copyWithFallback(password)) {
        throw new Error("Fallback copy failed.");
      }

      setStatus("success");
      setMessage("Password copied to clipboard.");
    } catch {
      setStatus("error");
      setMessage("Could not copy the password. Select it manually instead.");
    }
  };

  const toggleOption = (option: keyof GeneratorOptions) => {
    setOptions((currentOptions) => ({
      ...currentOptions,
      [option]: !currentOptions[option],
    }));
  };

  const statusColor =
    status === "error" ? "text-red-300" : status === "success" ? "text-teal-300" : "text-slate-400";

  return (
    <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <label className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300" htmlFor="generated-password">
            Generated password
          </label>
          <output
            className="mt-4 block min-h-20 break-all rounded-2xl border border-white/10 bg-[#080b1a] p-5 font-mono text-xl leading-8 text-white"
            id="generated-password"
            aria-live="polite"
          >
            {status === "loading" ? "Generating..." : password || "No password generated"}
          </output>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={status === "loading" || hasPersonalWordLengthError}
              onClick={generatePassword}
              type="button"
            >
              Generate
            </button>
            <button
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={status === "loading" || hasPersonalWordLengthError}
              onClick={generatePassword}
              type="button"
            >
              Regenerate
            </button>
            <button
              className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={!password || status === "loading"}
              onClick={copyPassword}
              type="button"
            >
              Copy
            </button>
          </div>

          <p className={`mt-4 text-sm ${statusColor}`} role={status === "error" ? "alert" : "status"}>
            {message}
          </p>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-300">Password strength</span>
              <span className="font-semibold text-white">{strength.label}</span>
            </div>
            <div
              aria-label={`Password strength: ${strength.label}`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={strength.value}
              className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.className}`}
                style={{ width: strength.width }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-semibold text-white" htmlFor="password-length">
              Length
            </label>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-cyan-200">
              {length}
            </span>
          </div>
          <input
            className="mt-5 w-full accent-cyan-300"
            id="password-length"
            max="128"
            min="4"
            onChange={(event) => setLength(Number(event.target.value))}
            type="range"
            value={length}
          />
          <div className="mt-6">
            <label className="text-sm font-semibold text-white" htmlFor="personal-word">
              Personal word (optional)
            </label>
            <input
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-white/[0.07]"
              id="personal-word"
              onChange={(event) => setPersonalWord(event.target.value)}
              placeholder="e.g. anushka, apk, work, github"
              type="text"
              value={personalWord}
            />
            {hasPersonalWordLengthError ? (
              <p className="mt-2 text-sm text-red-300" role="alert">
                Password length must be at least as long as the personal word.
              </p>
            ) : null}
          </div>
          <div className="mt-6 grid gap-3">
            <Toggle checked={options.uppercase} label="Uppercase" onChange={() => toggleOption("uppercase")} />
            <Toggle checked={options.lowercase} label="Lowercase" onChange={() => toggleOption("lowercase")} />
            <Toggle checked={options.numbers} label="Numbers" onChange={() => toggleOption("numbers")} />
            <Toggle checked={options.symbols} label="Symbols" onChange={() => toggleOption("symbols")} />
            <Toggle
              checked={excludeAmbiguous}
              label="Exclude ambiguous characters"
              onChange={() => setExcludeAmbiguous((currentValue) => !currentValue)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

type ToggleProps = {
  checked: boolean;
  label: string;
  onChange: () => void;
};

function Toggle({ checked, label, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-300/30 hover:bg-white/[0.07]">
      <span>{label}</span>
      <input
        checked={checked}
        className="size-4 accent-cyan-300"
        onChange={onChange}
        type="checkbox"
      />
    </label>
  );
}
