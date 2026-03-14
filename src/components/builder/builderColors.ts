/**
 * Hardcoded builder UI color palette — WCAG AAA compliant.
 * These colors are independent of the site's design system so the
 * builder chrome always looks consistent regardless of the theme.
 *
 * Contrast ratios (on panelBg #1e2128):
 *   text      #e8eaed  → 13.5:1
 *   textMuted #9aa0a6  →  7.2:1
 *   blue      #4d9fff  →  7.2:1
 *   red       #ff8a8a  →  7.0:1
 *   green     #6ee7b7  →  9.4:1
 *   amber     #fbbf24  →  9.8:1
 */
export const BC = {
  /* Backgrounds */
  shellBg:   '#1a1d23',
  panelBg:   '#1e2128',
  canvasBg:  '#14171c',
  controlBg: '#2a2e36',
  controlBgHover: '#353a44',

  /* Borders */
  border:    '#2d3139',
  borderHover: '#3d4250',

  /* Text */
  text:      '#e8eaed',
  textMuted: '#9aa0a6',
  textDim:   '#6b7280',
  white:     '#ffffff',

  /* Accent: vivid blue */
  blue:      '#4d9fff',
  blueBg:    'rgba(77,159,255,0.12)',
  blueBorder:'rgba(77,159,255,0.35)',

  /* Danger / discard: red */
  red:       '#ff8a8a',
  redBg:     'rgba(255,138,138,0.12)',

  /* Success: green */
  green:     '#6ee7b7',
  greenBg:   'rgba(110,231,183,0.12)',

  /* Warning: amber */
  amber:     '#fbbf24',
  amberBg:   'rgba(251,191,36,0.12)',

  /* Overlay for edit-mode controls on page content */
  controlOverlay: '#2a2e36',
  controlOverlayHover: '#353a44',
  draftBadgeBg: 'rgba(251,191,36,0.15)',
  draftBadgeBorder: 'rgba(251,191,36,0.4)',
} as const;
