/** CocheTalk.NG color foundation; screens consume semantic tokens via useColors. */
export const primitives = {
  PRIMARY: '#26D367', PRIMARY_FOREGROUND: '#0F1A13', PRIMARY_DARK: '#0F7A3D', PRIMARY_LIGHT: '#DDF9E7',
  SECONDARY: '#0F766E', SECONDARY_FOREGROUND: '#FFFFFF', ACCENT: '#7C3AED', ACCENT_FOREGROUND: '#FFFFFF',
  SUCCESS: '#15803D', WARNING: '#B45309', ERROR: '#DC2626', INFO: '#2563EB',
  WHATSAPP: '#25D366', GOOGLE: '#4285F4', FACEBOOK: '#1877F2',
  WHITE: '#FFFFFF', BLACK: '#000000', IMAGE_SCRIM: 'rgba(0,0,0,0.60)',
  IMAGE_SCRIM_STRONG: 'rgba(0,0,0,0.70)', NEUTRAL_DIVIDER: '#CCCCCC',
} as const;

export type ThemeScheme = 'light' | 'dark';
/** The only roles a future Admin theme is permitted to configure. */
export type ThemeSource = {
  primary: string; secondary: string; accent: string;
  background: string; surface: string; surfaceElevated: string; surfaceMuted: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  border: string; divider: string; success: string; warning: string; error: string; info: string;
};
export type ThemeOverrides = Partial<ThemeSource>;

const sources: Record<ThemeScheme, ThemeSource> = {
  light: {
    primary: primitives.PRIMARY, secondary: primitives.SECONDARY, accent: primitives.ACCENT,
    background: '#F7FAF8', surface: '#FFFFFF', surfaceElevated: '#FFFFFF', surfaceMuted: '#EEF4F0',
    textPrimary: '#14211A', textSecondary: '#4D5F55', textMuted: '#68776F', border: '#D7E3DC', divider: '#E7EEE9',
    success: primitives.SUCCESS, warning: primitives.WARNING, error: primitives.ERROR, info: primitives.INFO,
  },
  dark: {
    primary: primitives.PRIMARY, secondary: primitives.SECONDARY, accent: primitives.ACCENT,
    background: '#0E1511', surface: '#162019', surfaceElevated: '#1C2921', surfaceMuted: '#25342B',
    textPrimary: '#F2F7F4', textSecondary: '#BAC7BF', textMuted: '#8FA096', border: '#314238', divider: '#25342B',
    success: primitives.SUCCESS, warning: primitives.WARNING, error: primitives.ERROR, info: primitives.INFO,
  },
};

function parseHex(value: string): [number, number, number] | null {
  const match = /^#([\da-f]{6})$/i.exec(value);
  if (!match) return null;
  const hex = match[1];
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)) as [number, number, number];
}
function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
function mix(hex: string, target: string, amount: number): string {
  const from = parseHex(hex);
  const to = parseHex(target);
  if (!from || !to) return hex;
  return toHex([0, 1, 2].map((index) => from[index] + (to[index] - from[index]) * amount) as [number, number, number]);
}
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const rgb = parseHex(hex);
    if (!rgb) return 0;
    const channels = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const [first, second] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (first + 0.05) / (second + 0.05);
}
function accessibleForeground(background: string, text: string, preferred?: string): string {
  const candidates = preferred ? [preferred, text, primitives.BLACK, primitives.WHITE] : [text, primitives.BLACK, primitives.WHITE];
  return candidates.reduce((best, candidate) => contrast(candidate, background) > contrast(best, background) ? candidate : best);
}
/** Makes a semantic ink color readable on the active surface without changing fill tokens. */
export function onSurfaceColor(color: string, surface: string, _scheme: ThemeScheme): string {
  if (contrast(color, surface) >= 4.5) return color;
  const target = contrast(primitives.BLACK, surface) >= contrast(primitives.WHITE, surface)
    ? primitives.BLACK
    : primitives.WHITE;
  for (let amount = 0.05; amount <= 1; amount += 0.05) {
    const candidate = mix(color, target, amount);
    if (contrast(candidate, surface) >= 4.5) return candidate;
  }
  return target;
}
function onMultipleSurfacesColor(color: string, surfaces: string[]): string {
  if (surfaces.every((surface) => contrast(color, surface) >= 4.5)) return color;
  for (let amount = 0.05; amount <= 1; amount += 0.05) {
    for (const target of [primitives.BLACK, primitives.WHITE]) {
      const candidate = mix(color, target, amount);
      if (surfaces.every((surface) => contrast(candidate, surface) >= 4.5)) return candidate;
    }
  }
  return surfaces.reduce(
    (best, surface) => contrast(primitives.BLACK, surface) < contrast(primitives.WHITE, surface) ? primitives.WHITE : best,
    primitives.BLACK,
  );
}
function isDefaultPrimary(primary: string): boolean {
  return primary.toUpperCase() === primitives.PRIMARY;
}

function derivePalette(scheme: ThemeScheme, source: ThemeSource) {
  const light = scheme === 'light';
  const defaultPrimary = isDefaultPrimary(source.primary);
  const primaryDark = defaultPrimary ? primitives.PRIMARY_DARK : mix(source.primary, primitives.BLACK, 0.45);
  const primaryLight = defaultPrimary ? primitives.PRIMARY_LIGHT : mix(source.primary, primitives.WHITE, 0.82);
  const primaryForeground = defaultPrimary
    ? primitives.PRIMARY_FOREGROUND
    : accessibleForeground(source.primary, source.textPrimary);
  const surfaceText = (color: string) => onSurfaceColor(color, source.surface, scheme);
  const subtleText = (color: string) => onMultipleSurfacesColor(color, [
    mix(source.surface, color, 0.20),
    mix(source.surfaceMuted, color, 0.20),
  ]);
  const primaryText = defaultPrimary ? (light ? primitives.PRIMARY_DARK : primitives.PRIMARY) : surfaceText(primaryDark);
  const correctedPrimaryText = surfaceText(primaryText);
  return {
    ...source,
    overlay: light ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.70)',
    lightboxOverlay: 'rgba(0,0,0,0.90)',
    text: source.textPrimary, foreground: source.textPrimary, card: source.surface, cardForeground: source.textPrimary,
    muted: source.surfaceMuted, mutedForeground: source.textMuted, input: source.border, surfaceVariant: source.surfaceMuted,
    tint: source.primary, primaryForeground,
    primaryText: correctedPrimaryText,
    primaryDark, primaryLight,
    secondaryText: surfaceText(source.secondary),
    accentText: subtleText(source.accent),
    secondaryForeground: accessibleForeground(source.secondary, source.textPrimary, primitives.SECONDARY_FOREGROUND),
    accentForeground: accessibleForeground(source.accent, source.textPrimary, primitives.ACCENT_FOREGROUND),
    successForeground: accessibleForeground(source.success, source.textPrimary, primitives.WHITE),
    warningForeground: accessibleForeground(source.warning, source.textPrimary, primitives.WHITE),
    errorForeground: accessibleForeground(source.error, source.textPrimary, primitives.WHITE),
    infoForeground: accessibleForeground(source.info, source.textPrimary, primitives.WHITE),
    destructive: source.error, destructiveForeground: accessibleForeground(source.error, source.textPrimary, primitives.WHITE),
    verified: correctedPrimaryText,
    proCircle: source.accent, proCircleText: subtleText(source.accent), proCircleForeground: accessibleForeground(source.accent, source.textPrimary, primitives.ACCENT_FOREGROUND),
    successText: subtleText(source.success), warningText: subtleText(source.warning),
    errorText: subtleText(source.error), destructiveText: subtleText(source.error), infoText: subtleText(source.info),
    rating: source.warning, ratingText: subtleText(source.warning), ratingForeground: accessibleForeground(source.warning, source.textPrimary, primitives.WHITE),
    accidentStatus: source.error, accidentStatusText: subtleText(source.error), accidentStatusForeground: accessibleForeground(source.error, source.textPrimary, primitives.WHITE),
    notificationBadge: source.error, notificationBadgeForeground: accessibleForeground(source.error, source.textPrimary, primitives.WHITE),
    categoryParts: source.info, categoryPartsForeground: accessibleForeground(source.info, source.textPrimary, primitives.WHITE),
    categoryServices: source.success, categoryServicesForeground: accessibleForeground(source.success, source.textPrimary, primitives.WHITE),
    categoryVehicles: source.warning, categoryVehiclesForeground: accessibleForeground(source.warning, source.textPrimary, primitives.WHITE),
    whatsapp: primitives.WHATSAPP,
    whatsappText: onSurfaceColor(primitives.WHATSAPP, source.surface, scheme),
    google: primitives.GOOGLE, facebook: primitives.FACEBOOK,
  };
}

export type ColorPalette = ReturnType<typeof derivePalette>;
/** Builds a coherent palette so aliases always follow their configurable sources. */
export function buildTheme(scheme: ThemeScheme, overrides: ThemeOverrides = {}): ColorPalette {
  for (const [role, value] of Object.entries(overrides)) {
    if (value !== undefined && !parseHex(value)) {
      throw new Error(`Invalid ${role} theme color "${value}". Use a six-digit hex value such as #26D367.`);
    }
  }
  return derivePalette(scheme, { ...sources[scheme], ...overrides });
}

const colors = { light: buildTheme('light'), dark: buildTheme('dark'), radius: 10 } as const;
export const categoryColors: Record<string, keyof Pick<ColorPalette, 'categoryParts' | 'categoryServices' | 'categoryVehicles'>> = {
  Parts: 'categoryParts', Services: 'categoryServices', 'Car Sales': 'categoryVehicles',
};
export function getCategoryColor(category: string, palette: ColorPalette): string {
  const token = categoryColors[category];
  return token ? palette[token] : palette.primary;
}
export function getCategoryTextColor(category: string, palette: ColorPalette): string {
  const textTokens: Record<string, keyof Pick<ColorPalette, 'infoText' | 'successText' | 'warningText'>> = {
    Parts: 'infoText', Services: 'successText', 'Car Sales': 'warningText',
  };
  return textTokens[category] ? palette[textTokens[category]] : palette.primaryText;
}
export default colors;