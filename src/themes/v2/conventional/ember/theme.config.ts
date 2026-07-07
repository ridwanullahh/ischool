import type { ThemeConfig } from '../../types';

const config: ThemeConfig = {
  name: 'ember',
  label: 'Ember',
  description: 'Warm earth tones with magazine-style layout',
  archetype: 'warm-earth',
  category: 'conventional',
  defaultMode: 'light',
  typography: 'Lora',
  accentTypography: 'Source Sans 3',
  iconPath:
    'M12 2C8 6 6 10 6 14a6 6 0 0012 0c0-2-1-4-2-5 0 2-1 3-2 3 0-3-1-6-2-10z',
  defaultPrimaryColor: '#c2410c',
  hasCustomChatWidget: true,
  tags: ['warm', 'earth', 'magazine', 'cozy'],
};

export default config;
