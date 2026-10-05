import { themeFromBrand } from '@/utils/themeBrand';

export type ThemePreset = {
  id: string;
  name: string;
  brand: string;
  page?: string;
  swatches: [string, string, string];
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'legno-crema',
    name: 'Legno e crema',
    brand: '#D9A441',
    page: '#FAF7F0',
    swatches: ['#FAF7F0', '#1A1712', '#D9A441'],
  },
  {
    id: 'nero-oro',
    name: 'Nero e oro',
    brand: '#C9A227',
    page: '#FAF7F0',
    swatches: ['#FAF7F0', '#111111', '#C9A227'],
  },
  {
    id: 'mare',
    name: 'Mare',
    brand: '#1A4B8C',
    page: '#E8F4FC',
    swatches: ['#E8F4FC', '#0D2C5A', '#3498DB'],
  },
  {
    id: 'osteria',
    name: 'Osteria classica',
    brand: '#6D4C41',
    page: '#F4EFE6',
    swatches: ['#F4EFE6', '#3E2723', '#8D6E63'],
  },
  {
    id: 'verde',
    name: 'Verde ristorante',
    brand: '#0C5648',
    page: '#F0F7F5',
    swatches: ['#F0F7F5', '#084036', '#0C5648'],
  },
  {
    id: 'minimal',
    name: 'Minimal chiaro',
    brand: '#2C3E50',
    page: '#FFFFFF',
    swatches: ['#FFFFFF', '#1A1A17', '#2C3E50'],
  },
  {
    id: 'borgogna',
    name: 'Borgogna',
    brand: '#6B1326',
    page: '#FAF3F0',
    swatches: ['#FAF3F0', '#2A0A12', '#6B1326'],
  },
  {
    id: 'arancio',
    name: 'Trattoria calda',
    brand: '#E67E22',
    page: '#FFF8F0',
    swatches: ['#FFF8F0', '#3D2314', '#E67E22'],
  },
];

export function themeColorsFromPreset(preset: ThemePreset) {
  return themeFromBrand(preset.brand, preset.page);
}
