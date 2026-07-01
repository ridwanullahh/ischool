/**
 * Theme System v3 — Central Registry
 *
 * Every v3 theme is registered here. The registry exposes:
 *   - getTheme(name)         -> RegisteredTheme | null
 *   - getThemeLayout(name)   -> Layout component (backward-compatible)
 *   - listThemes()            -> ThemeConfig[]
 *   - getThemePage(name, page) -> page template component
 *
 * Adding a new theme:
 *   1. Create src/themes/v3/{name}/ with theme.config.ts + Layout.astro
 *      + page templates (HomePage.astro, AboutPage.astro, etc.)
 *   2. Import + register it below
 */

import type { ThemeConfig, RegisteredTheme } from './types';

import auroraConfig from './aurora/theme.config';
import auroraLayout from './aurora/Layout.astro';
import auroraHomePage from './aurora/HomePage.astro';
import auroraAboutPage from './aurora/AboutPage.astro';
import auroraAdmissionsPage from './aurora/AdmissionsPage.astro';
import auroraProgramsPage from './aurora/ProgramsPage.astro';
import auroraProgramDetailPage from './aurora/ProgramDetailPage.astro';
import auroraClassesPage from './aurora/ClassesPage.astro';
import auroraBlogIndexPage from './aurora/BlogIndexPage.astro';
import auroraBlogPostPage from './aurora/BlogPostPage.astro';
import auroraAnnouncementsIndexPage from './aurora/AnnouncementsIndexPage.astro';
import auroraAnnouncementDetailPage from './aurora/AnnouncementDetailPage.astro';
import auroraGalleryPage from './aurora/GalleryPage.astro';
import auroraFaqsPage from './aurora/FaqsPage.astro';
import auroraContactPage from './aurora/ContactPage.astro';

import heritageConfig from './heritage/theme.config';
import heritageLayout from './heritage/Layout.astro';
import heritageHomePage from './heritage/HomePage.astro';
import heritageAboutPage from './heritage/AboutPage.astro';
import heritageAdmissionsPage from './heritage/AdmissionsPage.astro';
import heritageProgramsPage from './heritage/ProgramsPage.astro';
import heritageProgramDetailPage from './heritage/ProgramDetailPage.astro';
import heritageClassesPage from './heritage/ClassesPage.astro';
import heritageBlogIndexPage from './heritage/BlogIndexPage.astro';
import heritageBlogPostPage from './heritage/BlogPostPage.astro';
import heritageAnnouncementsIndexPage from './heritage/AnnouncementsIndexPage.astro';
import heritageAnnouncementDetailPage from './heritage/AnnouncementDetailPage.astro';
import heritageGalleryPage from './heritage/GalleryPage.astro';
import heritageFaqsPage from './heritage/FaqsPage.astro';
import heritageContactPage from './heritage/ContactPage.astro';

import pulseConfig from './pulse/theme.config';
import pulseLayout from './pulse/Layout.astro';
import pulseHomePage from './pulse/HomePage.astro';
import pulseAboutPage from './pulse/AboutPage.astro';
import pulseAdmissionsPage from './pulse/AdmissionsPage.astro';
import pulseProgramsPage from './pulse/ProgramsPage.astro';
import pulseProgramDetailPage from './pulse/ProgramDetailPage.astro';
import pulseClassesPage from './pulse/ClassesPage.astro';
import pulseBlogIndexPage from './pulse/BlogIndexPage.astro';
import pulseBlogPostPage from './pulse/BlogPostPage.astro';
import pulseAnnouncementsIndexPage from './pulse/AnnouncementsIndexPage.astro';
import pulseAnnouncementDetailPage from './pulse/AnnouncementDetailPage.astro';
import pulseGalleryPage from './pulse/GalleryPage.astro';
import pulseFaqsPage from './pulse/FaqsPage.astro';
import pulseContactPage from './pulse/ContactPage.astro';

import bloomConfig from './bloom/theme.config';
import bloomLayout from './bloom/Layout.astro';
import bloomHomePage from './bloom/HomePage.astro';
import bloomAboutPage from './bloom/AboutPage.astro';
import bloomAdmissionsPage from './bloom/AdmissionsPage.astro';
import bloomProgramsPage from './bloom/ProgramsPage.astro';
import bloomProgramDetailPage from './bloom/ProgramDetailPage.astro';
import bloomClassesPage from './bloom/ClassesPage.astro';
import bloomBlogIndexPage from './bloom/BlogIndexPage.astro';
import bloomBlogPostPage from './bloom/BlogPostPage.astro';
import bloomAnnouncementsIndexPage from './bloom/AnnouncementsIndexPage.astro';
import bloomAnnouncementDetailPage from './bloom/AnnouncementDetailPage.astro';
import bloomGalleryPage from './bloom/GalleryPage.astro';
import bloomFaqsPage from './bloom/FaqsPage.astro';
import bloomContactPage from './bloom/ContactPage.astro';

import apexConfig from './apex/theme.config';
import apexLayout from './apex/Layout.astro';
import apexHomePage from './apex/HomePage.astro';
import apexAboutPage from './apex/AboutPage.astro';
import apexAdmissionsPage from './apex/AdmissionsPage.astro';
import apexProgramsPage from './apex/ProgramsPage.astro';
import apexProgramDetailPage from './apex/ProgramDetailPage.astro';
import apexClassesPage from './apex/ClassesPage.astro';
import apexBlogIndexPage from './apex/BlogIndexPage.astro';
import apexBlogPostPage from './apex/BlogPostPage.astro';
import apexAnnouncementsIndexPage from './apex/AnnouncementsIndexPage.astro';
import apexAnnouncementDetailPage from './apex/AnnouncementDetailPage.astro';
import apexGalleryPage from './apex/GalleryPage.astro';
import apexFaqsPage from './apex/FaqsPage.astro';
import apexContactPage from './apex/ContactPage.astro';

const registry: Record<string, RegisteredTheme> = {
  aurora: {
    config: auroraConfig,
    Layout: auroraLayout,
    HomePage: auroraHomePage,
    AboutPage: auroraAboutPage,
    AdmissionsPage: auroraAdmissionsPage,
    ProgramsPage: auroraProgramsPage,
    ProgramDetailPage: auroraProgramDetailPage,
    ClassesPage: auroraClassesPage,
    BlogIndexPage: auroraBlogIndexPage,
    BlogPostPage: auroraBlogPostPage,
    AnnouncementsIndexPage: auroraAnnouncementsIndexPage,
    AnnouncementDetailPage: auroraAnnouncementDetailPage,
    GalleryPage: auroraGalleryPage,
    FaqsPage: auroraFaqsPage,
    ContactPage: auroraContactPage,
  },
  heritage: {
    config: heritageConfig,
    Layout: heritageLayout,
    HomePage: heritageHomePage,
    AboutPage: heritageAboutPage,
    AdmissionsPage: heritageAdmissionsPage,
    ProgramsPage: heritageProgramsPage,
    ProgramDetailPage: heritageProgramDetailPage,
    ClassesPage: heritageClassesPage,
    BlogIndexPage: heritageBlogIndexPage,
    BlogPostPage: heritageBlogPostPage,
    AnnouncementsIndexPage: heritageAnnouncementsIndexPage,
    AnnouncementDetailPage: heritageAnnouncementDetailPage,
    GalleryPage: heritageGalleryPage,
    FaqsPage: heritageFaqsPage,
    ContactPage: heritageContactPage,
  },
  pulse: {
    config: pulseConfig,
    Layout: pulseLayout,
    HomePage: pulseHomePage,
    AboutPage: pulseAboutPage,
    AdmissionsPage: pulseAdmissionsPage,
    ProgramsPage: pulseProgramsPage,
    ProgramDetailPage: pulseProgramDetailPage,
    ClassesPage: pulseClassesPage,
    BlogIndexPage: pulseBlogIndexPage,
    BlogPostPage: pulseBlogPostPage,
    AnnouncementsIndexPage: pulseAnnouncementsIndexPage,
    AnnouncementDetailPage: pulseAnnouncementDetailPage,
    GalleryPage: pulseGalleryPage,
    FaqsPage: pulseFaqsPage,
    ContactPage: pulseContactPage,
  },
  bloom: {
    config: bloomConfig,
    Layout: bloomLayout,
    HomePage: bloomHomePage,
    AboutPage: bloomAboutPage,
    AdmissionsPage: bloomAdmissionsPage,
    ProgramsPage: bloomProgramsPage,
    ProgramDetailPage: bloomProgramDetailPage,
    ClassesPage: bloomClassesPage,
    BlogIndexPage: bloomBlogIndexPage,
    BlogPostPage: bloomBlogPostPage,
    AnnouncementsIndexPage: bloomAnnouncementsIndexPage,
    AnnouncementDetailPage: bloomAnnouncementDetailPage,
    GalleryPage: bloomGalleryPage,
    FaqsPage: bloomFaqsPage,
    ContactPage: bloomContactPage,
  },
  apex: {
    config: apexConfig,
    Layout: apexLayout,
    HomePage: apexHomePage,
    AboutPage: apexAboutPage,
    AdmissionsPage: apexAdmissionsPage,
    ProgramsPage: apexProgramsPage,
    ProgramDetailPage: apexProgramDetailPage,
    ClassesPage: apexClassesPage,
    BlogIndexPage: apexBlogIndexPage,
    BlogPostPage: apexBlogPostPage,
    AnnouncementsIndexPage: apexAnnouncementsIndexPage,
    AnnouncementDetailPage: apexAnnouncementDetailPage,
    GalleryPage: apexGalleryPage,
    FaqsPage: apexFaqsPage,
    ContactPage: apexContactPage,
  },
};

export function getTheme(name: string): RegisteredTheme | null {
  return registry[name] ?? null;
}

export function getThemeLayout(name: string): any {
  return registry[name]?.Layout ?? registry['aurora']?.Layout ?? null;
}

export function getThemePage(name: string, page: string): any {
  const theme = registry[name];
  if (!theme) return null;
  const pageKey = page.charAt(0).toUpperCase() + page.slice(1) + 'Page' as keyof RegisteredTheme;
  return (theme as any)[pageKey] ?? null;
}

export function listThemes(): ThemeConfig[] {
  return Object.values(registry).map(t => t.config);
}

export const themeList: string[] = Object.keys(registry);
