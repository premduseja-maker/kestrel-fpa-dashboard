"use client";

import { pct, pctChange, usdFull } from "@/lib/format";
import type {
  Baseline,
  DriverKey,
  Drivers,
  DriverSpec,
} from "@/lib/metrics/forecast";

/**
 * The model's inputs. Each control shows the measured baseline beneath it, so the
 * reader always knows what they are changing from — a slider without its starting
 * point is just a number with no meaning.
 */
export function DriverSliders({
  specs,
  drivers,
  baseline,
  onChange,
  onReset,
}: {
  specs: DriverSpec[];
  drivers: Drivers;
  baseline: Baseline;
  onChange: (key: DriverKey, value: number) => void;
  onReset: () => void;
}) {
  const dirty = specs.some(
    (spec) => Math.abs(drivers[spec.key] - baseline[spec.key]) > 1e-9,
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 pb-1">
        <p className="text-[11px] text-muted">
          Eight drivers. Every change recomputes the full twelve months.
        </p>
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty}
          className="border border-rule px-2 py-1 text-[11px] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderRadius: 5 }}
        >
          Reset to actual
        </button>
      </div>

      <ul className="grid list-none grid-cols-1 gap-x-6 gap-y-4 p-0 sm:grid-cols-2">
        {specs.map((spec) => (
          <li key={spec.key}>
            <Slider
              spec={spec}
              value={drivers[spec.key]}
              baselineValue={baseline[spec.key]}
              onChange={(value) => onChange(spec.key, value)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Slider({
  spec,
  value,
  baselineValue,
  onChange,
}: {
  spec: DriverSpec;
  value: number;
  baselineValue: number;
  onChange: (value: number) => void;
}) {
  const changed = Math.abs(value - baselineValue) > 1e-9;
  const moveIsGood =
    value === baselineValue
      ? null
      : value > baselineValue === spec.higherIsBetter;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={`driver-${spec.key}`}
          className="text-[12px] text-ink"
        >
          {spec.label}
        </label>
        <span className="fig text-[13px] font-semibold text-ink">
          {format(value, spec)}
        </span>
      </div>

      <input
        id={`driver-${spec.key}`}
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full accent-[var(--signal)]"
        aria-describedby={`driver-${spec.key}-baseline`}
      />

      <p
        id={`driver-${spec.key}-baseline`}
        className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[10.5px] text-muted"
      >
        <span>
          Actual <span className="fig">{format(baselineValue, spec)}</span>
        </span>
        {changed && (
          // Direction is carried by the word as well as the colour.
          <span
            className={
              moveIsGood ? "text-favourable" : "text-unfavourable"
            }
          >
            {moveIsGood ? "better by" : "worse by"}{" "}
            <span className="fig">
              {relative(value, baselineValue)}
            </span>
          </span>
        )}
        <span className="basis-full">{spec.help}</span>
      </p>
    </div>
  );
}

function format(value: number, spec: DriverSpec): string {
  if (spec.unit === "percent") return pct(value);
  if (spec.unit === "months") return `${value.toFixed(1)}m`;
  return usdFull(value);
}

function relative(value: number, baselineValue: number): string {
  if (baselineValue === 0) return "—";
  return pctChange(Math.abs(value / baselineValue - 1));
}
