/**
 * Predefined Color Palette Library
 *
 * Curated palette combinations based on popular brand primary colors.
 * Each preset includes a full 12-color palette (primary, accent, backgrounds,
 * surfaces, text, muted, borders for both light and dark modes) that has been
 * tested for WCAG AA contrast.
 *
 * Schools can pick a preset as a starting point, then customize individual
 * colors as needed.
 */

import type { Palette } from './palette.js';

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  primary: string;
  palette: Palette;
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'blue-ocean',
    name: 'Ocean Blue',
    description: 'Professional blue with clean whites — perfect for academic institutions',
    primary: '#2563eb',
    palette: {
      primary: '#2563eb', accent: '#0ea5e9',
      backgroundLight: '#f8fafc', backgroundDark: '#0f172a',
      surfaceLight: '#ffffff', surfaceDark: '#1e293b',
      textLight: '#0f172a', textDark: '#f1f5f9',
      mutedLight: '#64748b', mutedDark: '#94a3b8',
      borderLight: '#e2e8f0', borderDark: '#334155',
    },
  },
  {
    id: 'emerald-grove',
    name: 'Emerald Grove',
    description: 'Fresh green with natural tones — ideal for nature-focused schools',
    primary: '#10b981',
    palette: {
      primary: '#10b981', accent: '#14b8a6',
      backgroundLight: '#f0fdf4', backgroundDark: '#0a1f14',
      surfaceLight: '#ffffff', surfaceDark: '#0f2e1e',
      textLight: '#064e3b', textDark: '#d1fae5',
      mutedLight: '#6b7280', mutedDark: '#9ca3af',
      borderLight: '#d1fae5', borderDark: '#1f4d35',
    },
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    description: 'Elegant purple with sophisticated neutrals — for premium institutions',
    primary: '#7c3aed',
    palette: {
      primary: '#7c3aed', accent: '#a855f7',
      backgroundLight: '#faf5ff', backgroundDark: '#130a1f',
      surfaceLight: '#ffffff', surfaceDark: '#1e1130',
      textLight: '#2e1065', textDark: '#e9d5ff',
      mutedLight: '#6b7280', mutedDark: '#9ca3af',
      borderLight: '#e9d5ff', borderDark: '#3b1d5e',
    },
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    description: 'Warm orange with earthy accents — welcoming and energetic',
    primary: '#ea580c',
    palette: {
      primary: '#ea580c', accent: '#f59e0b',
      backgroundLight: '#fff7ed', backgroundDark: '#1a0e05',
      surfaceLight: '#ffffff', surfaceDark: '#2a180a',
      textLight: '#431407', textDark: '#fed7aa',
      mutedLight: '#78716c', mutedDark: '#a8a29e',
      borderLight: '#fed7aa', borderDark: '#5c3815',
    },
  },
  {
    id: 'crimson-classic',
    name: 'Crimson Classic',
    description: 'Deep red with traditional tones — for prestigious heritage schools',
    primary: '#dc2626',
    palette: {
      primary: '#dc2626', accent: '#f43f5e',
      backgroundLight: '#fef2f2', backgroundDark: '#1a0505',
      surfaceLight: '#ffffff', surfaceDark: '#2a0a0a',
      textLight: '#450a0a', textDark: '#fecaca',
      mutedLight: '#6b7280', mutedDark: '#9ca3af',
      borderLight: '#fecaca', borderDark: '#5c1515',
    },
  },
  {
    id: 'teal-modern',
    name: 'Teal Modern',
    description: 'Sophisticated teal with cool grays — contemporary and clean',
    primary: '#0d9488',
    palette: {
      primary: '#0d9488', accent: '#06b6d4',
      backgroundLight: '#f0fdfa', backgroundDark: '#04201d',
      surfaceLight: '#ffffff', surfaceDark: '#0a2e2a',
      textLight: '#042f2e', textDark: '#ccfbf1',
      mutedLight: '#6b7280', mutedDark: '#9ca3af',
      borderLight: '#ccfbf1', borderDark: '#155e54',
    },
  },
  {
    id: 'indigo-deep',
    name: 'Indigo Deep',
    description: 'Deep indigo with rich accents — for academic excellence',
    primary: '#4f46e5',
    palette: {
      primary: '#4f46e5', accent: '#6366f1',
      backgroundLight: '#eef2ff', backgroundDark: '#0f0a2e',
      surfaceLight: '#ffffff', surfaceDark: '#1a1340',
      textLight: '#1e1b4b', textDark: '#c7d2fe',
      mutedLight: '#6b7280', mutedDark: '#9ca3af',
      borderLight: '#c7d2fe', borderDark: '#312e81',
    },
  },
  {
    id: 'gold-luxury',
    name: 'Gold Luxury',
    description: 'Rich gold with dark backgrounds — for premium and exclusive schools',
    primary: '#d4af37',
    palette: {
      primary: '#d4af37', accent: '#eab308',
      backgroundLight: '#fefce8', backgroundDark: '#1a1505',
      surfaceLight: '#ffffff', surfaceDark: '#2a2008',
      textLight: '#422006', textDark: '#fef3c7',
      mutedLight: '#78716c', mutedDark: '#a8a29e',
      borderLight: '#fef3c7', borderDark: '#5c4515',
    },
  },
  {
    id: 'rose-bloom',
    name: 'Rose Bloom',
    description: 'Soft rose with warm neutrals — friendly and approachable',
    primary: '#e11d48',
    palette: {
      primary: '#e11d48', accent: '#f43f5e',
      backgroundLight: '#fff1f2', backgroundDark: '#1a050a',
      surfaceLight: '#ffffff', surfaceDark: '#2a0a12',
      textLight: '#4c0519', textDark: '#fecdd3',
      mutedLight: '#6b7280', mutedDark: '#9ca3af',
      borderLight: '#fecdd3', borderDark: '#5c1525',
    },
  },
  {
    id: 'slate-corporate',
    name: 'Slate Corporate',
    description: 'Professional slate with neutral tones — for corporate-style institutions',
    primary: '#475569',
    palette: {
      primary: '#475569', accent: '#64748b',
      backgroundLight: '#f8fafc', backgroundDark: '#0f172a',
      surfaceLight: '#ffffff', surfaceDark: '#1e293b',
      textLight: '#0f172a', textDark: '#f1f5f9',
      mutedLight: '#64748b', mutedDark: '#94a3b8',
      borderLight: '#e2e8f0', borderDark: '#334155',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Deep forest green with earthy warmth — for environmental schools',
    primary: '#15803d',
    palette: {
      primary: '#15803d', accent: '#16a34a',
      backgroundLight: '#f0fdf4', backgroundDark: '#051a0a',
      surfaceLight: '#ffffff', surfaceDark: '#0a2e15',
      textLight: '#052e16', textDark: '#bbf7d0',
      mutedLight: '#6b7280', mutedDark: '#9ca3af',
      borderLight: '#bbf7d0', borderDark: '#1a4d2a',
    },
  },
  {
    id: 'midnight-tech',
    name: 'Midnight Tech',
    description: 'Dark navy with cyan accents — for STEM and tech-focused schools',
    primary: '#06b6d4',
    palette: {
      primary: '#06b6d4', accent: '#0891b2',
      backgroundLight: '#ecfeff', backgroundDark: '#021014',
      surfaceLight: '#ffffff', surfaceDark: '#0a1e25',
      textLight: '#083344', textDark: '#cffafe',
      mutedLight: '#6b7280', mutedDark: '#9ca3af',
      borderLight: '#cffafe', borderDark: '#155e63',
    },
  },
];

/**
 * Returns a palette preset by ID.
 */
export function getPreset(id: string): PalettePreset | null {
  return PALETTE_PRESETS.find(p => p.id === id) ?? null;
}

/**
 * Returns a palette preset that best matches a given primary color.
 */
export function findPresetByPrimary(primary: string): PalettePreset | null {
  return PALETTE_PRESETS.find(p => p.primary.toLowerCase() === primary.toLowerCase()) ?? null;
}
