"use client";

import type { AuthFlowConfig } from "@/modules/auth-config";
import { auditBranding } from "@/modules/branding";

import { ControlGroup, NumberControl, SelectControl, TextControl } from "./controls";
import type { UpdateAuthConfig } from "./types";

type ColorKey = "primaryColor" | "backgroundColor" | "surfaceColor" | "textColor";

const presets = [
  { name: "Forest", primaryColor: "#173D31", backgroundColor: "#F4F7F3", surfaceColor: "#FFFFFF", textColor: "#15211C" },
  { name: "Midnight", primaryColor: "#243B73", backgroundColor: "#F2F5FC", surfaceColor: "#FFFFFF", textColor: "#17213B" },
  { name: "Plum", primaryColor: "#69345F", backgroundColor: "#FAF4F8", surfaceColor: "#FFFFFF", textColor: "#2D1B29" },
  { name: "Sunrise", primaryColor: "#F4D35E", backgroundColor: "#FFF9E8", surfaceColor: "#FFFFFF", textColor: "#2B2412" },
] as const;

function ColorControl({ label, colorKey, config, update }: { label: string; colorKey: ColorKey; config: AuthFlowConfig; update: UpdateAuthConfig }) {
  const value = config.branding[colorKey];
  return (
    <label className="builder-control builder-color-control">
      <span>{label}</span>
      <span><input type="color" value={value} onChange={(event) => update((draft) => { draft.branding[colorKey] = event.currentTarget.value.toUpperCase(); })} /><code>{value}</code></span>
    </label>
  );
}

export function BrandingPanel({ config, update }: { config: AuthFlowConfig; update: UpdateAuthConfig }) {
  const contrast = auditBranding(config.branding);
  return (
    <div className="builder-section-panel">
      <ControlGroup title="Brand assets">
        <TextControl label="Logo URL (optional)" type="url" value={config.branding.logoUrl ?? ""} maxLength={500} onChange={(value) => update((draft) => {
          if (value) draft.branding.logoUrl = value;
          else delete draft.branding.logoUrl;
        })} />
      </ControlGroup>
      <ControlGroup title="Colors">
        <div className="builder-theme-presets" aria-label="Theme presets">
          {presets.map((preset) => <button key={preset.name} type="button" onClick={() => update((draft) => {
            draft.branding.primaryColor = preset.primaryColor;
            draft.branding.backgroundColor = preset.backgroundColor;
            draft.branding.surfaceColor = preset.surfaceColor;
            draft.branding.textColor = preset.textColor;
            delete (draft.branding as unknown as Record<string, unknown>).name;
          })}>
            <span style={{ background: `linear-gradient(135deg, ${preset.primaryColor} 50%, ${preset.backgroundColor} 50%)` }} aria-hidden="true" />{preset.name}
          </button>)}
        </div>
        <ColorControl label="Primary" colorKey="primaryColor" config={config} update={update} />
        <ColorControl label="Background" colorKey="backgroundColor" config={config} update={update} />
        <ColorControl label="Surface" colorKey="surfaceColor" config={config} update={update} />
        <ColorControl label="Text" colorKey="textColor" config={config} update={update} />
        <div className="builder-contrast-report" aria-live="polite">
          <strong>Accessibility contrast</strong>
          <ul>{contrast.map((check) => <li className={check.passes ? "passes" : "fails"} key={check.label}>
            <span>{check.passes ? "Pass" : "Review"}</span><b>{check.label}</b><code>{check.ratio.toFixed(2)}:1</code><small>needs {check.required}:1</small>
          </li>)}</ul>
        </div>
      </ControlGroup>
      <ControlGroup title="Layout and typography">
        <NumberControl label="Border radius" value={config.branding.borderRadius} min={0} max={32} onChange={(value) => update((draft) => { draft.branding.borderRadius = value; })} />
        <SelectControl label="Spacing" value={config.branding.spacing} onChange={(event) => update((draft) => { draft.branding.spacing = event.currentTarget.value as AuthFlowConfig["branding"]["spacing"]; })}>
          <option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option>
        </SelectControl>
        <SelectControl label="Typography" value={config.branding.fontFamily} onChange={(event) => update((draft) => { draft.branding.fontFamily = event.currentTarget.value as AuthFlowConfig["branding"]["fontFamily"]; })}>
          <option value="system">System sans</option><option value="serif">Serif</option><option value="mono">Monospace</option>
        </SelectControl>
        <SelectControl label="Field arrangement" value={config.branding.fieldArrangement} onChange={(event) => update((draft) => { draft.branding.fieldArrangement = event.currentTarget.value as AuthFlowConfig["branding"]["fieldArrangement"]; })}>
          <option value="single_column">Single column</option><option value="responsive_two_column">Responsive two column</option>
        </SelectControl>
      </ControlGroup>
    </div>
  );
}
