"use client";

import type { AuthFlowConfig } from "@/modules/auth-config";

import { ControlGroup, NumberControl, SelectControl, TextControl } from "./controls";
import type { UpdateAuthConfig } from "./types";

type ColorKey = "primaryColor" | "backgroundColor" | "surfaceColor" | "textColor";

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
  return (
    <div className="builder-section-panel">
      <ControlGroup title="Brand assets">
        <TextControl label="Logo URL (optional)" type="url" value={config.branding.logoUrl ?? ""} maxLength={500} onChange={(value) => update((draft) => {
          if (value) draft.branding.logoUrl = value;
          else delete draft.branding.logoUrl;
        })} />
      </ControlGroup>
      <ControlGroup title="Colors">
        <ColorControl label="Primary" colorKey="primaryColor" config={config} update={update} />
        <ColorControl label="Background" colorKey="backgroundColor" config={config} update={update} />
        <ColorControl label="Surface" colorKey="surfaceColor" config={config} update={update} />
        <ColorControl label="Text" colorKey="textColor" config={config} update={update} />
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
