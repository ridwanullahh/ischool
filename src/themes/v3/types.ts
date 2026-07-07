/**
 * Theme System v3 — Full WordPress-like Theme Architecture
 *
 * Each theme is a self-contained folder with FULL autonomy over:
 * - Layout (HTML shell, header, footer, chat widget, background)
 * - Every CMS page type (home, about, admissions, programs, blog, etc.)
 * - Every visual element (hero, cards, sections, navigation)
 * - Custom CSS, animations, and functionality
 *
 * Themes share a common data contract (school + CMS data) but nothing
 * about their visual structure. Theme A's homepage is completely
 * different from Theme B's — different layout, different elements,
 * different placement, different CSS.
 */

export interface ThemeConfig {
  name: string;
  label: string;
  description: string;
  category: 'conventional' | 'mobile';
  defaultMode: 'light' | 'dark';
  typography: string;
  accentTypography?: string;
  iconPath: string;
  defaultPrimaryColor: string;
  tags: string[];
  /**
   * Whether the theme is fully implemented with all page templates
   * (Layout + HomePage + 13 page templates all distinct) or is a
   * stub/clone that will be implemented in a future release.
   * - 'ready': Fully fledged, ready for production use
   * - 'coming_soon': Stub/clone, not yet fully implemented
   */
  status?: 'ready' | 'coming_soon';
}

/**
 * Props every theme page template receives.
 * The CMS core fetches this data and passes it to the theme.
 */
export interface ThemePageProps {
  school: any;
  // Homepage data
  about?: any;
  features?: Array<{ title: string; description: string }>;
  stats?: Array<{ label: string; value: string }>;
  recentAnnouncements?: any[];
  recentPosts?: any[];
  schoolPrograms?: any[];
  // List page data
  items?: any[];
  // Detail page data
  item?: any;
  // Generic
  [key: string]: any;
}

export interface RegisteredTheme {
  config: ThemeConfig;
  Layout: any;
  HomePage?: any;
  AboutPage?: any;
  AdmissionsPage?: any;
  ProgramsPage?: any;
  ProgramDetailPage?: any;
  ClassesPage?: any;
  ClassDetailPage?: any;
  BlogIndexPage?: any;
  BlogPostPage?: any;
  AnnouncementsIndexPage?: any;
  AnnouncementDetailPage?: any;
  GalleryPage?: any;
  FaqsPage?: any;
  ContactPage?: any;
  SupportPage?: any;
}
