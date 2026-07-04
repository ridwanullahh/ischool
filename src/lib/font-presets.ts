/**
 * Font Presets Library
 *
 * Curated font combinations that work well for school websites.
 * Each preset includes heading and body fonts with Google Fonts URLs.
 */

export interface FontPreset {
  id: string;
  name: string;
  headingFont: string;
  bodyFont: string;
  headingUrl: string;
  bodyUrl: string;
  description: string;
}

export const FONT_PRESETS: FontPreset[] = [
  {
    id: 'inter-clean',
    name: 'Inter Clean',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    headingUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
    bodyUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    description: 'Clean modern sans-serif — perfect for tech and contemporary schools',
  },
  {
    id: 'playfair-editorial',
    name: 'Playfair Editorial',
    headingFont: 'Playfair Display',
    bodyFont: 'Source Sans 3',
    headingUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap',
    bodyUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap',
    description: 'Elegant serif headings with clean body — editorial and prestigious',
  },
  {
    id: 'outfit-modern',
    name: 'Outfit Modern',
    headingFont: 'Outfit',
    bodyFont: 'Outfit',
    headingUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap',
    bodyUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
    description: 'Geometric sans-serif with personality — bold and contemporary',
  },
  {
    id: 'lora-classic',
    name: 'Lora Classic',
    headingFont: 'Lora',
    bodyFont: 'Source Sans 3',
    headingUrl: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
    bodyUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap',
    description: 'Warm serif headings with readable body — classic and approachable',
  },
  {
    id: 'poppins-friendly',
    name: 'Poppins Friendly',
    headingFont: 'Poppins',
    bodyFont: 'Poppins',
    headingUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
    bodyUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap',
    description: 'Friendly geometric sans-serif — warm and accessible',
  },
  {
    id: 'space-grotesk-tech',
    name: 'Space Grotesk Tech',
    headingFont: 'Space Grotesk',
    bodyFont: 'Space Grotesk',
    headingUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
    bodyUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&display=swap',
    description: 'Technical sans-serif — for STEM and innovation-focused schools',
  },
  {
    id: 'fraunces-serif',
    name: 'Fraunces Serif',
    headingFont: 'Fraunces',
    bodyFont: 'DM Sans',
    headingUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,900&display=swap',
    bodyUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
    description: 'Organic serif headings with clean body — sophisticated and natural',
  },
  {
    id: 'nunito-rounded',
    name: 'Nunito Rounded',
    headingFont: 'Nunito',
    bodyFont: 'Nunito',
    headingUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap',
    bodyUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
    description: 'Rounded sans-serif — playful and child-friendly',
  },
  {
    id: 'cormorant-luxury',
    name: 'Cormorant Luxury',
    headingFont: 'Cormorant Garamond',
    bodyFont: 'Jost',
    headingUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap',
    bodyUrl: 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap',
    description: 'Refined serif with modern body — luxury and exclusive',
  },
  {
    id: 'sora-geometric',
    name: 'Sora Geometric',
    headingFont: 'Sora',
    bodyFont: 'Sora',
    headingUrl: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap',
    bodyUrl: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&display=swap',
    description: 'Clean geometric sans-serif — modern and minimal',
  },
];

export function getFontPreset(id: string): FontPreset | null {
  return FONT_PRESETS.find(f => f.id === id) ?? null;
}
