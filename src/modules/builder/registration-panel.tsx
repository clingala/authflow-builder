"use client";

import { useState } from "react";

import type { AuthFlowConfig, RegistrationField } from "@/modules/auth-config";

import { ControlGroup, TextControl } from "./controls";
import type { UpdateAuthConfig } from "./types";

type AddableType = RegistrationField["type"] | "full_name" | "username" | "confirm_password";

const fieldTypes: Array<{ value: AddableType; label: string }> = [
  { value: "full_name", label: "Full name" },
  { value: "username", label: "Username" },
  { value: "email", label: "Email address" },
  { value: "phone", label: "Phone number" },
  { value: "password", label: "Password" },
  { value: "confirm_password", label: "Confirm password" },
  { value: "text", label: "Custom text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Radio group" },
  { value: "checkbox", label: "Checkbox" },
  { value: "textarea", label: "Textarea" },
  { value: "boolean", label: "Boolean" },
  { value: "consent", label: "Consent" },
];

function uniqueId(type: AddableType, fields: RegistrationField[]) {
  const standardIds = new Set(["full_name", "username", "email", "phone", "password", "confirm_password"]);
  const base = standardIds.has(type) ? type : type === "consent" ? "custom_consent" : `custom_${type}`;
  const ids = new Set(fields.map((field) => field.id));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

function newField(type: AddableType, fields: RegistrationField[]): RegistrationField {
  const id = uniqueId(type, fields);
  const common = { id, label: `Custom ${fieldTypes.find((item) => item.value === type)?.label ?? "Field"}`, required: false, width: "full" as const };
  if (type === "full_name") return { ...common, label: "Full Name", type: "text", required: true, autocomplete: "name" };
  if (type === "username") return { ...common, label: "Username", type: "text", required: true, autocomplete: "username", validation: { patternPreset: "username", maxLength: 64 } };
  if (type === "email") return { ...common, label: "Email Address", type, required: true, autocomplete: "email", validation: { patternPreset: "email", maxLength: 254 } };
  if (type === "phone") return { ...common, label: "Phone Number", type, required: true, autocomplete: "tel", validation: { patternPreset: "phone", maxLength: 30 } };
  if (type === "password") return { ...common, label: "Password", type, required: true, autocomplete: "new-password" };
  if (type === "confirm_password") return { ...common, label: "Confirm Password", type: "password", required: true, autocomplete: "new-password" };
  if (type === "dropdown" || type === "radio") return { ...common, type, options: [{ value: "option_1", label: "Option 1" }, { value: "option_2", label: "Option 2" }] };
  if (type === "consent") return { ...common, type, consentKind: "custom" };
  if (type === "checkbox" || type === "boolean") return { ...common, type, defaultValue: false };
  if (type === "number" || type === "date") return { ...common, type };
  return { ...common, type };
}

export function RegistrationPanel({ config, update, selectedFieldId, onSelectField }: {
  config: AuthFlowConfig;
  update: UpdateAuthConfig;
  selectedFieldId?: string;
  onSelectField: (fieldId: string) => void;
}) {
  const [addType, setAddType] = useState<AddableType>("full_name");

  function move(index: number, direction: -1 | 1) {
    update((draft) => {
      const destination = index + direction;
      if (destination < 0 || destination >= draft.registration.fields.length) return;
      const [field] = draft.registration.fields.splice(index, 1);
      if (field) draft.registration.fields.splice(destination, 0, field);
    });
  }

  function remove(fieldId: string) {
    update((draft) => { draft.registration.fields = draft.registration.fields.filter((field) => field.id !== fieldId); });
  }

  function add() {
    const field = newField(addType, config.registration.fields);
    update((draft) => { draft.registration.fields.push(field); });
    onSelectField(field.id);
  }

  return (
    <div className="builder-section-panel">
      <ControlGroup title="Signup content">
        <TextControl label="Description" value={config.registration.description} maxLength={240} onChange={(value) => update((draft) => { draft.registration.description = value; })} />
      </ControlGroup>
      <ControlGroup title="Registration fields" description="Select a field to edit its properties. Reordering also changes the generated form.">
        <ol className="builder-field-list">
          {config.registration.fields.map((field, index) => (
            <li className={selectedFieldId === field.id ? "selected" : ""} key={field.id}>
              <button className="builder-field-select" type="button" onClick={() => onSelectField(field.id)}>
                <span>{field.label}</span><small>{field.type} · {field.required ? "required" : "optional"}</small>
              </button>
              <span className="builder-field-actions">
                <button type="button" aria-label={`Move ${field.label} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
                <button type="button" aria-label={`Move ${field.label} down`} disabled={index === config.registration.fields.length - 1} onClick={() => move(index, 1)}>↓</button>
                <button className="danger" type="button" aria-label={`Remove ${field.label}`} onClick={() => remove(field.id)}>×</button>
              </span>
            </li>
          ))}
        </ol>
        <div className="builder-add-field">
          <label><span>Field type</span><select value={addType} onChange={(event) => setAddType(event.currentTarget.value as AddableType)}>{fieldTypes.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}</select></label>
          <button type="button" onClick={add}>Add field</button>
        </div>
      </ControlGroup>
    </div>
  );
}
