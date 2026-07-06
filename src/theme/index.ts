export { colors } from './colors'
export { fontFamily, fontSize, lineHeight, textStyles } from './typography'
export { spacing, radius, shadow } from './spacing'

// Token unificado — importar quando precisar de tudo de uma vez
import { colors } from './colors'
import { fontFamily, fontSize, lineHeight, textStyles } from './typography'
import { spacing, radius, shadow } from './spacing'

export const theme = {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  textStyles,
  spacing,
  radius,
  shadow,
} as const

export type Theme = typeof theme
