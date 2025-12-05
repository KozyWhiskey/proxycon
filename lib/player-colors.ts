// Magic: The Gathering Color System
// Single colors and two-color guild combinations with gradients

// Single MTG Colors
const SINGLE_COLORS = {
  white: {
    bg: 'bg-gradient-to-br from-slate-100 to-slate-200',
    border: 'border-slate-300',
    text: 'text-slate-800',
    display: 'White',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    border: 'border-blue-500',
    text: 'text-blue-100',
    display: 'Blue',
  },
  black: {
    bg: 'bg-gradient-to-br from-slate-800 to-slate-900',
    border: 'border-slate-700',
    text: 'text-slate-100',
    display: 'Black',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-500 to-red-700',
    border: 'border-red-600',
    text: 'text-red-100',
    display: 'Red',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500 to-green-700',
    border: 'border-green-600',
    text: 'text-green-100',
    display: 'Green',
  },
};

// Two-Color Guilds (Ravnica Guilds)
const GUILDS = {
  azorius: {
    // White/Blue
    bg: 'bg-gradient-to-br from-slate-100 via-blue-200 to-blue-400',
    border: 'border-blue-400',
    text: 'text-blue-900',
    display: 'Azorius (W/U)',
    colors: ['white', 'blue'],
  },
  dimir: {
    // Blue/Black
    bg: 'bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900',
    border: 'border-indigo-600',
    text: 'text-blue-100',
    display: 'Dimir (U/B)',
    colors: ['blue', 'black'],
  },
  rakdos: {
    // Black/Red
    bg: 'bg-gradient-to-br from-slate-900 via-red-800 to-red-600',
    border: 'border-red-700',
    text: 'text-red-100',
    display: 'Rakdos (B/R)',
    colors: ['black', 'red'],
  },
  gruul: {
    // Red/Green
    bg: 'bg-gradient-to-br from-red-600 via-orange-600 to-green-600',
    border: 'border-orange-600',
    text: 'text-green-100',
    display: 'Gruul (R/G)',
    colors: ['red', 'green'],
  },
  selesnya: {
    // Green/White
    bg: 'bg-gradient-to-br from-green-200 via-emerald-300 to-slate-100',
    border: 'border-green-400',
    text: 'text-green-900',
    display: 'Selesnya (G/W)',
    colors: ['green', 'white'],
  },
  orzhov: {
    // White/Black
    bg: 'bg-gradient-to-br from-slate-200 via-slate-500 to-slate-800',
    border: 'border-slate-600',
    text: 'text-slate-100',
    display: 'Orzhov (W/B)',
    colors: ['white', 'black'],
  },
  izzet: {
    // Blue/Red
    bg: 'bg-gradient-to-br from-blue-500 via-purple-600 to-red-600',
    border: 'border-purple-600',
    text: 'text-blue-100',
    display: 'Izzet (U/R)',
    colors: ['blue', 'red'],
  },
  golgari: {
    // Black/Green
    bg: 'bg-gradient-to-br from-slate-900 via-emerald-800 to-green-700',
    border: 'border-emerald-700',
    text: 'text-green-100',
    display: 'Golgari (B/G)',
    colors: ['black', 'green'],
  },
  boros: {
    // Red/White
    bg: 'bg-gradient-to-br from-red-500 via-pink-400 to-slate-100',
    border: 'border-pink-500',
    text: 'text-red-900',
    display: 'Boros (R/W)',
    colors: ['red', 'white'],
  },
  simic: {
    // Green/Blue
    bg: 'bg-gradient-to-br from-green-500 via-teal-500 to-blue-500',
    border: 'border-teal-500',
    text: 'text-green-100',
    display: 'Simic (G/U)',
    colors: ['green', 'blue'],
  },
};

// Combine all colors
export const COLOR_CLASSES: Record<string, string> = {
  // Single colors
  ...Object.fromEntries(
    Object.entries(SINGLE_COLORS).map(([key, value]) => [
      key,
      `${value.bg} ${value.border} ${value.text} border-2`,
    ])
  ),
  // Guilds
  ...Object.fromEntries(
    Object.entries(GUILDS).map(([key, value]) => [
      key,
      `${value.bg} ${value.border} ${value.text} border-2`,
    ])
  ),
};

// Available color options (single colors first, then guilds)
export const AVAILABLE_COLORS = [
  ...Object.keys(SINGLE_COLORS),
  ...Object.keys(GUILDS),
];

// Color display names for UI
export const COLOR_DISPLAY_NAMES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(SINGLE_COLORS).map(([key, value]) => [key, value.display])
  ),
  ...Object.fromEntries(
    Object.entries(GUILDS).map(([key, value]) => [key, value.display])
  ),
};

// Get color class from color name
export function getColorClass(color: string | null | undefined): string | null {
  if (!color || !COLOR_CLASSES[color]) {
    return null;
  }
  return COLOR_CLASSES[color];
}

// Helper to check if a color is a guild (two-color combination)
export function isGuild(color: string | null | undefined): boolean {
  if (!color) return false;
  return color in GUILDS;
}

// Get the two colors that make up a guild
export function getGuildColors(color: string | null | undefined): string[] | null {
  if (!color || !GUILDS[color as keyof typeof GUILDS]) {
    return null;
  }
  return GUILDS[color as keyof typeof GUILDS].colors;
}
