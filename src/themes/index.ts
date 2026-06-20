import HarmonyLayout from './harmony/Layout.astro';
import ScholarLayout from './scholar/Layout.astro';
import BloomLayout from './bloom/Layout.astro';
import HorizonLayout from './horizon/Layout.astro';
import PrestigeLayout from './prestige/Layout.astro';
import SparkLayout from './spark/Layout.astro';
import AuroraLayout from './aurora/Layout.astro';
import SerenityLayout from './serenity/Layout.astro';
import HeritageLayout from './heritage/Layout.astro';
import CampusLayout from './campus/Layout.astro';
import EmberLayout from './ember/Layout.astro';
import PrismLayout from './prism/Layout.astro';
import SlateLayout from './slate/Layout.astro';
import OasisLayout from './oasis/Layout.astro';
import NovaLayout from './nova/Layout.astro';
import MosaicLayout from './mosaic/Layout.astro';
import LuxeLayout from './luxe/Layout.astro';
import VividLayout from './vivid/Layout.astro';
import ZenithLayout from './zenith/Layout.astro';
import CascadeLayout from './cascade/Layout.astro';
import PulseLayout from './pulse/Layout.astro';
import ApexLayout from './apex/Layout.astro';
import CrestLayout from './crest/Layout.astro';
import TerraLayout from './terra/Layout.astro';
import NexusLayout from './nexus/Layout.astro';
import LuminaLayout from './lumina/Layout.astro';
import AtlasLayout from './atlas/Layout.astro';
import MeridianLayout from './meridian/Layout.astro';
import RadianceLayout from './radiance/Layout.astro';
import VertexLayout from './vertex/Layout.astro';
import CrestwoodLayout from './crestwood/Layout.astro';
import SapphireLayout from './sapphire/Layout.astro';
import EvergreenLayout from './evergreen/Layout.astro';
import DriftLayout from './drift/Layout.astro';
import MonumentLayout from './monument/Layout.astro';
import SignalLayout from './signal/Layout.astro';
import FoliageLayout from './foliage/Layout.astro';
import MarbleLayout from './marble/Layout.astro';
import TideLayout from './tide/Layout.astro';
import ForgeLayout from './forge/Layout.astro';
import SwiftLayout from './swift/Layout.astro';
import MaterialLayout from './material/Layout.astro';
import FluentLayout from './fluent/Layout.astro';
import BreezeLayout from './breeze/Layout.astro';
import DashLayout from './dash/Layout.astro';
import OrbitLayout from './orbit/Layout.astro';
import StreamLayout from './stream/Layout.astro';
import PixelLayout from './pixel/Layout.astro';
import CrispLayout from './crisp/Layout.astro';
import WaveLayout from './wave/Layout.astro';
import SageLayout from './sage/Layout.astro';
import CoralLayout from './coral/Layout.astro';
import IndigoLayout from './indigo/Layout.astro';
import MintLayout from './mint/Layout.astro';
import LavenderLayout from './lavender/Layout.astro';
import CitrusLayout from './citrus/Layout.astro';
import MidnightLayout from './midnight/Layout.astro';
import PoppyLayout from './poppy/Layout.astro';
import GlacierLayout from './glacier/Layout.astro';
import EmberGlowLayout from './ember-glow/Layout.astro';

export const themeLayouts: Record<string, any> = {
  harmony: HarmonyLayout,
  scholar: ScholarLayout,
  bloom: BloomLayout,
  horizon: HorizonLayout,
  prestige: PrestigeLayout,
  spark: SparkLayout,
  aurora: AuroraLayout,
  serenity: SerenityLayout,
  heritage: HeritageLayout,
  campus: CampusLayout,
  ember: EmberLayout,
  prism: PrismLayout,
  slate: SlateLayout,
  oasis: OasisLayout,
  nova: NovaLayout,
  mosaic: MosaicLayout,
  luxe: LuxeLayout,
  vivid: VividLayout,
  zenith: ZenithLayout,
  cascade: CascadeLayout,
  pulse: PulseLayout,
  apex: ApexLayout,
  crest: CrestLayout,
  terra: TerraLayout,
  nexus: NexusLayout,
  lumina: LuminaLayout,
  atlas: AtlasLayout,
  meridian: MeridianLayout,
  radiance: RadianceLayout,
  vertex: VertexLayout,
  crestwood: CrestwoodLayout,
  sapphire: SapphireLayout,
  evergreen: EvergreenLayout,
  drift: DriftLayout,
  monument: MonumentLayout,
  signal: SignalLayout,
  foliage: FoliageLayout,
  marble: MarbleLayout,
  tide: TideLayout,
  forge: ForgeLayout,
  swift: SwiftLayout,
  material: MaterialLayout,
  fluent: FluentLayout,
  breeze: BreezeLayout,
  dash: DashLayout,
  orbit: OrbitLayout,
  stream: StreamLayout,
  pixel: PixelLayout,
  crisp: CrispLayout,
  wave: WaveLayout,
  sage: SageLayout,
  coral: CoralLayout,
  indigo: IndigoLayout,
  mint: MintLayout,
  lavender: LavenderLayout,
  citrus: CitrusLayout,
  midnight: MidnightLayout,
  poppy: PoppyLayout,
  glacier: GlacierLayout,
  'ember-glow': EmberGlowLayout,
};

export function getThemeLayout(theme: string) {
  return themeLayouts[theme] || HarmonyLayout;
}

export const themeList = Object.keys(themeLayouts);
