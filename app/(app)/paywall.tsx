import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, MaterialCommunityIcons as MCI } from '@expo/vector-icons'
import { colors } from '../../src/theme/colors'
import { textStyles, fontFamily } from '../../src/theme/typography'
import { spacing, radius, shadow } from '../../src/theme/spacing'
import { Button } from '../../src/components/ui/Button'
import { getCurrentOffering, purchasePackage, restorePurchases } from '../../src/services/revenue'
import { isExpoGo } from '../../src/services/notifications'
import { useSubscriptionStore } from '../../src/store/subscription'
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../../src/lib/legal'
import type { PurchasesPackage } from 'react-native-purchases'

type MCIName = React.ComponentProps<typeof MCI>['name']

interface Feature {
  mciIcon: MCIName
  title: string
  subtitle: string
  freeValue: string
}

const FEATURES: Feature[] = [
  {
    mciIcon: 'calendar-week-outline',
    title: 'Gerações semanais',
    subtitle: 'Crie novos cardápios quando quiser',
    freeValue: '1 por semana',
  },
  {
    mciIcon: 'account-group-outline',
    title: 'Membros da família',
    subtitle: 'Porções individualizadas para cada um',
    freeValue: 'Até 3 membros',
  },
  {
    mciIcon: 'history',
    title: 'Histórico de planos',
    subtitle: 'Acesse todos os cardápios anteriores',
    freeValue: 'Últimos 5 planos',
  },
  {
    mciIcon: 'lightning-bolt-outline',
    title: 'Adaptação com IA',
    subtitle: 'Ajuste o cardápio com feedback personalizado',
    freeValue: 'Não incluído',
  },
]

export default function PaywallScreen() {
  const [offering, setOffering] = useState<Awaited<ReturnType<typeof getCurrentOffering>>>(null)
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null)
  const [isLoadingOffering, setIsLoadingOffering] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const { refresh } = useSubscriptionStore()

  useEffect(() => {
    getCurrentOffering()
      .then((o) => {
        setOffering(o)
        if (o?.availablePackages?.length) setSelectedPkg(o.availablePackages[0])
      })
      .finally(() => setIsLoadingOffering(false))
  }, [])

  async function handlePurchase() {
    if (!selectedPkg) return
    setIsPurchasing(true)
    try {
      await purchasePackage(selectedPkg)
      await refresh()
      Alert.alert('Premium ativo!', 'Seu plano Premium foi ativado com sucesso.', [
        { text: 'Ótimo!', onPress: () => router.back() },
      ])
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert('Erro', 'Não foi possível concluir a compra. Tente novamente.')
      }
    } finally {
      setIsPurchasing(false)
    }
  }

  async function handleRestore() {
    if (isExpoGo) {
      Alert.alert('Preview', 'Restauração de compras disponível apenas na versão publicada do app.')
      return
    }
    setIsRestoring(true)
    try {
      await restorePurchases()
      await refresh()
      const store = useSubscriptionStore.getState()
      if (store.isPremium) {
        Alert.alert('Restaurado!', 'Sua assinatura foi restaurada com sucesso.', [
          { text: 'Ok', onPress: () => router.back() },
        ])
      } else {
        Alert.alert('Nenhuma assinatura encontrada', 'Não encontramos nenhuma compra anterior para restaurar.')
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível restaurar as compras.')
    } finally {
      setIsRestoring(false)
    }
  }

  const packages = offering?.availablePackages ?? []
  const hasOffering = packages.length > 0

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: 'Premium',
          headerTitleStyle: { ...textStyles.h3, color: colors.text.inverse } as any,
          headerBackTitle: '',
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MCI name="lightning-bolt-outline" size={32} color={colors.text.inverse} />
          </View>
          <Text style={styles.heroTitle}>ROTINEIRA PREMIUM</Text>
          <Text style={styles.heroSub}>
            Planejamento sem limites para toda a família.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          <View style={styles.featuresHeader}>
            <View style={styles.featuresHeaderSpacer} />
            <Text style={styles.colLabelFree}>Grátis</Text>
            <View style={styles.colPremiumHeader}>
              <Text style={styles.colLabelPremium}>Premium</Text>
            </View>
          </View>

          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureRowBorder]}>
              <View style={styles.featureInfo}>
                <View style={styles.featureIconWrap}>
                  <MCI name={f.mciIcon} size={18} color={colors.brand.primary} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureSubtitle}>{f.subtitle}</Text>
                </View>
              </View>
              <Text style={styles.freeValue}>{f.freeValue}</Text>
              <View style={styles.premiumValue}>
                <Feather name="check" size={16} color={colors.brand.primary} />
              </View>
            </View>
          ))}
        </View>

        {/* Seletor de pacote */}
        {isLoadingOffering ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.brand.primary} />
            <Text style={styles.loadingText}>Carregando planos...</Text>
          </View>
        ) : hasOffering ? (
          <View style={styles.packagesSection}>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.packageCard,
                  selectedPkg?.identifier === pkg.identifier && styles.packageCardSelected,
                ]}
                onPress={() => setSelectedPkg(pkg)}
                activeOpacity={0.8}
              >
                <View style={styles.packageInfo}>
                  <Text style={styles.packageTitle}>{pkg.product.title || pkg.packageType}</Text>
                  <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                </View>
                {selectedPkg?.identifier === pkg.identifier && (
                  <View style={styles.packageCheck}>
                    <Feather name="check-circle" size={20} color={colors.brand.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* CTA */}
        <View style={styles.ctaSection}>
          {!isLoadingOffering && hasOffering && (
            <Button
              label={isPurchasing ? 'Processando...' : 'Assinar Premium'}
              onPress={handlePurchase}
              disabled={!selectedPkg || isPurchasing || isRestoring}
            />
          )}
          <TouchableOpacity
            onPress={handleRestore}
            disabled={isRestoring || isPurchasing}
            style={styles.restoreButton}
            activeOpacity={0.7}
          >
            <Text style={styles.restoreText}>
              {isRestoring ? 'Restaurando...' : 'Já sou assinante — Restaurar compra'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.legalText}>
            A assinatura é renovada automaticamente. Cancele quando quiser pela loja de apps.
          </Text>
          <View style={styles.legalLinksRow}>
            <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              Política de Privacidade
            </Text>
            <Text style={styles.legalDivider}>·</Text>
            <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
              Termos de Uso
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.screen },
  scroll: { padding: spacing['6'], gap: spacing['5'], paddingBottom: spacing['10'] },

  // Hero
  hero: {
    alignItems: 'center',
    gap: spacing['3'],
    paddingVertical: spacing['4'],
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    ...textStyles.h2,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
    letterSpacing: 2,
  },
  heroSub: {
    ...textStyles.body,
    color: colors.text.muted,
    textAlign: 'center',
  },

  // Features card
  featuresCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing['3'],
    paddingHorizontal: spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.card,
  },
  featuresHeaderSpacer: { flex: 1 },
  colLabelFree: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 80,
    textAlign: 'center',
  },
  colPremiumHeader: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  colLabelPremium: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing['3'],
    paddingHorizontal: spacing['4'],
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  featureInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: { flex: 1 },
  featureTitle: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.heading,
  },
  featureSubtitle: {
    ...textStyles.caption,
    color: colors.text.muted,
    lineHeight: 14,
  },
  freeValue: {
    ...textStyles.caption,
    color: colors.text.muted,
    width: 80,
    textAlign: 'center',
  },
  premiumValue: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Packages
  packagesSection: { gap: spacing['3'] },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: radius.md,
    padding: spacing['4'],
    borderWidth: 1.5,
    borderColor: colors.border.medium,
    ...shadow.card,
  },
  packageCardSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary + '08',
  },
  packageInfo: { gap: 2 },
  packageTitle: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.heading,
  },
  packagePrice: {
    ...textStyles.body,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.accent,
  },
  packageCheck: { padding: spacing['1'] },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['3'],
    paddingVertical: spacing['4'],
  },
  loadingText: { ...textStyles.body, color: colors.text.muted },

  // CTA
  ctaSection: {
    gap: spacing['3'],
    alignItems: 'center',
  },
  restoreButton: { paddingVertical: spacing['2'] },
  restoreText: {
    ...textStyles.bodySmall,
    color: colors.brand.primary,
    textDecorationLine: 'underline',
  },
  legalText: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing['2'],
  },
  legalLink: {
    ...textStyles.caption,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
  legalDivider: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
})
