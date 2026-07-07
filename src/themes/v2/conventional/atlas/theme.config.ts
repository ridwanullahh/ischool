import type { ThemeConfig } from '../../types';
const config: ThemeConfig = {
  name: 'atlas', label: 'Atlas', description: 'Cartographic explorer with map-inspired elements',
  archetype: 'cartographic', category: 'conventional', defaultMode: 'light',
  typography: 'Spectral', accentTypography: 'DM Sans',
  iconPath: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zm6-3v15m6-12v15',
  defaultPrimaryColor: '#15803d', hasCustomChatWidget: true,
  tags: ['cartographic', 'explorer', 'map', 'adventurous'],
};
export default config;
