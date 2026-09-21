export type ContrastCheck = { label: string; ratio: number; required: number; passes: boolean };

function rgb(hex: string) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function luminance(hex: string) {
  const [red, green, blue] = rgb(hex).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

export function contrastRatio(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

export function accessibleTextColor(background: string): "#000000" | "#FFFFFF" {
  return contrastRatio(background, "#000000") >= contrastRatio(background, "#FFFFFF") ? "#000000" : "#FFFFFF";
}

export function accessibleFocusColor(preferred: string, surface: string) {
  return contrastRatio(preferred, surface) >= 3 ? preferred : accessibleTextColor(surface);
}

export function auditBranding(branding: { primaryColor: string; backgroundColor: string; surfaceColor: string; textColor: string }): ContrastCheck[] {
  const primaryText = accessibleTextColor(branding.primaryColor);
  return [
    check("Primary button", primaryText, branding.primaryColor, 4.5),
    check("Card text", branding.textColor, branding.surfaceColor, 4.5),
    check("Page text", branding.textColor, branding.backgroundColor, 4.5),
    check("Focus indicator", branding.primaryColor, branding.surfaceColor, 3),
  ];
}

function check(label: string, foreground: string, background: string, required: number): ContrastCheck {
  const ratio = contrastRatio(foreground, background);
  return { label, ratio, required, passes: ratio >= required };
}
