"use client";

import type { AuthFlowConfig, RegistrationField } from "@/modules/auth-config";

import { NumberControl, SelectControl, TextControl, ToggleControl } from "./controls";
import type { UpdateAuthConfig } from "./types";

type TextField = Extract<RegistrationField, { type: "text" | "email" | "phone" | "password" | "textarea" }>;

function isTextField(field: RegistrationField): field is TextField {
  return field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "password" || field.type === "textarea";
}

export function FieldProperties({ field, update }: { field: RegistrationField; update: UpdateAuthConfig }) {
  function change(mutate: (field: RegistrationField) => void) {
    update((draft) => {
      const target = draft.registration.fields.find((candidate) => candidate.id === field.id);
      if (target) mutate(target);
    });
  }

  return (
    <aside className="builder-properties" aria-label={`${field.label} properties`}>
      <div className="builder-properties-heading"><p className="eyebrow">Selected field</p><h2>{field.label}</h2><code>{field.id}</code></div>
      <div className="builder-properties-body">
        <TextControl label="Label" value={field.label} maxLength={80} onChange={(value) => change((target) => { target.label = value; })} />
        {"placeholder" in field ? <TextControl label="Placeholder" value={field.placeholder ?? ""} onChange={(value) => change((target) => {
          if ("placeholder" in target) target.placeholder = value || undefined;
        })} /> : null}
        <TextControl label="Help text" value={field.helpText ?? ""} maxLength={240} onChange={(value) => change((target) => { target.helpText = value || undefined; })} />
        <ToggleControl label="Required" checked={field.required} onChange={(checked) => change((target) => { target.required = checked; })} />
        <SelectControl label="Width" value={field.width} onChange={(event) => change((target) => { target.width = event.currentTarget.value as "full" | "half"; })}>
          <option value="full">Full width</option><option value="half">Half width</option>
        </SelectControl>
        {isTextField(field) ? (
          <>
            <NumberControl label="Minimum length" value={field.validation?.minLength ?? 0} min={0} max={1000} onChange={(value) => change((target) => {
              if (isTextField(target)) target.validation = { ...target.validation, minLength: value };
            })} />
            <NumberControl label="Maximum length" value={field.validation?.maxLength ?? 120} min={1} max={4000} onChange={(value) => change((target) => {
              if (isTextField(target)) target.validation = { ...target.validation, maxLength: value };
            })} />
          </>
        ) : null}
        {(field.type === "dropdown" || field.type === "radio") ? (
          <div className="builder-option-editor">
            <strong>Options</strong>
            {field.options.map((option, index) => (
              <TextControl key={`${option.value}-${index}`} label={`Option ${index + 1}`} value={option.label} maxLength={80} onChange={(value) => change((target) => {
                if (target.type === "dropdown" || target.type === "radio") {
                  const current = target.options[index];
                  if (current) current.label = value;
                }
              })} />
            ))}
          </div>
        ) : null}
        {field.type === "consent" ? <TextControl label="Policy URL" value={field.policyUrl ?? ""} maxLength={500} onChange={(value) => change((target) => {
          if (target.type === "consent") target.policyUrl = value || undefined;
        })} /> : null}
      </div>
    </aside>
  );
}

export function EmptyProperties({ config }: { config: AuthFlowConfig }) {
  return (
    <aside className="builder-properties builder-properties-empty" aria-label="Builder guidance">
      <div><span aria-hidden="true">◇</span><h2>Select a registration field</h2><p>Field-specific settings appear here. The preview always renders the current local draft.</p></div>
      <dl><div><dt>Account type</dt><dd>{config.app.accountType}</dd></div><div><dt>Fields</dt><dd>{config.registration.fields.length}</dd></div><div><dt>Schema</dt><dd>v{config.schemaVersion}</dd></div></dl>
    </aside>
  );
}
