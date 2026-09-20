"use client";

import { useId, useState } from "react";

import type { AuthFlowConfig, RegistrationField } from "@/modules/auth-config";

import { evaluatePassword, getNativeConstraints, passwordStrength } from "./validation";

type FieldRendererProps = {
  field: RegistrationField;
  passwordPolicy: AuthFlowConfig["passwordPolicy"];
  error?: string;
};

function describedBy(helpId: string, errorId: string, field: RegistrationField, error?: string) {
  return [field.helpText ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
}

function RequiredMark({ required }: { required: boolean }) {
  return required ? <span className="authflow-required" aria-hidden="true"> *</span> : null;
}

export function FieldRenderer({ field, passwordPolicy, error }: FieldRendererProps) {
  const reactId = useId();
  const inputId = `authflow-${field.id}-${reactId.replaceAll(":", "")}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const descriptionIds = describedBy(helpId, errorId, field, error);
  const constraints = getNativeConstraints(field);
  const fieldClass = `authflow-field authflow-field-${field.width}`;

  if (field.type === "radio") {
    return (
      <fieldset className={fieldClass} aria-describedby={descriptionIds} aria-invalid={Boolean(error)}>
        <legend>{field.label}<RequiredMark required={field.required} /></legend>
        <div className="authflow-choices">
          {field.options.map((option) => (
            <label className="authflow-choice" key={option.value}>
              <input name={field.id} type="radio" value={option.value} required={field.required} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <FieldMessages field={field} helpId={helpId} error={error} errorId={errorId} />
      </fieldset>
    );
  }

  if (field.type === "checkbox" || field.type === "boolean" || field.type === "consent") {
    return (
      <div className={`${fieldClass} authflow-check-field`}>
        <label htmlFor={inputId}>
          <input
            id={inputId}
            name={field.id}
            type="checkbox"
            required={field.required}
            defaultChecked={field.type === "consent" ? false : field.defaultValue}
            aria-describedby={descriptionIds}
            aria-invalid={Boolean(error)}
          />
          <span>
            {field.label}<RequiredMark required={field.required} />
            {field.type === "consent" && field.policyUrl ? (
              <> <a href={field.policyUrl}>Read policy</a></>
            ) : null}
          </span>
        </label>
        <FieldMessages field={field} helpId={helpId} error={error} errorId={errorId} />
      </div>
    );
  }

  return (
    <div className={fieldClass}>
      <label htmlFor={inputId}>{field.label}<RequiredMark required={field.required} /></label>
      {field.type === "textarea" ? (
        <textarea
          id={inputId}
          name={field.id}
          required={field.required}
          placeholder={field.placeholder}
          minLength={constraints.minLength}
          maxLength={constraints.maxLength}
          aria-describedby={descriptionIds}
          aria-invalid={Boolean(error)}
        />
      ) : field.type === "dropdown" ? (
        <select
          id={inputId}
          name={field.id}
          required={field.required}
          defaultValue=""
          aria-describedby={descriptionIds}
          aria-invalid={Boolean(error)}
        >
          <option value="" disabled>Select {field.label.toLowerCase()}</option>
          {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : field.type === "password" ? (
        <PasswordInput
          inputId={inputId}
          field={field}
          constraints={constraints}
          descriptionIds={descriptionIds}
          error={error}
          passwordPolicy={passwordPolicy}
        />
      ) : (
        <input
          id={inputId}
          name={field.id}
          type={field.type === "phone" ? "tel" : field.type}
          required={field.required}
          placeholder={field.placeholder}
          autoComplete={"autocomplete" in field ? field.autocomplete : undefined}
          minLength={constraints.minLength}
          maxLength={constraints.maxLength}
          min={constraints.min}
          max={constraints.max}
          pattern={constraints.pattern}
          aria-describedby={descriptionIds}
          aria-invalid={Boolean(error)}
        />
      )}
      <FieldMessages field={field} helpId={helpId} error={error} errorId={errorId} />
    </div>
  );
}

type PasswordInputProps = {
  inputId: string;
  field: Extract<RegistrationField, { type: "password" }>;
  constraints: ReturnType<typeof getNativeConstraints>;
  descriptionIds?: string;
  error?: string;
  passwordPolicy: AuthFlowConfig["passwordPolicy"];
};

function PasswordInput({ inputId, field, constraints, descriptionIds, error, passwordPolicy }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState("");
  const isPrimaryPassword = field.id === "password";
  const strength = passwordStrength(password, passwordPolicy);
  const requirements = evaluatePassword(password, passwordPolicy);

  return (
    <>
      <div className="authflow-password-input">
        <input
          id={inputId}
          name={field.id}
          type={visible ? "text" : "password"}
          required={field.required}
          placeholder={field.placeholder}
          autoComplete={field.autocomplete}
          minLength={constraints.minLength}
          maxLength={constraints.maxLength}
          aria-describedby={descriptionIds}
          aria-invalid={Boolean(error)}
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={`${visible ? "Hide" : "Show"} ${field.label.toLowerCase()}`}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {isPrimaryPassword && passwordPolicy.showStrength ? (
        <div className="authflow-password-feedback" aria-live="polite">
          <div className="authflow-strength" aria-label={`Password strength ${strength} of 4`}>
            {[1, 2, 3, 4].map((level) => <span className={level <= strength ? "active" : ""} key={level} />)}
          </div>
          <ul>
            {requirements.map((requirement) => (
              <li className={requirement.met ? "met" : ""} key={requirement.id}>{requirement.label}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function FieldMessages({ field, helpId, error, errorId }: { field: RegistrationField; helpId: string; error?: string; errorId: string }) {
  return (
    <>
      {field.helpText ? <small id={helpId}>{field.helpText}</small> : null}
      {error ? <span className="authflow-field-error" id={errorId} role="alert">{error}</span> : null}
    </>
  );
}
