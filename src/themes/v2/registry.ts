/**
 * Theme System v2 — Central Registry
 *
 * Every v2 theme is registered here. The registry exposes:
 *   - getTheme(name)        -> RegisteredTheme | null
 *   - getThemeLayout(name)  -> Layout component (backward-compatible with v1)
 *   - listThemes(category?) -> ThemeConfig[]
 *   - getThemeConfig(name)  -> ThemeConfig | null
 *
 * Adding a new theme:
 *   1. Create src/themes/v2/{conventional|mobile}/{name}/theme.config.ts
 *   2. Create src/themes/v2/{conventional|mobile}/{name}/Layout.astro
 *   3. (Optional) Create ChatWidget.astro for a theme-specific chatbot
 *   4. Import + register it below
 *
 * The v1 fallback (legacy single-file themes in src/themes/{name}/) is
 * kept as a last-resort default so no school ever renders a blank page
 * during the migration. Once all schools are on v2 themes, the v1
 * fallback will be removed.
 */

import type { ThemeConfig, RegisteredTheme, ThemeCategory } from './types';

// --- v2 theme imports (conventional) ---
import harmonyConfig from './conventional/harmony/theme.config';
import harmonyLayout from './conventional/harmony/Layout.astro';

import scholarConfig from './conventional/scholar/theme.config';
import scholarLayout from './conventional/scholar/Layout.astro';

import apexConfig from './conventional/apex/theme.config';
import apexLayout from './conventional/apex/Layout.astro';

import bloomConfig from './conventional/bloom/theme.config';
import bloomLayout from './conventional/bloom/Layout.astro';

import horizonConfig from './conventional/horizon/theme.config';
import horizonLayout from './conventional/horizon/Layout.astro';

import prestigeConfig from './conventional/prestige/theme.config';
import prestigeLayout from './conventional/prestige/Layout.astro';

import novaConfig from './conventional/nova/theme.config';
import novaLayout from './conventional/nova/Layout.astro';

import emberConfig from './conventional/ember/theme.config';
import emberLayout from './conventional/ember/Layout.astro';

// --- v2 theme imports (mobile) ---

// --- v1 fallback (legacy) ---
import LegacyHarmonyLayout from '../harmony/Layout.astro';

// --- Registry ---
const registry: Record<string, RegisteredTheme> = {
  // conventional
  harmony: { config: harmonyConfig, Layout: harmonyLayout },
  scholar: { config: scholarConfig, Layout: scholarLayout },
  apex: { config: apexConfig, Layout: apexLayout },
  bloom: { config: bloomConfig, Layout: bloomLayout },
  horizon: { config: horizonConfig, Layout: horizonLayout },
  prestige: { config: prestigeConfig, Layout: prestigeLayout },
  nova: { config: novaConfig, Layout: novaLayout },
  ember: { config: emberConfig, Layout: emberLayout },
};

/**
 * Returns the full registered theme (config + Layout + optional ChatWidget),
 * or null if not found.
 */
export function getTheme(name: string): RegisteredTheme | null {
  return registry[name] ?? null;
}

/**
 * Returns the theme config, or null if not found.
 */
export function getThemeConfig(name: string): ThemeConfig | null {
  return registry[name]?.config ?? null;
}

/**
 * Returns the Layout component for a theme. Falls back to v1 legacy
 * themes, then to the v1 harmony theme as a last resort — never returns
 * null so pages never crash on an unknown theme name.
 */
export function getThemeLayout(name: string): any {
  const v2 = registry[name];
  if (v2) return v2.Layout;
  // v1 fallback: try the legacy single-file theme
  return LegacyHarmonyLayout;
}

/**
 * Lists all registered v2 themes, optionally filtered by category.
 * Used by the admin theme selector.
 */
export function listThemes(category?: ThemeCategory): ThemeConfig[] {
  const all = Object.values(registry).map(t => t.config);
  if (category) return all.filter(c => c.category === category);
  return all;
}

/**
 * Lists theme names (for backward compatibility with v1 `themeList`).
 */
export const themeList: string[] = Object.keys(registry);
