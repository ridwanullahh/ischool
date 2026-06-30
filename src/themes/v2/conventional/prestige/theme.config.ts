import type { ThemeConfig } from '../../types';

const config: ThemeConfig = {
  name: 'prestige',
  label: 'Prestige',
  description: 'Luxury dark mode with gold accents and premium serif',
  archetype: 'luxury-dark',
  category: 'conventional',
  defaultMode: 'dark',
  typography: 'Cormorant Garamond',
  accentTypography: 'Montserrat',
  iconPath:
    'M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z',
  defaultPrimaryColor: '#d4af37',
  hasCustomChatWidget: true,
  tags: ['luxury', 'dark', 'gold', 'premium', 'serif'],
};

export default config;
