// Requer: npx expo install @expo-google-fonts/nunito expo-font

export const fontFamily = {
  light:      'Nunito_300Light',
  regular:    'Nunito_400Regular',
  semiBold:   'Nunito_600SemiBold',
  bold:       'Nunito_700Bold',
  extraBold:  'Nunito_800ExtraBold',
} as const

export const fontSize = {
  xs:   10,
  sm:   12,
  base: 14,
  md:   16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
} as const

export const lineHeight = {
  tight:   1.2,
  normal:  1.5,
  relaxed: 1.75,
} as const

// ── Estilos de texto pré-compostos ───────────────────────────────────────
// Usar diretamente em StyleSheet.create() ou como base para NativeWind

export const textStyles = {
  appName: {
    fontFamily:  fontFamily.semiBold,
    fontSize:    fontSize['2xl'],
    lineHeight:  fontSize['2xl'] * lineHeight.tight,
    letterSpacing: 0.5,
  },
  slogan: {
    fontFamily:  fontFamily.regular,
    fontSize:    fontSize.sm,
    lineHeight:  fontSize.sm * lineHeight.relaxed,
    letterSpacing: 0.2,
  },
  h1: {
    fontFamily:  fontFamily.bold,
    fontSize:    fontSize['2xl'],
    lineHeight:  fontSize['2xl'] * lineHeight.tight,
  },
  h2: {
    fontFamily:  fontFamily.semiBold,
    fontSize:    fontSize.xl,
    lineHeight:  fontSize.xl * lineHeight.tight,
  },
  h3: {
    fontFamily:  fontFamily.semiBold,
    fontSize:    fontSize.lg,
    lineHeight:  fontSize.lg * lineHeight.normal,
  },
  body: {
    fontFamily:  fontFamily.regular,
    fontSize:    fontSize.base,
    lineHeight:  fontSize.base * lineHeight.normal,
  },
  bodySmall: {
    fontFamily:  fontFamily.regular,
    fontSize:    fontSize.sm,
    lineHeight:  fontSize.sm * lineHeight.normal,
  },
  label: {
    fontFamily:  fontFamily.semiBold,
    fontSize:    fontSize.sm,
    lineHeight:  fontSize.sm * lineHeight.tight,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontFamily:  fontFamily.bold,
    fontSize:    fontSize.md,
    lineHeight:  fontSize.md * lineHeight.tight,
    letterSpacing: 0.3,
  },
  caption: {
    fontFamily:  fontFamily.light,
    fontSize:    fontSize.xs,
    lineHeight:  fontSize.xs * lineHeight.relaxed,
  },
} as const
