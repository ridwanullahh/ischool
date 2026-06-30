import type { ThemeConfig } from '../../types';

const config: ThemeConfig = {
  name: 'apex',
  label: 'Apex',
  description: 'Bold split-screen layout with asymmetric typography',
  archetype: 'split-screen',
  category: 'conventional',
  defaultMode: 'light',
  typography: 'Space Grotesk',
  accentTypography: 'JetBrains Mono',
  iconPath:
    'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  defaultPrimaryColor: '#0ea5e9',
  hasCustomChatWidget: true,
  tags: ['bold', 'split-screen', 'asymmetric', 'modern'],
};

export default config;
