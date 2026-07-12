import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Feather, MaterialCommunityIcons as MCI } from '@expo/vector-icons'
import { colors } from '../src/theme/colors'
import { textStyles, fontFamily } from '../src/theme/typography'
import { spacing, radius } from '../src/theme/spacing'

export const ONBOARDING_KEY = 'rotineira_onboarding_v1'

const slides = [
  {
    mciIcon: 'bowl-mix-outline' as const,
    iconColor: colors.brand.accent,
    title: 'Bem-vindo ao\nRotineira',
    subtitle:
      'Planejamento de marmitas semanal com inteligência artificial. Sem complicação, sem desperdício.',
    features: [] as string[],
  },
  {
    mciIcon: 'account-group-outline' as const,
    iconColor: colors.brand.primary,
    title: 'Sua família,\nseu cardápio',
    subtitle:
      'Cadastre cada membro com apetite e restrições. A IA calcula as porções exatas para cada um.',
    features: ['Apetite personalizado', 'Restrições alimentares'],
  },
  {
    mciIcon: 'lightning-bolt-outline' as const,
    iconColor: colors.brand.secondary,
    title: 'Cardápio pronto\nem segundos',
    subtitle:
      'Lista de compras consolidada, guia de montagem com gramagens detalhadas. Tudo em um toque.',
    features: ['Lista de compras', 'Guia de montagem'],
  },
]

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0)
  const slide = slides[current]
  const isLast = current === slides.length - 1

  async function handleComplete() {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1')
    router.replace('/(app)')
  }

  function handleNext() {
    if (isLast) {
      handleComplete()
    } else {
      setCurrent((c) => c + 1)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Pular */}
        <View style={styles.topRow}>
          {!isLast ? (
            <TouchableOpacity onPress={handleComplete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.skipText}>Pular</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
        </View>

        {/* Conteúdo do slide */}
        <View style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: slide.iconColor + '18' }]}>
            <MCI name={slide.mciIcon} size={48} color={slide.iconColor} />
          </View>

          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>

          {slide.features.length > 0 && (
            <View style={styles.features}>
              {slide.features.map((f) => (
                <View key={f} style={styles.featurePill}>
                  <Feather name="check" size={13} color={colors.brand.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Dots + botão */}
        <View style={styles.bottom}>
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === current && styles.dotActive]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextButtonText}>{isLast ? 'Começar' : 'Próximo'}</Text>
            <Feather
              name={isLast ? 'arrow-right' : 'chevron-right'}
              size={18}
              color={colors.text.inverse}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing['8'],
    paddingBottom: spacing['6'],
  },
  topRow: {
    alignItems: 'flex-end',
    paddingTop: spacing['4'],
    minHeight: 40,
  },
  skipText: {
    ...textStyles.body,
    color: colors.text.muted,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['6'],
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2'],
  },
  title: {
    ...textStyles.h1,
    fontFamily: fontFamily.semiBold,
    color: colors.text.heading,
    textAlign: 'center',
    lineHeight: 38,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    gap: spacing['3'],
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['1'],
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primary + '40',
    backgroundColor: colors.brand.primary + '0A',
  },
  featureText: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },

  bottom: {
    gap: spacing['5'],
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing['2'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.medium,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.brand.primary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    backgroundColor: colors.brand.accent,
    paddingVertical: spacing['4'],
    paddingHorizontal: spacing['8'],
    borderRadius: radius.full,
    width: '100%',
  },
  nextButtonText: {
    ...textStyles.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
  },
})
