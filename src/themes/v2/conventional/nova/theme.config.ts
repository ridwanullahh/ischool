import type { ThemeConfig } from '../../types';

const config: ThemeConfig = {
  name: 'nova',
  label: 'Nova',
  description: 'Futuristic dark tech with neon accent glow',
  archetype: 'futuristic-tech',
  category: 'conventional',
  defaultMode: 'dark',
  typography: 'Outfit',
  accentTypography: 'Space Mono',
  iconPath:
    'M13 2L3 14h7v8l10-12h-7V2zm-2 4.5V11H7.5L11 6.5zM13 13h2.5L13 17.5V13z',
  defaultPrimaryColor: '#06b6d4',
  hasCustomChatWidget: true,
  tags: ['futuristic', 'dark', 'neon', 'tech'],
};

export default config;
