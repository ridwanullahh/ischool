export type Palette = {
  primary: string;
  accent: string;
  backgroundLight: string;
  backgroundDark: string;
  surfaceLight: string;
  surfaceDark: string;
  textLight: string;
  textDark: string;
  mutedLight: string;
  mutedDark: string;
  borderLight: string;
  borderDark: string;
};

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ensureContrast(fg: string, bg: string, minRatio = 4.5): string {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  const [h, s, l] = hexToHsl(fg);
  const bgLum = relativeLuminance(bg);
  const shouldLighten = bgLum < 0.5;
  for (let step = 1; step <= 100; step++) {
    const newL = shouldLighten ? Math.min(100, l + step) : Math.max(0, l - step);
    const candidate = hslToHex(h, s, newL);
    if (contrastRatio(candidate, bg) >= minRatio) return candidate;
  }
  return shouldLighten ? '#ffffff' : '#000000';
}

export function generateDefaultPalette(primaryColor: string): Palette {
  const [h, s] = hexToHsl(primaryColor);
  const accentH = (h + 30) % 360;
  return {
    primary: primaryColor,
    accent: hslToHex(accentH, Math.min(s + 10, 100), 55),
    backgroundLight: hslToHex(h, Math.max(s - 80, 5), 98),
    backgroundDark: hslToHex(h, Math.min(s, 20), 8),
    surfaceLight: '#ffffff',
    surfaceDark: hslToHex(h, Math.min(s, 15), 14),
    textLight: hslToHex(h, Math.max(s - 70, 5), 15),
    textDark: hslToHex(h, Math.max(s - 80, 5), 92),
    mutedLight: hslToHex(h, Math.max(s - 80, 5), 50),
    mutedDark: hslToHex(h, Math.max(s - 70, 5), 60),
    borderLight: hslToHex(h, Math.max(s - 80, 5), 88),
    borderDark: hslToHex(h, Math.min(s, 15), 22),
  };
}

export function mergePalette(stored: Partial<Palette> | null | undefined, primary: string): Palette {
  const defaults = generateDefaultPalette(primary);
  if (!stored || typeof stored !== 'object') return defaults;
  return {
    primary: stored.primary || defaults.primary,
    accent: stored.accent || defaults.accent,
    backgroundLight: stored.backgroundLight || defaults.backgroundLight,
    backgroundDark: stored.backgroundDark || defaults.backgroundDark,
    surfaceLight: stored.surfaceLight || defaults.surfaceLight,
    surfaceDark: stored.surfaceDark || defaults.surfaceDark,
    textLight: stored.textLight || defaults.textLight,
    textDark: stored.textDark || defaults.textDark,
    mutedLight: stored.mutedLight || defaults.mutedLight,
    mutedDark: stored.mutedDark || defaults.mutedDark,
    borderLight: stored.borderLight || defaults.borderLight,
    borderDark: stored.borderDark || defaults.borderDark,
  };
}
