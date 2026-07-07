import type { ThemeConfig } from '../../types';

const config: ThemeConfig = {
  name: 'mobile-harmony',
  label: 'Harmony Mobile',
  description: 'Glassmorphism mobile app with frosted surfaces',
  archetype: 'glassmorphism',
  category: 'mobile',
  defaultMode: 'light',
  typography: 'Inter',
  iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  defaultPrimaryColor: '#6366f1',
  hasCustomChatWidget: true,
  tags: ['mobile', 'app', 'native', 'glassmorphism'],
};

export default config;
