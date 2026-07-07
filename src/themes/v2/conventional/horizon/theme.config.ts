import type { ThemeConfig } from '../../types';

const config: ThemeConfig = {
  name: 'horizon',
  label: 'Horizon',
  description: 'Ultra-minimal with generous whitespace and mono typography',
  archetype: 'ultra-minimal',
  category: 'conventional',
  defaultMode: 'light',
  typography: 'Space Grotesk',
  accentTypography: 'JetBrains Mono',
  iconPath:
    'M3 12h18M3 6h18M3 18h18',
  defaultPrimaryColor: '#000000',
  hasCustomChatWidget: true,
  tags: ['minimal', 'whitespace', 'mono', 'sparse'],
};

export default config;
