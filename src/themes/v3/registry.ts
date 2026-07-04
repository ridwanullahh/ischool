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

// --- 5 additional premium themes ---
import luminaConfig from './lumina/theme.config';
import luminaLayout from './lumina/Layout.astro';
import luminaHomePage from './lumina/HomePage.astro';
import luminaAboutPage from './lumina/AboutPage.astro';
import luminaAdmissionsPage from './lumina/AdmissionsPage.astro';
import luminaProgramsPage from './lumina/ProgramsPage.astro';
import luminaProgramDetailPage from './lumina/ProgramDetailPage.astro';
import luminaClassesPage from './lumina/ClassesPage.astro';
import luminaBlogIndexPage from './lumina/BlogIndexPage.astro';
import luminaBlogPostPage from './lumina/BlogPostPage.astro';
import luminaAnnouncementsIndexPage from './lumina/AnnouncementsIndexPage.astro';
import luminaAnnouncementDetailPage from './lumina/AnnouncementDetailPage.astro';
import luminaGalleryPage from './lumina/GalleryPage.astro';
import luminaFaqsPage from './lumina/FaqsPage.astro';
import luminaContactPage from './lumina/ContactPage.astro';

import crestConfig from './crest/theme.config';
import crestLayout from './crest/Layout.astro';
import crestHomePage from './crest/HomePage.astro';
import crestAboutPage from './crest/AboutPage.astro';
import crestAdmissionsPage from './crest/AdmissionsPage.astro';
import crestProgramsPage from './crest/ProgramsPage.astro';
import crestProgramDetailPage from './crest/ProgramDetailPage.astro';
import crestClassesPage from './crest/ClassesPage.astro';
import crestBlogIndexPage from './crest/BlogIndexPage.astro';
import crestBlogPostPage from './crest/BlogPostPage.astro';
import crestAnnouncementsIndexPage from './crest/AnnouncementsIndexPage.astro';
import crestAnnouncementDetailPage from './crest/AnnouncementDetailPage.astro';
import crestGalleryPage from './crest/GalleryPage.astro';
import crestFaqsPage from './crest/FaqsPage.astro';
import crestContactPage from './crest/ContactPage.astro';

import nexusConfig from './nexus/theme.config';
import nexusLayout from './nexus/Layout.astro';
import nexusHomePage from './nexus/HomePage.astro';
import nexusAboutPage from './nexus/AboutPage.astro';
import nexusAdmissionsPage from './nexus/AdmissionsPage.astro';
import nexusProgramsPage from './nexus/ProgramsPage.astro';
import nexusProgramDetailPage from './nexus/ProgramDetailPage.astro';
import nexusClassesPage from './nexus/ClassesPage.astro';
import nexusBlogIndexPage from './nexus/BlogIndexPage.astro';
import nexusBlogPostPage from './nexus/BlogPostPage.astro';
import nexusAnnouncementsIndexPage from './nexus/AnnouncementsIndexPage.astro';
import nexusAnnouncementDetailPage from './nexus/AnnouncementDetailPage.astro';
import nexusGalleryPage from './nexus/GalleryPage.astro';
import nexusFaqsPage from './nexus/FaqsPage.astro';
import nexusContactPage from './nexus/ContactPage.astro';

import marbleConfig from './marble/theme.config';
import marbleLayout from './marble/Layout.astro';
import marbleHomePage from './marble/HomePage.astro';
import marbleAboutPage from './marble/AboutPage.astro';
import marbleAdmissionsPage from './marble/AdmissionsPage.astro';
import marbleProgramsPage from './marble/ProgramsPage.astro';
import marbleProgramDetailPage from './marble/ProgramDetailPage.astro';
import marbleClassesPage from './marble/ClassesPage.astro';
import marbleBlogIndexPage from './marble/BlogIndexPage.astro';
import marbleBlogPostPage from './marble/BlogPostPage.astro';
import marbleAnnouncementsIndexPage from './marble/AnnouncementsIndexPage.astro';
import marbleAnnouncementDetailPage from './marble/AnnouncementDetailPage.astro';
import marbleGalleryPage from './marble/GalleryPage.astro';
import marbleFaqsPage from './marble/FaqsPage.astro';
import marbleContactPage from './marble/ContactPage.astro';

import vividConfig from './vivid/theme.config';
import vividLayout from './vivid/Layout.astro';
import vividHomePage from './vivid/HomePage.astro';
import vividAboutPage from './vivid/AboutPage.astro';
import vividAdmissionsPage from './vivid/AdmissionsPage.astro';
import vividProgramsPage from './vivid/ProgramsPage.astro';
import vividProgramDetailPage from './vivid/ProgramDetailPage.astro';
import vividClassesPage from './vivid/ClassesPage.astro';
import vividBlogIndexPage from './vivid/BlogIndexPage.astro';
import vividBlogPostPage from './vivid/BlogPostPage.astro';
import vividAnnouncementsIndexPage from './vivid/AnnouncementsIndexPage.astro';
import vividAnnouncementDetailPage from './vivid/AnnouncementDetailPage.astro';
import vividGalleryPage from './vivid/GalleryPage.astro';
import vividFaqsPage from './vivid/FaqsPage.astro';
import vividContactPage from './vivid/ContactPage.astro';

// --- 10 additional premium themes ---
import sapphireConfig from './sapphire/theme.config';
import sapphireLayout from './sapphire/Layout.astro';
import sapphireHomePage from './sapphire/HomePage.astro';
import sapphireAboutPage from './sapphire/AboutPage.astro';
import sapphireAdmissionsPage from './sapphire/AdmissionsPage.astro';
import sapphireProgramsPage from './sapphire/ProgramsPage.astro';
import sapphireProgramDetailPage from './sapphire/ProgramDetailPage.astro';
import sapphireClassesPage from './sapphire/ClassesPage.astro';
import sapphireBlogIndexPage from './sapphire/BlogIndexPage.astro';
import sapphireBlogPostPage from './sapphire/BlogPostPage.astro';
import sapphireAnnouncementsIndexPage from './sapphire/AnnouncementsIndexPage.astro';
import sapphireAnnouncementDetailPage from './sapphire/AnnouncementDetailPage.astro';
import sapphireGalleryPage from './sapphire/GalleryPage.astro';
import sapphireFaqsPage from './sapphire/FaqsPage.astro';
import sapphireContactPage from './sapphire/ContactPage.astro';

import driftConfig from './drift/theme.config';
import driftLayout from './drift/Layout.astro';
import driftHomePage from './drift/HomePage.astro';
import driftAboutPage from './drift/AboutPage.astro';
import driftAdmissionsPage from './drift/AdmissionsPage.astro';
import driftProgramsPage from './drift/ProgramsPage.astro';
import driftProgramDetailPage from './drift/ProgramDetailPage.astro';
import driftClassesPage from './drift/ClassesPage.astro';
import driftBlogIndexPage from './drift/BlogIndexPage.astro';
import driftBlogPostPage from './drift/BlogPostPage.astro';
import driftAnnouncementsIndexPage from './drift/AnnouncementsIndexPage.astro';
import driftAnnouncementDetailPage from './drift/AnnouncementDetailPage.astro';
import driftGalleryPage from './drift/GalleryPage.astro';
import driftFaqsPage from './drift/FaqsPage.astro';
import driftContactPage from './drift/ContactPage.astro';

import forgeConfig from './forge/theme.config';
import forgeLayout from './forge/Layout.astro';
import forgeHomePage from './forge/HomePage.astro';
import forgeAboutPage from './forge/AboutPage.astro';
import forgeAdmissionsPage from './forge/AdmissionsPage.astro';
import forgeProgramsPage from './forge/ProgramsPage.astro';
import forgeProgramDetailPage from './forge/ProgramDetailPage.astro';
import forgeClassesPage from './forge/ClassesPage.astro';
import forgeBlogIndexPage from './forge/BlogIndexPage.astro';
import forgeBlogPostPage from './forge/BlogPostPage.astro';
import forgeAnnouncementsIndexPage from './forge/AnnouncementsIndexPage.astro';
import forgeAnnouncementDetailPage from './forge/AnnouncementDetailPage.astro';
import forgeGalleryPage from './forge/GalleryPage.astro';
import forgeFaqsPage from './forge/FaqsPage.astro';
import forgeContactPage from './forge/ContactPage.astro';

import haloConfig from './halo/theme.config';
import haloLayout from './halo/Layout.astro';
import haloHomePage from './halo/HomePage.astro';
import haloAboutPage from './halo/AboutPage.astro';
import haloAdmissionsPage from './halo/AdmissionsPage.astro';
import haloProgramsPage from './halo/ProgramsPage.astro';
import haloProgramDetailPage from './halo/ProgramDetailPage.astro';
import haloClassesPage from './halo/ClassesPage.astro';
import haloBlogIndexPage from './halo/BlogIndexPage.astro';
import haloBlogPostPage from './halo/BlogPostPage.astro';
import haloAnnouncementsIndexPage from './halo/AnnouncementsIndexPage.astro';
import haloAnnouncementDetailPage from './halo/AnnouncementDetailPage.astro';
import haloGalleryPage from './halo/GalleryPage.astro';
import haloFaqsPage from './halo/FaqsPage.astro';
import haloContactPage from './halo/ContactPage.astro';

import meadowConfig from './meadow/theme.config';
import meadowLayout from './meadow/Layout.astro';
import meadowHomePage from './meadow/HomePage.astro';
import meadowAboutPage from './meadow/AboutPage.astro';
import meadowAdmissionsPage from './meadow/AdmissionsPage.astro';
import meadowProgramsPage from './meadow/ProgramsPage.astro';
import meadowProgramDetailPage from './meadow/ProgramDetailPage.astro';
import meadowClassesPage from './meadow/ClassesPage.astro';
import meadowBlogIndexPage from './meadow/BlogIndexPage.astro';
import meadowBlogPostPage from './meadow/BlogPostPage.astro';
import meadowAnnouncementsIndexPage from './meadow/AnnouncementsIndexPage.astro';
import meadowAnnouncementDetailPage from './meadow/AnnouncementDetailPage.astro';
import meadowGalleryPage from './meadow/GalleryPage.astro';
import meadowFaqsPage from './meadow/FaqsPage.astro';
import meadowContactPage from './meadow/ContactPage.astro';

import orbitConfig from './orbit/theme.config';
import orbitLayout from './orbit/Layout.astro';
import orbitHomePage from './orbit/HomePage.astro';
import orbitAboutPage from './orbit/AboutPage.astro';
import orbitAdmissionsPage from './orbit/AdmissionsPage.astro';
import orbitProgramsPage from './orbit/ProgramsPage.astro';
import orbitProgramDetailPage from './orbit/ProgramDetailPage.astro';
import orbitClassesPage from './orbit/ClassesPage.astro';
import orbitBlogIndexPage from './orbit/BlogIndexPage.astro';
import orbitBlogPostPage from './orbit/BlogPostPage.astro';
import orbitAnnouncementsIndexPage from './orbit/AnnouncementsIndexPage.astro';
import orbitAnnouncementDetailPage from './orbit/AnnouncementDetailPage.astro';
import orbitGalleryPage from './orbit/GalleryPage.astro';
import orbitFaqsPage from './orbit/FaqsPage.astro';
import orbitContactPage from './orbit/ContactPage.astro';

import prismConfig from './prism/theme.config';
import prismLayout from './prism/Layout.astro';
import prismHomePage from './prism/HomePage.astro';
import prismAboutPage from './prism/AboutPage.astro';
import prismAdmissionsPage from './prism/AdmissionsPage.astro';
import prismProgramsPage from './prism/ProgramsPage.astro';
import prismProgramDetailPage from './prism/ProgramDetailPage.astro';
import prismClassesPage from './prism/ClassesPage.astro';
import prismBlogIndexPage from './prism/BlogIndexPage.astro';
import prismBlogPostPage from './prism/BlogPostPage.astro';
import prismAnnouncementsIndexPage from './prism/AnnouncementsIndexPage.astro';
import prismAnnouncementDetailPage from './prism/AnnouncementDetailPage.astro';
import prismGalleryPage from './prism/GalleryPage.astro';
import prismFaqsPage from './prism/FaqsPage.astro';
import prismContactPage from './prism/ContactPage.astro';

import quartzConfig from './quartz/theme.config';
import quartzLayout from './quartz/Layout.astro';
import quartzHomePage from './quartz/HomePage.astro';
import quartzAboutPage from './quartz/AboutPage.astro';
import quartzAdmissionsPage from './quartz/AdmissionsPage.astro';
import quartzProgramsPage from './quartz/ProgramsPage.astro';
import quartzProgramDetailPage from './quartz/ProgramDetailPage.astro';
import quartzClassesPage from './quartz/ClassesPage.astro';
import quartzBlogIndexPage from './quartz/BlogIndexPage.astro';
import quartzBlogPostPage from './quartz/BlogPostPage.astro';
import quartzAnnouncementsIndexPage from './quartz/AnnouncementsIndexPage.astro';
import quartzAnnouncementDetailPage from './quartz/AnnouncementDetailPage.astro';
import quartzGalleryPage from './quartz/GalleryPage.astro';
import quartzFaqsPage from './quartz/FaqsPage.astro';
import quartzContactPage from './quartz/ContactPage.astro';

import summitConfig from './summit/theme.config';
import summitLayout from './summit/Layout.astro';
import summitHomePage from './summit/HomePage.astro';
import summitAboutPage from './summit/AboutPage.astro';
import summitAdmissionsPage from './summit/AdmissionsPage.astro';
import summitProgramsPage from './summit/ProgramsPage.astro';
import summitProgramDetailPage from './summit/ProgramDetailPage.astro';
import summitClassesPage from './summit/ClassesPage.astro';
import summitBlogIndexPage from './summit/BlogIndexPage.astro';
import summitBlogPostPage from './summit/BlogPostPage.astro';
import summitAnnouncementsIndexPage from './summit/AnnouncementsIndexPage.astro';
import summitAnnouncementDetailPage from './summit/AnnouncementDetailPage.astro';
import summitGalleryPage from './summit/GalleryPage.astro';
import summitFaqsPage from './summit/FaqsPage.astro';
import summitContactPage from './summit/ContactPage.astro';

import tideConfig from './tide/theme.config';
import tideLayout from './tide/Layout.astro';
import tideHomePage from './tide/HomePage.astro';
import tideAboutPage from './tide/AboutPage.astro';
import tideAdmissionsPage from './tide/AdmissionsPage.astro';
import tideProgramsPage from './tide/ProgramsPage.astro';
import tideProgramDetailPage from './tide/ProgramDetailPage.astro';
import tideClassesPage from './tide/ClassesPage.astro';
import tideBlogIndexPage from './tide/BlogIndexPage.astro';
import tideBlogPostPage from './tide/BlogPostPage.astro';
import tideAnnouncementsIndexPage from './tide/AnnouncementsIndexPage.astro';
import tideAnnouncementDetailPage from './tide/AnnouncementDetailPage.astro';
import tideGalleryPage from './tide/GalleryPage.astro';
import tideFaqsPage from './tide/FaqsPage.astro';
import tideContactPage from './tide/ContactPage.astro';

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
  lumina: { config: luminaConfig, Layout: luminaLayout, HomePage: luminaHomePage, AboutPage: luminaAboutPage, AdmissionsPage: luminaAdmissionsPage, ProgramsPage: luminaProgramsPage, ProgramDetailPage: luminaProgramDetailPage, ClassesPage: luminaClassesPage, BlogIndexPage: luminaBlogIndexPage, BlogPostPage: luminaBlogPostPage, AnnouncementsIndexPage: luminaAnnouncementsIndexPage, AnnouncementDetailPage: luminaAnnouncementDetailPage, GalleryPage: luminaGalleryPage, FaqsPage: luminaFaqsPage, ContactPage: luminaContactPage },
  crest: { config: crestConfig, Layout: crestLayout, HomePage: crestHomePage, AboutPage: crestAboutPage, AdmissionsPage: crestAdmissionsPage, ProgramsPage: crestProgramsPage, ProgramDetailPage: crestProgramDetailPage, ClassesPage: crestClassesPage, BlogIndexPage: crestBlogIndexPage, BlogPostPage: crestBlogPostPage, AnnouncementsIndexPage: crestAnnouncementsIndexPage, AnnouncementDetailPage: crestAnnouncementDetailPage, GalleryPage: crestGalleryPage, FaqsPage: crestFaqsPage, ContactPage: crestContactPage },
  nexus: { config: nexusConfig, Layout: nexusLayout, HomePage: nexusHomePage, AboutPage: nexusAboutPage, AdmissionsPage: nexusAdmissionsPage, ProgramsPage: nexusProgramsPage, ProgramDetailPage: nexusProgramDetailPage, ClassesPage: nexusClassesPage, BlogIndexPage: nexusBlogIndexPage, BlogPostPage: nexusBlogPostPage, AnnouncementsIndexPage: nexusAnnouncementsIndexPage, AnnouncementDetailPage: nexusAnnouncementDetailPage, GalleryPage: nexusGalleryPage, FaqsPage: nexusFaqsPage, ContactPage: nexusContactPage },
  marble: { config: marbleConfig, Layout: marbleLayout, HomePage: marbleHomePage, AboutPage: marbleAboutPage, AdmissionsPage: marbleAdmissionsPage, ProgramsPage: marbleProgramsPage, ProgramDetailPage: marbleProgramDetailPage, ClassesPage: marbleClassesPage, BlogIndexPage: marbleBlogIndexPage, BlogPostPage: marbleBlogPostPage, AnnouncementsIndexPage: marbleAnnouncementsIndexPage, AnnouncementDetailPage: marbleAnnouncementDetailPage, GalleryPage: marbleGalleryPage, FaqsPage: marbleFaqsPage, ContactPage: marbleContactPage },
  vivid: { config: vividConfig, Layout: vividLayout, HomePage: vividHomePage, AboutPage: vividAboutPage, AdmissionsPage: vividAdmissionsPage, ProgramsPage: vividProgramsPage, ProgramDetailPage: vividProgramDetailPage, ClassesPage: vividClassesPage, BlogIndexPage: vividBlogIndexPage, BlogPostPage: vividBlogPostPage, AnnouncementsIndexPage: vividAnnouncementsIndexPage, AnnouncementDetailPage: vividAnnouncementDetailPage, GalleryPage: vividGalleryPage, FaqsPage: vividFaqsPage, ContactPage: vividContactPage },
  sapphire: { config: sapphireConfig, Layout: sapphireLayout, HomePage: sapphireHomePage, AboutPage: sapphireAboutPage, AdmissionsPage: sapphireAdmissionsPage, ProgramsPage: sapphireProgramsPage, ProgramDetailPage: sapphireProgramDetailPage, ClassesPage: sapphireClassesPage, BlogIndexPage: sapphireBlogIndexPage, BlogPostPage: sapphireBlogPostPage, AnnouncementsIndexPage: sapphireAnnouncementsIndexPage, AnnouncementDetailPage: sapphireAnnouncementDetailPage, GalleryPage: sapphireGalleryPage, FaqsPage: sapphireFaqsPage, ContactPage: sapphireContactPage },
  drift: { config: driftConfig, Layout: driftLayout, HomePage: driftHomePage, AboutPage: driftAboutPage, AdmissionsPage: driftAdmissionsPage, ProgramsPage: driftProgramsPage, ProgramDetailPage: driftProgramDetailPage, ClassesPage: driftClassesPage, BlogIndexPage: driftBlogIndexPage, BlogPostPage: driftBlogPostPage, AnnouncementsIndexPage: driftAnnouncementsIndexPage, AnnouncementDetailPage: driftAnnouncementDetailPage, GalleryPage: driftGalleryPage, FaqsPage: driftFaqsPage, ContactPage: driftContactPage },
  forge: { config: forgeConfig, Layout: forgeLayout, HomePage: forgeHomePage, AboutPage: forgeAboutPage, AdmissionsPage: forgeAdmissionsPage, ProgramsPage: forgeProgramsPage, ProgramDetailPage: forgeProgramDetailPage, ClassesPage: forgeClassesPage, BlogIndexPage: forgeBlogIndexPage, BlogPostPage: forgeBlogPostPage, AnnouncementsIndexPage: forgeAnnouncementsIndexPage, AnnouncementDetailPage: forgeAnnouncementDetailPage, GalleryPage: forgeGalleryPage, FaqsPage: forgeFaqsPage, ContactPage: forgeContactPage },
  halo: { config: haloConfig, Layout: haloLayout, HomePage: haloHomePage, AboutPage: haloAboutPage, AdmissionsPage: haloAdmissionsPage, ProgramsPage: haloProgramsPage, ProgramDetailPage: haloProgramDetailPage, ClassesPage: haloClassesPage, BlogIndexPage: haloBlogIndexPage, BlogPostPage: haloBlogPostPage, AnnouncementsIndexPage: haloAnnouncementsIndexPage, AnnouncementDetailPage: haloAnnouncementDetailPage, GalleryPage: haloGalleryPage, FaqsPage: haloFaqsPage, ContactPage: haloContactPage },
  meadow: { config: meadowConfig, Layout: meadowLayout, HomePage: meadowHomePage, AboutPage: meadowAboutPage, AdmissionsPage: meadowAdmissionsPage, ProgramsPage: meadowProgramsPage, ProgramDetailPage: meadowProgramDetailPage, ClassesPage: meadowClassesPage, BlogIndexPage: meadowBlogIndexPage, BlogPostPage: meadowBlogPostPage, AnnouncementsIndexPage: meadowAnnouncementsIndexPage, AnnouncementDetailPage: meadowAnnouncementDetailPage, GalleryPage: meadowGalleryPage, FaqsPage: meadowFaqsPage, ContactPage: meadowContactPage },
  orbit: { config: orbitConfig, Layout: orbitLayout, HomePage: orbitHomePage, AboutPage: orbitAboutPage, AdmissionsPage: orbitAdmissionsPage, ProgramsPage: orbitProgramsPage, ProgramDetailPage: orbitProgramDetailPage, ClassesPage: orbitClassesPage, BlogIndexPage: orbitBlogIndexPage, BlogPostPage: orbitBlogPostPage, AnnouncementsIndexPage: orbitAnnouncementsIndexPage, AnnouncementDetailPage: orbitAnnouncementDetailPage, GalleryPage: orbitGalleryPage, FaqsPage: orbitFaqsPage, ContactPage: orbitContactPage },
  prism: { config: prismConfig, Layout: prismLayout, HomePage: prismHomePage, AboutPage: prismAboutPage, AdmissionsPage: prismAdmissionsPage, ProgramsPage: prismProgramsPage, ProgramDetailPage: prismProgramDetailPage, ClassesPage: prismClassesPage, BlogIndexPage: prismBlogIndexPage, BlogPostPage: prismBlogPostPage, AnnouncementsIndexPage: prismAnnouncementsIndexPage, AnnouncementDetailPage: prismAnnouncementDetailPage, GalleryPage: prismGalleryPage, FaqsPage: prismFaqsPage, ContactPage: prismContactPage },
  quartz: { config: quartzConfig, Layout: quartzLayout, HomePage: quartzHomePage, AboutPage: quartzAboutPage, AdmissionsPage: quartzAdmissionsPage, ProgramsPage: quartzProgramsPage, ProgramDetailPage: quartzProgramDetailPage, ClassesPage: quartzClassesPage, BlogIndexPage: quartzBlogIndexPage, BlogPostPage: quartzBlogPostPage, AnnouncementsIndexPage: quartzAnnouncementsIndexPage, AnnouncementDetailPage: quartzAnnouncementDetailPage, GalleryPage: quartzGalleryPage, FaqsPage: quartzFaqsPage, ContactPage: quartzContactPage },
  summit: { config: summitConfig, Layout: summitLayout, HomePage: summitHomePage, AboutPage: summitAboutPage, AdmissionsPage: summitAdmissionsPage, ProgramsPage: summitProgramsPage, ProgramDetailPage: summitProgramDetailPage, ClassesPage: summitClassesPage, BlogIndexPage: summitBlogIndexPage, BlogPostPage: summitBlogPostPage, AnnouncementsIndexPage: summitAnnouncementsIndexPage, AnnouncementDetailPage: summitAnnouncementDetailPage, GalleryPage: summitGalleryPage, FaqsPage: summitFaqsPage, ContactPage: summitContactPage },
  tide: { config: tideConfig, Layout: tideLayout, HomePage: tideHomePage, AboutPage: tideAboutPage, AdmissionsPage: tideAdmissionsPage, ProgramsPage: tideProgramsPage, ProgramDetailPage: tideProgramDetailPage, ClassesPage: tideClassesPage, BlogIndexPage: tideBlogIndexPage, BlogPostPage: tideBlogPostPage, AnnouncementsIndexPage: tideAnnouncementsIndexPage, AnnouncementDetailPage: tideAnnouncementDetailPage, GalleryPage: tideGalleryPage, FaqsPage: tideFaqsPage, ContactPage: tideContactPage },
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
