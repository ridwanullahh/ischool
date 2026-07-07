import type { ThemeConfig } from '../../types';

const config: ThemeConfig = {
  name: 'harmony',
  label: 'Harmony',
  description: 'Floating glassmorphism with depth and gradients',
  archetype: 'glassmorphism',
  category: 'conventional',
  defaultMode: 'light',
  typography: 'Inter',
  accentTypography: 'Inter',
  iconPath:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  defaultPrimaryColor: '#6366f1',
  hasCustomChatWidget: true,
  tags: ['modern', 'glassmorphism', 'gradient', 'premium'],
};

export default config;
