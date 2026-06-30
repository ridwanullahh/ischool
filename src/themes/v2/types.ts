/**
 * Theme System v2 — Type Definitions
 *
 * A theme is a self-contained presentation layer with FULL autonomy over
 * layout, header, footer, hero, chatbot design, typography, color, motion,
 * and component styling. Themes share a common data contract (the `school`
 * prop + CMS helpers) but nothing about their visual structure.
 *
 * This file is the canonical contract between the CMS core and every theme.
 */

/**
 * The visual archetype of a theme — drives the fundamental layout philosophy.
 * Two themes with the same archetype share a layout family but differ in
 * color, typography, density, and micro-design decisions.
 */
export type ThemeArchetype =
  | 'glassmorphism'
  | 'classic-academic'
  | 'playful-rounded'
  | 'ultra-minimal'
  | 'luxury-dark'
  | 'bold-energetic'
  | 'gradient-mesh'
  | 'zen-minimal'
  | 'editorial-magazine'
  | 'collegiate-bold'
  | 'warm-earth'
  | 'geometric-sharp'
  | 'corporate-clean'
  | 'nature-fresh'
  | 'futuristic-tech'
  | 'cultural-vibrant'
  | 'elegant-luxury'
  | 'vibrant-gradient'
  | 'sharp-minimal'
  | 'flowing-organic'
  | 'neon-tech'
  | 'split-screen'
  | 'heraldic-traditional'
  | 'networked-modern'
  | 'cartographic'
  | 'mobile-native';

export type ThemeCategory = 'conventional' | 'mobile';

export type ThemeDefaultMode = 'light' | 'dark';

/**
 * Static metadata about a theme. Declared in each theme's theme.config.ts.
 * Consumed by the admin theme selector and the registry.
 */
export interface ThemeConfig {
  /** Machine name — must match the directory name. */
  name: string;
  /** Human-readable display name. */
  label: string;
  /** One-line description for the admin selector. */
  description: string;
  /** Layout archetype. */
  archetype: ThemeArchetype;
  /** conventional (desktop-first) or mobile (app-like). */
  category: ThemeCategory;
  /** Default light/dark mode on first visit. */
  defaultMode: ThemeDefaultMode;
  /** Primary typography (Google Fonts family name). */
  typography: string;
  /** Accent/secondary typography, if any. */
  accentTypography?: string;
  /** SVG path data for the theme icon in the admin selector (24x24 viewBox). */
  iconPath: string;
  /** Default primary color for previews (hex). */
  defaultPrimaryColor: string;
  /** Whether the theme ships its own chat widget design. */
  hasCustomChatWidget: boolean;
  /** Tags for filtering/searching in the admin selector. */
  tags: string[];
}

/**
 * A registered theme = its config + its Layout component.
 * The Layout MUST accept { school, title } and render a complete HTML
 * document with a <slot /> for page content.
 */
export interface RegisteredTheme {
  config: ThemeConfig;
  /** The Astro Layout component. */
  Layout: any;
  /** Optional theme-specific chat widget (falls back to default if absent). */
  ChatWidget?: any;
}

/**
 * Props every theme Layout MUST accept. This is the immutable contract
 * between the CMS core and every theme — breaking this breaks all pages.
 */
export interface ThemeLayoutProps {
  school: any;
  title?: string;
  /** Optional canonical URL for OG tags. */
  canonical?: string;
  /** Optional og:image URL. */
  ogImage?: string;
}
