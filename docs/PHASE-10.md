# Phase 10 delivery — Accessible branding safety

Phase 10 strengthens branding customization without turning theme data into executable styling. Owners still work with simple, validated design tokens while generated authentication pages preserve accessible controls.

## Delivered

- Four editable starting palettes: Forest, Midnight, Plum, and Sunrise.
- Live WCAG contrast reporting for primary buttons, card text, page text, and focus indicators.
- WCAG AA `4.5:1` server-side validation for normal text against card and page backgrounds.
- Automatic black-or-white primary-button text chosen by measured contrast.
- Automatic accessible focus-color fallback when the preferred brand color is below the WCAG `3:1` non-text threshold.
- Strict six-digit color tokens; arbitrary CSS remains impossible in configuration.
- Hardened logo URLs: same-origin relative paths or HTTPS only, with credentials, protocol-relative paths, backslashes, and control characters rejected.
- Explicit logo dimensions to prevent layout shift, meaningful alt text, and `no-referrer` protection for remote assets.
- Responsive spacing, typography, radius, and field-arrangement controls remain configuration-driven.

## Accessibility boundary

The builder reports all relevant ratios immediately. Low text contrast cannot be saved because the server parses the complete configuration with the same Zod schema used by the renderer and export layers. Primary button and focus colors adapt at render time, so light brand colors remain usable without forcing owners to calculate a companion foreground color.

Contrast calculations implement the WCAG relative-luminance formula and are covered independently from React rendering. The generated interface retains semantic labels, visible keyboard focus, accessible error associations, and responsive layouts.

## Logo policy

Logo URLs are rendered as ordinary images rather than injected markup. AuthFlow does not proxy or transform tenant assets in the MVP. Production owners should host logos on a trusted HTTPS origin with appropriate content types, caching, and CSP allowances. SVG markup is never accepted inline as configuration.

## Testing

Automated coverage verifies WCAG ratios, adaptive foreground colors, focus fallback, unsafe logo rejection, inaccessible-theme rejection, and renderer CSS variables. The repository quality gate continues to run Prisma validation, strict lint, TypeScript, Vitest, and a production build.
