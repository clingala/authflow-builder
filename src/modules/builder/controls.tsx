"use client";

import type { ChangeEventHandler, ReactNode } from "react";

export function ControlGroup({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="builder-control-group">
      <legend>{title}</legend>
      {description ? <p>{description}</p> : null}
      <div>{children}</div>
    </fieldset>
  );
}

export function TextControl({ label, value, onChange, maxLength = 120, type = "text" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  type?: "text" | "url";
}) {
  return (
    <label className="builder-control">
      <span>{label}</span>
      <input type={type} value={value} maxLength={maxLength} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

export function NumberControl({ label, value, onChange, min, max }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="builder-control">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const nextValue = event.currentTarget.valueAsNumber;
          if (Number.isFinite(nextValue)) onChange(nextValue);
        }}
      />
    </label>
  );
}

export function SelectControl({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  children: ReactNode;
}) {
  return (
    <label className="builder-control">
      <span>{label}</span>
      <select value={value} onChange={onChange}>{children}</select>
    </label>
  );
}

export function ToggleControl({ label, description, checked, onChange, disabled = false }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`builder-toggle${disabled ? " disabled" : ""}`}>
      <span><strong>{label}</strong>{description ? <small>{description}</small> : null}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} disabled={disabled} />
      <i aria-hidden="true" />
    </label>
  );
}
