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
import auroraClassDetailPage from './aurora/ClassDetailPage.astro';
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

// --- 5 mobile native app-like themes ---
import mobilePulseConfig from './mobile-pulse/theme.config';
import mobilePulseLayout from './mobile-pulse/Layout.astro';
import mobilePulseHomePage from './mobile-pulse/HomePage.astro';
import mobilePulseAboutPage from './mobile-pulse/AboutPage.astro';
import mobilePulseAdmissionsPage from './mobile-pulse/AdmissionsPage.astro';
import mobilePulseProgramsPage from './mobile-pulse/ProgramsPage.astro';
import mobilePulseProgramDetailPage from './mobile-pulse/ProgramDetailPage.astro';
import mobilePulseClassesPage from './mobile-pulse/ClassesPage.astro';
import mobilePulseBlogIndexPage from './mobile-pulse/BlogIndexPage.astro';
import mobilePulseBlogPostPage from './mobile-pulse/BlogPostPage.astro';
import mobilePulseAnnouncementsIndexPage from './mobile-pulse/AnnouncementsIndexPage.astro';
import mobilePulseAnnouncementDetailPage from './mobile-pulse/AnnouncementDetailPage.astro';
import mobilePulseGalleryPage from './mobile-pulse/GalleryPage.astro';
import mobilePulseFaqsPage from './mobile-pulse/FaqsPage.astro';
import mobilePulseContactPage from './mobile-pulse/ContactPage.astro';

import mobileBloomConfig from './mobile-bloom/theme.config';
import mobileBloomLayout from './mobile-bloom/Layout.astro';
import mobileBloomHomePage from './mobile-bloom/HomePage.astro';
import mobileBloomAboutPage from './mobile-bloom/AboutPage.astro';
import mobileBloomAdmissionsPage from './mobile-bloom/AdmissionsPage.astro';
import mobileBloomProgramsPage from './mobile-bloom/ProgramsPage.astro';
import mobileBloomProgramDetailPage from './mobile-bloom/ProgramDetailPage.astro';
import mobileBloomClassesPage from './mobile-bloom/ClassesPage.astro';
import mobileBloomBlogIndexPage from './mobile-bloom/BlogIndexPage.astro';
import mobileBloomBlogPostPage from './mobile-bloom/BlogPostPage.astro';
import mobileBloomAnnouncementsIndexPage from './mobile-bloom/AnnouncementsIndexPage.astro';
import mobileBloomAnnouncementDetailPage from './mobile-bloom/AnnouncementDetailPage.astro';
import mobileBloomGalleryPage from './mobile-bloom/GalleryPage.astro';
import mobileBloomFaqsPage from './mobile-bloom/FaqsPage.astro';
import mobileBloomContactPage from './mobile-bloom/ContactPage.astro';

import mobileAuroraConfig from './mobile-aurora/theme.config';
import mobileAuroraLayout from './mobile-aurora/Layout.astro';
import mobileAuroraHomePage from './mobile-aurora/HomePage.astro';
import mobileAuroraAboutPage from './mobile-aurora/AboutPage.astro';
import mobileAuroraAdmissionsPage from './mobile-aurora/AdmissionsPage.astro';
import mobileAuroraProgramsPage from './mobile-aurora/ProgramsPage.astro';
import mobileAuroraProgramDetailPage from './mobile-aurora/ProgramDetailPage.astro';
import mobileAuroraClassesPage from './mobile-aurora/ClassesPage.astro';
import mobileAuroraBlogIndexPage from './mobile-aurora/BlogIndexPage.astro';
import mobileAuroraBlogPostPage from './mobile-aurora/BlogPostPage.astro';
import mobileAuroraAnnouncementsIndexPage from './mobile-aurora/AnnouncementsIndexPage.astro';
import mobileAuroraAnnouncementDetailPage from './mobile-aurora/AnnouncementDetailPage.astro';
import mobileAuroraGalleryPage from './mobile-aurora/GalleryPage.astro';
import mobileAuroraFaqsPage from './mobile-aurora/FaqsPage.astro';
import mobileAuroraContactPage from './mobile-aurora/ContactPage.astro';

import mobileApexConfig from './mobile-apex/theme.config';
import mobileApexLayout from './mobile-apex/Layout.astro';
import mobileApexHomePage from './mobile-apex/HomePage.astro';
import mobileApexAboutPage from './mobile-apex/AboutPage.astro';
import mobileApexAdmissionsPage from './mobile-apex/AdmissionsPage.astro';
import mobileApexProgramsPage from './mobile-apex/ProgramsPage.astro';
import mobileApexProgramDetailPage from './mobile-apex/ProgramDetailPage.astro';
import mobileApexClassesPage from './mobile-apex/ClassesPage.astro';
import mobileApexBlogIndexPage from './mobile-apex/BlogIndexPage.astro';
import mobileApexBlogPostPage from './mobile-apex/BlogPostPage.astro';
import mobileApexAnnouncementsIndexPage from './mobile-apex/AnnouncementsIndexPage.astro';
import mobileApexAnnouncementDetailPage from './mobile-apex/AnnouncementDetailPage.astro';
import mobileApexGalleryPage from './mobile-apex/GalleryPage.astro';
import mobileApexFaqsPage from './mobile-apex/FaqsPage.astro';
import mobileApexContactPage from './mobile-apex/ContactPage.astro';

import mobileHeritageConfig from './mobile-heritage/theme.config';
import mobileHeritageLayout from './mobile-heritage/Layout.astro';
import mobileHeritageHomePage from './mobile-heritage/HomePage.astro';
import mobileHeritageAboutPage from './mobile-heritage/AboutPage.astro';
import mobileHeritageAdmissionsPage from './mobile-heritage/AdmissionsPage.astro';
import mobileHeritageProgramsPage from './mobile-heritage/ProgramsPage.astro';
import mobileHeritageProgramDetailPage from './mobile-heritage/ProgramDetailPage.astro';
import mobileHeritageClassesPage from './mobile-heritage/ClassesPage.astro';
import mobileHeritageBlogIndexPage from './mobile-heritage/BlogIndexPage.astro';
import mobileHeritageBlogPostPage from './mobile-heritage/BlogPostPage.astro';
import mobileHeritageAnnouncementsIndexPage from './mobile-heritage/AnnouncementsIndexPage.astro';
import mobileHeritageAnnouncementDetailPage from './mobile-heritage/AnnouncementDetailPage.astro';
import mobileHeritageGalleryPage from './mobile-heritage/GalleryPage.astro';
import mobileHeritageFaqsPage from './mobile-heritage/FaqsPage.astro';
import mobileHeritageContactPage from './mobile-heritage/ContactPage.astro';

import zenithConfig from './zenith/theme.config';
import zenithLayout from './zenith/Layout.astro';
import zenithHomePage from './zenith/HomePage.astro';
import zenithAboutPage from './zenith/AboutPage.astro';
import zenithAdmissionsPage from './zenith/AdmissionsPage.astro';
import zenithProgramsPage from './zenith/ProgramsPage.astro';
import zenithProgramDetailPage from './zenith/ProgramDetailPage.astro';
import zenithClassesPage from './zenith/ClassesPage.astro';
import zenithBlogIndexPage from './zenith/BlogIndexPage.astro';
import zenithBlogPostPage from './zenith/BlogPostPage.astro';
import zenithAnnouncementsIndexPage from './zenith/AnnouncementsIndexPage.astro';
import zenithAnnouncementDetailPage from './zenith/AnnouncementDetailPage.astro';
import zenithGalleryPage from './zenith/GalleryPage.astro';
import zenithFaqsPage from './zenith/FaqsPage.astro';
import zenithContactPage from './zenith/ContactPage.astro';

import cascadeConfig from './cascade/theme.config';
import cascadeLayout from './cascade/Layout.astro';
import cascadeHomePage from './cascade/HomePage.astro';
import cascadeAboutPage from './cascade/AboutPage.astro';
import cascadeAdmissionsPage from './cascade/AdmissionsPage.astro';
import cascadeProgramsPage from './cascade/ProgramsPage.astro';
import cascadeProgramDetailPage from './cascade/ProgramDetailPage.astro';
import cascadeClassesPage from './cascade/ClassesPage.astro';
import cascadeBlogIndexPage from './cascade/BlogIndexPage.astro';
import cascadeBlogPostPage from './cascade/BlogPostPage.astro';
import cascadeAnnouncementsIndexPage from './cascade/AnnouncementsIndexPage.astro';
import cascadeAnnouncementDetailPage from './cascade/AnnouncementDetailPage.astro';
import cascadeGalleryPage from './cascade/GalleryPage.astro';
import cascadeFaqsPage from './cascade/FaqsPage.astro';
import cascadeContactPage from './cascade/ContactPage.astro';

import serenityConfig from './serenity/theme.config';
import serenityLayout from './serenity/Layout.astro';
import serenityHomePage from './serenity/HomePage.astro';
import serenityAboutPage from './serenity/AboutPage.astro';
import serenityAdmissionsPage from './serenity/AdmissionsPage.astro';
import serenityProgramsPage from './serenity/ProgramsPage.astro';
import serenityProgramDetailPage from './serenity/ProgramDetailPage.astro';
import serenityClassesPage from './serenity/ClassesPage.astro';
import serenityBlogIndexPage from './serenity/BlogIndexPage.astro';
import serenityBlogPostPage from './serenity/BlogPostPage.astro';
import serenityAnnouncementsIndexPage from './serenity/AnnouncementsIndexPage.astro';
import serenityAnnouncementDetailPage from './serenity/AnnouncementDetailPage.astro';
import serenityGalleryPage from './serenity/GalleryPage.astro';
import serenityFaqsPage from './serenity/FaqsPage.astro';
import serenityContactPage from './serenity/ContactPage.astro';

import horizonConfig from './horizon/theme.config';
import horizonLayout from './horizon/Layout.astro';
import horizonHomePage from './horizon/HomePage.astro';
import horizonAboutPage from './horizon/AboutPage.astro';
import horizonAdmissionsPage from './horizon/AdmissionsPage.astro';
import horizonProgramsPage from './horizon/ProgramsPage.astro';
import horizonProgramDetailPage from './horizon/ProgramDetailPage.astro';
import horizonClassesPage from './horizon/ClassesPage.astro';
import horizonBlogIndexPage from './horizon/BlogIndexPage.astro';
import horizonBlogPostPage from './horizon/BlogPostPage.astro';
import horizonAnnouncementsIndexPage from './horizon/AnnouncementsIndexPage.astro';
import horizonAnnouncementDetailPage from './horizon/AnnouncementDetailPage.astro';
import horizonGalleryPage from './horizon/GalleryPage.astro';
import horizonFaqsPage from './horizon/FaqsPage.astro';
import horizonContactPage from './horizon/ContactPage.astro';

import prestigeConfig from './prestige/theme.config';
import prestigeLayout from './prestige/Layout.astro';
import prestigeHomePage from './prestige/HomePage.astro';
import prestigeAboutPage from './prestige/AboutPage.astro';
import prestigeAdmissionsPage from './prestige/AdmissionsPage.astro';
import prestigeProgramsPage from './prestige/ProgramsPage.astro';
import prestigeProgramDetailPage from './prestige/ProgramDetailPage.astro';
import prestigeClassesPage from './prestige/ClassesPage.astro';
import prestigeBlogIndexPage from './prestige/BlogIndexPage.astro';
import prestigeBlogPostPage from './prestige/BlogPostPage.astro';
import prestigeAnnouncementsIndexPage from './prestige/AnnouncementsIndexPage.astro';
import prestigeAnnouncementDetailPage from './prestige/AnnouncementDetailPage.astro';
import prestigeGalleryPage from './prestige/GalleryPage.astro';
import prestigeFaqsPage from './prestige/FaqsPage.astro';
import prestigeContactPage from './prestige/ContactPage.astro';

import mobileSapphireConfig from './mobile-sapphire/theme.config';
import mobileSapphireLayout from './mobile-sapphire/Layout.astro';
import mobileSapphireHomePage from './mobile-sapphire/HomePage.astro';
import mobileSapphireAboutPage from './mobile-sapphire/AboutPage.astro';
import mobileSapphireAdmissionsPage from './mobile-sapphire/AdmissionsPage.astro';
import mobileSapphireProgramsPage from './mobile-sapphire/ProgramsPage.astro';
import mobileSapphireProgramDetailPage from './mobile-sapphire/ProgramDetailPage.astro';
import mobileSapphireClassesPage from './mobile-sapphire/ClassesPage.astro';
import mobileSapphireBlogIndexPage from './mobile-sapphire/BlogIndexPage.astro';
import mobileSapphireBlogPostPage from './mobile-sapphire/BlogPostPage.astro';
import mobileSapphireAnnouncementsIndexPage from './mobile-sapphire/AnnouncementsIndexPage.astro';
import mobileSapphireAnnouncementDetailPage from './mobile-sapphire/AnnouncementDetailPage.astro';
import mobileSapphireGalleryPage from './mobile-sapphire/GalleryPage.astro';
import mobileSapphireFaqsPage from './mobile-sapphire/FaqsPage.astro';
import mobileSapphireContactPage from './mobile-sapphire/ContactPage.astro';

import mobileHaloConfig from './mobile-halo/theme.config';
import mobileHaloLayout from './mobile-halo/Layout.astro';
import mobileHaloHomePage from './mobile-halo/HomePage.astro';
import mobileHaloAboutPage from './mobile-halo/AboutPage.astro';
import mobileHaloAdmissionsPage from './mobile-halo/AdmissionsPage.astro';
import mobileHaloProgramsPage from './mobile-halo/ProgramsPage.astro';
import mobileHaloProgramDetailPage from './mobile-halo/ProgramDetailPage.astro';
import mobileHaloClassesPage from './mobile-halo/ClassesPage.astro';
import mobileHaloBlogIndexPage from './mobile-halo/BlogIndexPage.astro';
import mobileHaloBlogPostPage from './mobile-halo/BlogPostPage.astro';
import mobileHaloAnnouncementsIndexPage from './mobile-halo/AnnouncementsIndexPage.astro';
import mobileHaloAnnouncementDetailPage from './mobile-halo/AnnouncementDetailPage.astro';
import mobileHaloGalleryPage from './mobile-halo/GalleryPage.astro';
import mobileHaloFaqsPage from './mobile-halo/FaqsPage.astro';
import mobileHaloContactPage from './mobile-halo/ContactPage.astro';

import mobileMeadowConfig from './mobile-meadow/theme.config';
import mobileMeadowLayout from './mobile-meadow/Layout.astro';
import mobileMeadowHomePage from './mobile-meadow/HomePage.astro';
import mobileMeadowAboutPage from './mobile-meadow/AboutPage.astro';
import mobileMeadowAdmissionsPage from './mobile-meadow/AdmissionsPage.astro';
import mobileMeadowProgramsPage from './mobile-meadow/ProgramsPage.astro';
import mobileMeadowProgramDetailPage from './mobile-meadow/ProgramDetailPage.astro';
import mobileMeadowClassesPage from './mobile-meadow/ClassesPage.astro';
import mobileMeadowBlogIndexPage from './mobile-meadow/BlogIndexPage.astro';
import mobileMeadowBlogPostPage from './mobile-meadow/BlogPostPage.astro';
import mobileMeadowAnnouncementsIndexPage from './mobile-meadow/AnnouncementsIndexPage.astro';
import mobileMeadowAnnouncementDetailPage from './mobile-meadow/AnnouncementDetailPage.astro';
import mobileMeadowGalleryPage from './mobile-meadow/GalleryPage.astro';
import mobileMeadowFaqsPage from './mobile-meadow/FaqsPage.astro';
import mobileMeadowContactPage from './mobile-meadow/ContactPage.astro';

import mobileOrbitConfig from './mobile-orbit/theme.config';
import mobileOrbitLayout from './mobile-orbit/Layout.astro';
import mobileOrbitHomePage from './mobile-orbit/HomePage.astro';
import mobileOrbitAboutPage from './mobile-orbit/AboutPage.astro';
import mobileOrbitAdmissionsPage from './mobile-orbit/AdmissionsPage.astro';
import mobileOrbitProgramsPage from './mobile-orbit/ProgramsPage.astro';
import mobileOrbitProgramDetailPage from './mobile-orbit/ProgramDetailPage.astro';
import mobileOrbitClassesPage from './mobile-orbit/ClassesPage.astro';
import mobileOrbitBlogIndexPage from './mobile-orbit/BlogIndexPage.astro';
import mobileOrbitBlogPostPage from './mobile-orbit/BlogPostPage.astro';
import mobileOrbitAnnouncementsIndexPage from './mobile-orbit/AnnouncementsIndexPage.astro';
import mobileOrbitAnnouncementDetailPage from './mobile-orbit/AnnouncementDetailPage.astro';
import mobileOrbitGalleryPage from './mobile-orbit/GalleryPage.astro';
import mobileOrbitFaqsPage from './mobile-orbit/FaqsPage.astro';
import mobileOrbitContactPage from './mobile-orbit/ContactPage.astro';

import mobileSummitConfig from './mobile-summit/theme.config';
import mobileSummitLayout from './mobile-summit/Layout.astro';
import mobileSummitHomePage from './mobile-summit/HomePage.astro';
import mobileSummitAboutPage from './mobile-summit/AboutPage.astro';
import mobileSummitAdmissionsPage from './mobile-summit/AdmissionsPage.astro';
import mobileSummitProgramsPage from './mobile-summit/ProgramsPage.astro';
import mobileSummitProgramDetailPage from './mobile-summit/ProgramDetailPage.astro';
import mobileSummitClassesPage from './mobile-summit/ClassesPage.astro';
import mobileSummitBlogIndexPage from './mobile-summit/BlogIndexPage.astro';
import mobileSummitBlogPostPage from './mobile-summit/BlogPostPage.astro';
import mobileSummitAnnouncementsIndexPage from './mobile-summit/AnnouncementsIndexPage.astro';
import mobileSummitAnnouncementDetailPage from './mobile-summit/AnnouncementDetailPage.astro';
import mobileSummitGalleryPage from './mobile-summit/GalleryPage.astro';
import mobileSummitFaqsPage from './mobile-summit/FaqsPage.astro';
import mobileSummitContactPage from './mobile-summit/ContactPage.astro';

import emberConfig from './ember/theme.config';
import emberLayout from './ember/Layout.astro';
import emberHomePage from './ember/HomePage.astro';
import emberAboutPage from './ember/AboutPage.astro';
import emberAdmissionsPage from './ember/AdmissionsPage.astro';
import emberProgramsPage from './ember/ProgramsPage.astro';
import emberProgramDetailPage from './ember/ProgramDetailPage.astro';
import emberClassesPage from './ember/ClassesPage.astro';
import emberBlogIndexPage from './ember/BlogIndexPage.astro';
import emberBlogPostPage from './ember/BlogPostPage.astro';
import emberAnnouncementsIndexPage from './ember/AnnouncementsIndexPage.astro';
import emberAnnouncementDetailPage from './ember/AnnouncementDetailPage.astro';
import emberGalleryPage from './ember/GalleryPage.astro';
import emberFaqsPage from './ember/FaqsPage.astro';
import emberContactPage from './ember/ContactPage.astro';

import oasisConfig from './oasis/theme.config';
import oasisLayout from './oasis/Layout.astro';
import oasisHomePage from './oasis/HomePage.astro';
import oasisAboutPage from './oasis/AboutPage.astro';
import oasisAdmissionsPage from './oasis/AdmissionsPage.astro';
import oasisProgramsPage from './oasis/ProgramsPage.astro';
import oasisProgramDetailPage from './oasis/ProgramDetailPage.astro';
import oasisClassesPage from './oasis/ClassesPage.astro';
import oasisBlogIndexPage from './oasis/BlogIndexPage.astro';
import oasisBlogPostPage from './oasis/BlogPostPage.astro';
import oasisAnnouncementsIndexPage from './oasis/AnnouncementsIndexPage.astro';
import oasisAnnouncementDetailPage from './oasis/AnnouncementDetailPage.astro';
import oasisGalleryPage from './oasis/GalleryPage.astro';
import oasisFaqsPage from './oasis/FaqsPage.astro';
import oasisContactPage from './oasis/ContactPage.astro';

import slateConfig from './slate/theme.config';
import slateLayout from './slate/Layout.astro';
import slateHomePage from './slate/HomePage.astro';
import slateAboutPage from './slate/AboutPage.astro';
import slateAdmissionsPage from './slate/AdmissionsPage.astro';
import slateProgramsPage from './slate/ProgramsPage.astro';
import slateProgramDetailPage from './slate/ProgramDetailPage.astro';
import slateClassesPage from './slate/ClassesPage.astro';
import slateBlogIndexPage from './slate/BlogIndexPage.astro';
import slateBlogPostPage from './slate/BlogPostPage.astro';
import slateAnnouncementsIndexPage from './slate/AnnouncementsIndexPage.astro';
import slateAnnouncementDetailPage from './slate/AnnouncementDetailPage.astro';
import slateGalleryPage from './slate/GalleryPage.astro';
import slateFaqsPage from './slate/FaqsPage.astro';
import slateContactPage from './slate/ContactPage.astro';

import harmonyConfig from './harmony/theme.config';
import harmonyLayout from './harmony/Layout.astro';
import harmonyHomePage from './harmony/HomePage.astro';
import harmonyAboutPage from './harmony/AboutPage.astro';
import harmonyAdmissionsPage from './harmony/AdmissionsPage.astro';
import harmonyProgramsPage from './harmony/ProgramsPage.astro';
import harmonyProgramDetailPage from './harmony/ProgramDetailPage.astro';
import harmonyClassesPage from './harmony/ClassesPage.astro';
import harmonyBlogIndexPage from './harmony/BlogIndexPage.astro';
import harmonyBlogPostPage from './harmony/BlogPostPage.astro';
import harmonyAnnouncementsIndexPage from './harmony/AnnouncementsIndexPage.astro';
import harmonyAnnouncementDetailPage from './harmony/AnnouncementDetailPage.astro';
import harmonyGalleryPage from './harmony/GalleryPage.astro';
import harmonyFaqsPage from './harmony/FaqsPage.astro';
import harmonyContactPage from './harmony/ContactPage.astro';

import scholarConfig from './scholar/theme.config';
import scholarLayout from './scholar/Layout.astro';
import scholarHomePage from './scholar/HomePage.astro';
import scholarAboutPage from './scholar/AboutPage.astro';
import scholarAdmissionsPage from './scholar/AdmissionsPage.astro';
import scholarProgramsPage from './scholar/ProgramsPage.astro';
import scholarProgramDetailPage from './scholar/ProgramDetailPage.astro';
import scholarClassesPage from './scholar/ClassesPage.astro';
import scholarBlogIndexPage from './scholar/BlogIndexPage.astro';
import scholarBlogPostPage from './scholar/BlogPostPage.astro';
import scholarAnnouncementsIndexPage from './scholar/AnnouncementsIndexPage.astro';
import scholarAnnouncementDetailPage from './scholar/AnnouncementDetailPage.astro';
import scholarGalleryPage from './scholar/GalleryPage.astro';
import scholarFaqsPage from './scholar/FaqsPage.astro';
import scholarContactPage from './scholar/ContactPage.astro';

import mobileQuartzConfig from './mobile-quartz/theme.config';
import mobileQuartzLayout from './mobile-quartz/Layout.astro';
import mobileQuartzHomePage from './mobile-quartz/HomePage.astro';
import mobileQuartzAboutPage from './mobile-quartz/AboutPage.astro';
import mobileQuartzAdmissionsPage from './mobile-quartz/AdmissionsPage.astro';
import mobileQuartzProgramsPage from './mobile-quartz/ProgramsPage.astro';
import mobileQuartzProgramDetailPage from './mobile-quartz/ProgramDetailPage.astro';
import mobileQuartzClassesPage from './mobile-quartz/ClassesPage.astro';
import mobileQuartzBlogIndexPage from './mobile-quartz/BlogIndexPage.astro';
import mobileQuartzBlogPostPage from './mobile-quartz/BlogPostPage.astro';
import mobileQuartzAnnouncementsIndexPage from './mobile-quartz/AnnouncementsIndexPage.astro';
import mobileQuartzAnnouncementDetailPage from './mobile-quartz/AnnouncementDetailPage.astro';
import mobileQuartzGalleryPage from './mobile-quartz/GalleryPage.astro';
import mobileQuartzFaqsPage from './mobile-quartz/FaqsPage.astro';
import mobileQuartzContactPage from './mobile-quartz/ContactPage.astro';

import mobileDriftConfig from './mobile-drift/theme.config';
import mobileDriftLayout from './mobile-drift/Layout.astro';
import mobileDriftHomePage from './mobile-drift/HomePage.astro';
import mobileDriftAboutPage from './mobile-drift/AboutPage.astro';
import mobileDriftAdmissionsPage from './mobile-drift/AdmissionsPage.astro';
import mobileDriftProgramsPage from './mobile-drift/ProgramsPage.astro';
import mobileDriftProgramDetailPage from './mobile-drift/ProgramDetailPage.astro';
import mobileDriftClassesPage from './mobile-drift/ClassesPage.astro';
import mobileDriftBlogIndexPage from './mobile-drift/BlogIndexPage.astro';
import mobileDriftBlogPostPage from './mobile-drift/BlogPostPage.astro';
import mobileDriftAnnouncementsIndexPage from './mobile-drift/AnnouncementsIndexPage.astro';
import mobileDriftAnnouncementDetailPage from './mobile-drift/AnnouncementDetailPage.astro';
import mobileDriftGalleryPage from './mobile-drift/GalleryPage.astro';
import mobileDriftFaqsPage from './mobile-drift/FaqsPage.astro';
import mobileDriftContactPage from './mobile-drift/ContactPage.astro';

import mobileForgeConfig from './mobile-forge/theme.config';
import mobileForgeLayout from './mobile-forge/Layout.astro';
import mobileForgeHomePage from './mobile-forge/HomePage.astro';
import mobileForgeAboutPage from './mobile-forge/AboutPage.astro';
import mobileForgeAdmissionsPage from './mobile-forge/AdmissionsPage.astro';
import mobileForgeProgramsPage from './mobile-forge/ProgramsPage.astro';
import mobileForgeProgramDetailPage from './mobile-forge/ProgramDetailPage.astro';
import mobileForgeClassesPage from './mobile-forge/ClassesPage.astro';
import mobileForgeBlogIndexPage from './mobile-forge/BlogIndexPage.astro';
import mobileForgeBlogPostPage from './mobile-forge/BlogPostPage.astro';
import mobileForgeAnnouncementsIndexPage from './mobile-forge/AnnouncementsIndexPage.astro';
import mobileForgeAnnouncementDetailPage from './mobile-forge/AnnouncementDetailPage.astro';
import mobileForgeGalleryPage from './mobile-forge/GalleryPage.astro';
import mobileForgeFaqsPage from './mobile-forge/FaqsPage.astro';
import mobileForgeContactPage from './mobile-forge/ContactPage.astro';

import mobileTideConfig from './mobile-tide/theme.config';
import mobileTideLayout from './mobile-tide/Layout.astro';
import mobileTideHomePage from './mobile-tide/HomePage.astro';
import mobileTideAboutPage from './mobile-tide/AboutPage.astro';
import mobileTideAdmissionsPage from './mobile-tide/AdmissionsPage.astro';
import mobileTideProgramsPage from './mobile-tide/ProgramsPage.astro';
import mobileTideProgramDetailPage from './mobile-tide/ProgramDetailPage.astro';
import mobileTideClassesPage from './mobile-tide/ClassesPage.astro';
import mobileTideBlogIndexPage from './mobile-tide/BlogIndexPage.astro';
import mobileTideBlogPostPage from './mobile-tide/BlogPostPage.astro';
import mobileTideAnnouncementsIndexPage from './mobile-tide/AnnouncementsIndexPage.astro';
import mobileTideAnnouncementDetailPage from './mobile-tide/AnnouncementDetailPage.astro';
import mobileTideGalleryPage from './mobile-tide/GalleryPage.astro';
import mobileTideFaqsPage from './mobile-tide/FaqsPage.astro';
import mobileTideContactPage from './mobile-tide/ContactPage.astro';

import mobileVividConfig from './mobile-vivid/theme.config';
import mobileVividLayout from './mobile-vivid/Layout.astro';
import mobileVividHomePage from './mobile-vivid/HomePage.astro';
import mobileVividAboutPage from './mobile-vivid/AboutPage.astro';
import mobileVividAdmissionsPage from './mobile-vivid/AdmissionsPage.astro';
import mobileVividProgramsPage from './mobile-vivid/ProgramsPage.astro';
import mobileVividProgramDetailPage from './mobile-vivid/ProgramDetailPage.astro';
import mobileVividClassesPage from './mobile-vivid/ClassesPage.astro';
import mobileVividBlogIndexPage from './mobile-vivid/BlogIndexPage.astro';
import mobileVividBlogPostPage from './mobile-vivid/BlogPostPage.astro';
import mobileVividAnnouncementsIndexPage from './mobile-vivid/AnnouncementsIndexPage.astro';
import mobileVividAnnouncementDetailPage from './mobile-vivid/AnnouncementDetailPage.astro';
import mobileVividGalleryPage from './mobile-vivid/GalleryPage.astro';
import mobileVividFaqsPage from './mobile-vivid/FaqsPage.astro';
import mobileVividContactPage from './mobile-vivid/ContactPage.astro';


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
    ClassDetailPage: auroraClassDetailPage,
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
  'mobile-pulse': { config: mobilePulseConfig, Layout: mobilePulseLayout, HomePage: mobilePulseHomePage, AboutPage: mobilePulseAboutPage, AdmissionsPage: mobilePulseAdmissionsPage, ProgramsPage: mobilePulseProgramsPage, ProgramDetailPage: mobilePulseProgramDetailPage, ClassesPage: mobilePulseClassesPage, BlogIndexPage: mobilePulseBlogIndexPage, BlogPostPage: mobilePulseBlogPostPage, AnnouncementsIndexPage: mobilePulseAnnouncementsIndexPage, AnnouncementDetailPage: mobilePulseAnnouncementDetailPage, GalleryPage: mobilePulseGalleryPage, FaqsPage: mobilePulseFaqsPage, ContactPage: mobilePulseContactPage },
  'mobile-bloom': { config: mobileBloomConfig, Layout: mobileBloomLayout, HomePage: mobileBloomHomePage, AboutPage: mobileBloomAboutPage, AdmissionsPage: mobileBloomAdmissionsPage, ProgramsPage: mobileBloomProgramsPage, ProgramDetailPage: mobileBloomProgramDetailPage, ClassesPage: mobileBloomClassesPage, BlogIndexPage: mobileBloomBlogIndexPage, BlogPostPage: mobileBloomBlogPostPage, AnnouncementsIndexPage: mobileBloomAnnouncementsIndexPage, AnnouncementDetailPage: mobileBloomAnnouncementDetailPage, GalleryPage: mobileBloomGalleryPage, FaqsPage: mobileBloomFaqsPage, ContactPage: mobileBloomContactPage },
  'mobile-aurora': { config: mobileAuroraConfig, Layout: mobileAuroraLayout, HomePage: mobileAuroraHomePage, AboutPage: mobileAuroraAboutPage, AdmissionsPage: mobileAuroraAdmissionsPage, ProgramsPage: mobileAuroraProgramsPage, ProgramDetailPage: mobileAuroraProgramDetailPage, ClassesPage: mobileAuroraClassesPage, BlogIndexPage: mobileAuroraBlogIndexPage, BlogPostPage: mobileAuroraBlogPostPage, AnnouncementsIndexPage: mobileAuroraAnnouncementsIndexPage, AnnouncementDetailPage: mobileAuroraAnnouncementDetailPage, GalleryPage: mobileAuroraGalleryPage, FaqsPage: mobileAuroraFaqsPage, ContactPage: mobileAuroraContactPage },
  'mobile-apex': { config: mobileApexConfig, Layout: mobileApexLayout, HomePage: mobileApexHomePage, AboutPage: mobileApexAboutPage, AdmissionsPage: mobileApexAdmissionsPage, ProgramsPage: mobileApexProgramsPage, ProgramDetailPage: mobileApexProgramDetailPage, ClassesPage: mobileApexClassesPage, BlogIndexPage: mobileApexBlogIndexPage, BlogPostPage: mobileApexBlogPostPage, AnnouncementsIndexPage: mobileApexAnnouncementsIndexPage, AnnouncementDetailPage: mobileApexAnnouncementDetailPage, GalleryPage: mobileApexGalleryPage, FaqsPage: mobileApexFaqsPage, ContactPage: mobileApexContactPage },
  'mobile-heritage': { config: mobileHeritageConfig, Layout: mobileHeritageLayout, HomePage: mobileHeritageHomePage, AboutPage: mobileHeritageAboutPage, AdmissionsPage: mobileHeritageAdmissionsPage, ProgramsPage: mobileHeritageProgramsPage, ProgramDetailPage: mobileHeritageProgramDetailPage, ClassesPage: mobileHeritageClassesPage, BlogIndexPage: mobileHeritageBlogIndexPage, BlogPostPage: mobileHeritageBlogPostPage, AnnouncementsIndexPage: mobileHeritageAnnouncementsIndexPage, AnnouncementDetailPage: mobileHeritageAnnouncementDetailPage, GalleryPage: mobileHeritageGalleryPage, FaqsPage: mobileHeritageFaqsPage, ContactPage: mobileHeritageContactPage },
'zenith': { config: zenithConfig, Layout: zenithLayout, HomePage: zenithHomePage, AboutPage: zenithAboutPage, AdmissionsPage: zenithAdmissionsPage, ProgramsPage: zenithProgramsPage, ProgramDetailPage: zenithProgramDetailPage, ClassesPage: zenithClassesPage, BlogIndexPage: zenithBlogIndexPage, BlogPostPage: zenithBlogPostPage, AnnouncementsIndexPage: zenithAnnouncementsIndexPage, AnnouncementDetailPage: zenithAnnouncementDetailPage, GalleryPage: zenithGalleryPage, FaqsPage: zenithFaqsPage, ContactPage: zenithContactPage },
  'cascade': { config: cascadeConfig, Layout: cascadeLayout, HomePage: cascadeHomePage, AboutPage: cascadeAboutPage, AdmissionsPage: cascadeAdmissionsPage, ProgramsPage: cascadeProgramsPage, ProgramDetailPage: cascadeProgramDetailPage, ClassesPage: cascadeClassesPage, BlogIndexPage: cascadeBlogIndexPage, BlogPostPage: cascadeBlogPostPage, AnnouncementsIndexPage: cascadeAnnouncementsIndexPage, AnnouncementDetailPage: cascadeAnnouncementDetailPage, GalleryPage: cascadeGalleryPage, FaqsPage: cascadeFaqsPage, ContactPage: cascadeContactPage },
  'serenity': { config: serenityConfig, Layout: serenityLayout, HomePage: serenityHomePage, AboutPage: serenityAboutPage, AdmissionsPage: serenityAdmissionsPage, ProgramsPage: serenityProgramsPage, ProgramDetailPage: serenityProgramDetailPage, ClassesPage: serenityClassesPage, BlogIndexPage: serenityBlogIndexPage, BlogPostPage: serenityBlogPostPage, AnnouncementsIndexPage: serenityAnnouncementsIndexPage, AnnouncementDetailPage: serenityAnnouncementDetailPage, GalleryPage: serenityGalleryPage, FaqsPage: serenityFaqsPage, ContactPage: serenityContactPage },
  'horizon': { config: horizonConfig, Layout: horizonLayout, HomePage: horizonHomePage, AboutPage: horizonAboutPage, AdmissionsPage: horizonAdmissionsPage, ProgramsPage: horizonProgramsPage, ProgramDetailPage: horizonProgramDetailPage, ClassesPage: horizonClassesPage, BlogIndexPage: horizonBlogIndexPage, BlogPostPage: horizonBlogPostPage, AnnouncementsIndexPage: horizonAnnouncementsIndexPage, AnnouncementDetailPage: horizonAnnouncementDetailPage, GalleryPage: horizonGalleryPage, FaqsPage: horizonFaqsPage, ContactPage: horizonContactPage },
  'prestige': { config: prestigeConfig, Layout: prestigeLayout, HomePage: prestigeHomePage, AboutPage: prestigeAboutPage, AdmissionsPage: prestigeAdmissionsPage, ProgramsPage: prestigeProgramsPage, ProgramDetailPage: prestigeProgramDetailPage, ClassesPage: prestigeClassesPage, BlogIndexPage: prestigeBlogIndexPage, BlogPostPage: prestigeBlogPostPage, AnnouncementsIndexPage: prestigeAnnouncementsIndexPage, AnnouncementDetailPage: prestigeAnnouncementDetailPage, GalleryPage: prestigeGalleryPage, FaqsPage: prestigeFaqsPage, ContactPage: prestigeContactPage },
  'mobile-sapphire': { config: mobileSapphireConfig, Layout: mobileSapphireLayout, HomePage: mobileSapphireHomePage, AboutPage: mobileSapphireAboutPage, AdmissionsPage: mobileSapphireAdmissionsPage, ProgramsPage: mobileSapphireProgramsPage, ProgramDetailPage: mobileSapphireProgramDetailPage, ClassesPage: mobileSapphireClassesPage, BlogIndexPage: mobileSapphireBlogIndexPage, BlogPostPage: mobileSapphireBlogPostPage, AnnouncementsIndexPage: mobileSapphireAnnouncementsIndexPage, AnnouncementDetailPage: mobileSapphireAnnouncementDetailPage, GalleryPage: mobileSapphireGalleryPage, FaqsPage: mobileSapphireFaqsPage, ContactPage: mobileSapphireContactPage },
  'mobile-halo': { config: mobileHaloConfig, Layout: mobileHaloLayout, HomePage: mobileHaloHomePage, AboutPage: mobileHaloAboutPage, AdmissionsPage: mobileHaloAdmissionsPage, ProgramsPage: mobileHaloProgramsPage, ProgramDetailPage: mobileHaloProgramDetailPage, ClassesPage: mobileHaloClassesPage, BlogIndexPage: mobileHaloBlogIndexPage, BlogPostPage: mobileHaloBlogPostPage, AnnouncementsIndexPage: mobileHaloAnnouncementsIndexPage, AnnouncementDetailPage: mobileHaloAnnouncementDetailPage, GalleryPage: mobileHaloGalleryPage, FaqsPage: mobileHaloFaqsPage, ContactPage: mobileHaloContactPage },
  'mobile-meadow': { config: mobileMeadowConfig, Layout: mobileMeadowLayout, HomePage: mobileMeadowHomePage, AboutPage: mobileMeadowAboutPage, AdmissionsPage: mobileMeadowAdmissionsPage, ProgramsPage: mobileMeadowProgramsPage, ProgramDetailPage: mobileMeadowProgramDetailPage, ClassesPage: mobileMeadowClassesPage, BlogIndexPage: mobileMeadowBlogIndexPage, BlogPostPage: mobileMeadowBlogPostPage, AnnouncementsIndexPage: mobileMeadowAnnouncementsIndexPage, AnnouncementDetailPage: mobileMeadowAnnouncementDetailPage, GalleryPage: mobileMeadowGalleryPage, FaqsPage: mobileMeadowFaqsPage, ContactPage: mobileMeadowContactPage },
  'mobile-orbit': { config: mobileOrbitConfig, Layout: mobileOrbitLayout, HomePage: mobileOrbitHomePage, AboutPage: mobileOrbitAboutPage, AdmissionsPage: mobileOrbitAdmissionsPage, ProgramsPage: mobileOrbitProgramsPage, ProgramDetailPage: mobileOrbitProgramDetailPage, ClassesPage: mobileOrbitClassesPage, BlogIndexPage: mobileOrbitBlogIndexPage, BlogPostPage: mobileOrbitBlogPostPage, AnnouncementsIndexPage: mobileOrbitAnnouncementsIndexPage, AnnouncementDetailPage: mobileOrbitAnnouncementDetailPage, GalleryPage: mobileOrbitGalleryPage, FaqsPage: mobileOrbitFaqsPage, ContactPage: mobileOrbitContactPage },
  'mobile-summit': { config: mobileSummitConfig, Layout: mobileSummitLayout, HomePage: mobileSummitHomePage, AboutPage: mobileSummitAboutPage, AdmissionsPage: mobileSummitAdmissionsPage, ProgramsPage: mobileSummitProgramsPage, ProgramDetailPage: mobileSummitProgramDetailPage, ClassesPage: mobileSummitClassesPage, BlogIndexPage: mobileSummitBlogIndexPage, BlogPostPage: mobileSummitBlogPostPage, AnnouncementsIndexPage: mobileSummitAnnouncementsIndexPage, AnnouncementDetailPage: mobileSummitAnnouncementDetailPage, GalleryPage: mobileSummitGalleryPage, FaqsPage: mobileSummitFaqsPage, ContactPage: mobileSummitContactPage },
  'ember': { config: emberConfig, Layout: emberLayout, HomePage: emberHomePage, AboutPage: emberAboutPage, AdmissionsPage: emberAdmissionsPage, ProgramsPage: emberProgramsPage, ProgramDetailPage: emberProgramDetailPage, ClassesPage: emberClassesPage, BlogIndexPage: emberBlogIndexPage, BlogPostPage: emberBlogPostPage, AnnouncementsIndexPage: emberAnnouncementsIndexPage, AnnouncementDetailPage: emberAnnouncementDetailPage, GalleryPage: emberGalleryPage, FaqsPage: emberFaqsPage, ContactPage: emberContactPage },
  'oasis': { config: oasisConfig, Layout: oasisLayout, HomePage: oasisHomePage, AboutPage: oasisAboutPage, AdmissionsPage: oasisAdmissionsPage, ProgramsPage: oasisProgramsPage, ProgramDetailPage: oasisProgramDetailPage, ClassesPage: oasisClassesPage, BlogIndexPage: oasisBlogIndexPage, BlogPostPage: oasisBlogPostPage, AnnouncementsIndexPage: oasisAnnouncementsIndexPage, AnnouncementDetailPage: oasisAnnouncementDetailPage, GalleryPage: oasisGalleryPage, FaqsPage: oasisFaqsPage, ContactPage: oasisContactPage },
  'slate': { config: slateConfig, Layout: slateLayout, HomePage: slateHomePage, AboutPage: slateAboutPage, AdmissionsPage: slateAdmissionsPage, ProgramsPage: slateProgramsPage, ProgramDetailPage: slateProgramDetailPage, ClassesPage: slateClassesPage, BlogIndexPage: slateBlogIndexPage, BlogPostPage: slateBlogPostPage, AnnouncementsIndexPage: slateAnnouncementsIndexPage, AnnouncementDetailPage: slateAnnouncementDetailPage, GalleryPage: slateGalleryPage, FaqsPage: slateFaqsPage, ContactPage: slateContactPage },
  'harmony': { config: harmonyConfig, Layout: harmonyLayout, HomePage: harmonyHomePage, AboutPage: harmonyAboutPage, AdmissionsPage: harmonyAdmissionsPage, ProgramsPage: harmonyProgramsPage, ProgramDetailPage: harmonyProgramDetailPage, ClassesPage: harmonyClassesPage, BlogIndexPage: harmonyBlogIndexPage, BlogPostPage: harmonyBlogPostPage, AnnouncementsIndexPage: harmonyAnnouncementsIndexPage, AnnouncementDetailPage: harmonyAnnouncementDetailPage, GalleryPage: harmonyGalleryPage, FaqsPage: harmonyFaqsPage, ContactPage: harmonyContactPage },
  'scholar': { config: scholarConfig, Layout: scholarLayout, HomePage: scholarHomePage, AboutPage: scholarAboutPage, AdmissionsPage: scholarAdmissionsPage, ProgramsPage: scholarProgramsPage, ProgramDetailPage: scholarProgramDetailPage, ClassesPage: scholarClassesPage, BlogIndexPage: scholarBlogIndexPage, BlogPostPage: scholarBlogPostPage, AnnouncementsIndexPage: scholarAnnouncementsIndexPage, AnnouncementDetailPage: scholarAnnouncementDetailPage, GalleryPage: scholarGalleryPage, FaqsPage: scholarFaqsPage, ContactPage: scholarContactPage },
  'mobile-quartz': { config: mobileQuartzConfig, Layout: mobileQuartzLayout, HomePage: mobileQuartzHomePage, AboutPage: mobileQuartzAboutPage, AdmissionsPage: mobileQuartzAdmissionsPage, ProgramsPage: mobileQuartzProgramsPage, ProgramDetailPage: mobileQuartzProgramDetailPage, ClassesPage: mobileQuartzClassesPage, BlogIndexPage: mobileQuartzBlogIndexPage, BlogPostPage: mobileQuartzBlogPostPage, AnnouncementsIndexPage: mobileQuartzAnnouncementsIndexPage, AnnouncementDetailPage: mobileQuartzAnnouncementDetailPage, GalleryPage: mobileQuartzGalleryPage, FaqsPage: mobileQuartzFaqsPage, ContactPage: mobileQuartzContactPage },
  'mobile-drift': { config: mobileDriftConfig, Layout: mobileDriftLayout, HomePage: mobileDriftHomePage, AboutPage: mobileDriftAboutPage, AdmissionsPage: mobileDriftAdmissionsPage, ProgramsPage: mobileDriftProgramsPage, ProgramDetailPage: mobileDriftProgramDetailPage, ClassesPage: mobileDriftClassesPage, BlogIndexPage: mobileDriftBlogIndexPage, BlogPostPage: mobileDriftBlogPostPage, AnnouncementsIndexPage: mobileDriftAnnouncementsIndexPage, AnnouncementDetailPage: mobileDriftAnnouncementDetailPage, GalleryPage: mobileDriftGalleryPage, FaqsPage: mobileDriftFaqsPage, ContactPage: mobileDriftContactPage },
  'mobile-forge': { config: mobileForgeConfig, Layout: mobileForgeLayout, HomePage: mobileForgeHomePage, AboutPage: mobileForgeAboutPage, AdmissionsPage: mobileForgeAdmissionsPage, ProgramsPage: mobileForgeProgramsPage, ProgramDetailPage: mobileForgeProgramDetailPage, ClassesPage: mobileForgeClassesPage, BlogIndexPage: mobileForgeBlogIndexPage, BlogPostPage: mobileForgeBlogPostPage, AnnouncementsIndexPage: mobileForgeAnnouncementsIndexPage, AnnouncementDetailPage: mobileForgeAnnouncementDetailPage, GalleryPage: mobileForgeGalleryPage, FaqsPage: mobileForgeFaqsPage, ContactPage: mobileForgeContactPage },
  'mobile-tide': { config: mobileTideConfig, Layout: mobileTideLayout, HomePage: mobileTideHomePage, AboutPage: mobileTideAboutPage, AdmissionsPage: mobileTideAdmissionsPage, ProgramsPage: mobileTideProgramsPage, ProgramDetailPage: mobileTideProgramDetailPage, ClassesPage: mobileTideClassesPage, BlogIndexPage: mobileTideBlogIndexPage, BlogPostPage: mobileTideBlogPostPage, AnnouncementsIndexPage: mobileTideAnnouncementsIndexPage, AnnouncementDetailPage: mobileTideAnnouncementDetailPage, GalleryPage: mobileTideGalleryPage, FaqsPage: mobileTideFaqsPage, ContactPage: mobileTideContactPage },
  'mobile-vivid': { config: mobileVividConfig, Layout: mobileVividLayout, HomePage: mobileVividHomePage, AboutPage: mobileVividAboutPage, AdmissionsPage: mobileVividAdmissionsPage, ProgramsPage: mobileVividProgramsPage, ProgramDetailPage: mobileVividProgramDetailPage, ClassesPage: mobileVividClassesPage, BlogIndexPage: mobileVividBlogIndexPage, BlogPostPage: mobileVividBlogPostPage, AnnouncementsIndexPage: mobileVividAnnouncementsIndexPage, AnnouncementDetailPage: mobileVividAnnouncementDetailPage, GalleryPage: mobileVividGalleryPage, FaqsPage: mobileVividFaqsPage, ContactPage: mobileVividContactPage },
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
