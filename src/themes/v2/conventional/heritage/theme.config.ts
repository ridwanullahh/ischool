import type { ThemeConfig } from '../../types';
const config: ThemeConfig = {
  name: 'heritage', label: 'Heritage',
  description: 'Editorial newspaper layout with dense multi-column structure',
  archetype: 'editorial-magazine', category: 'conventional', defaultMode: 'light',
  typography: 'Libre Caslon Text', accentTypography: 'IBM Plex Sans',
  iconPath: 'M4 4h16v16H4V4zm2 2v3h12V6H6zm0 5v3h5v-3H6zm7 0v3h5v-3h-5zM6 15v3h5v-3H6zm7 0v3h5v-3h-5z',
  defaultPrimaryColor: '#991b1b', hasCustomChatWidget: true,
  tags: ['editorial', 'newspaper', 'serif', 'dense'],
};
export default config;
