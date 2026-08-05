import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Feather, MaterialCommunityIcons as MCI } from '@expo/vector-icons'
import { colors } from '../../src/theme/colors'
import { textStyles, fontFamily } from '../../src/theme/typography'
import { spacing, radius, shadow } from '../../src/theme/spacing'
import { Button } from '../../src/components/ui/Button'
import { useAuthStore } from '../../src/store/auth'
import { fetchFamilyProfile } from '../../src/services/family'
import { generatePlan, type PlanPeriod } from '../../src/services/plans'
import type { FamilyProfile } from '../../src/types/family'

const PERIOD_OPTIONS: Array<{ value: PlanPeriod; label: string; premium: boolean }> = [
  { value: 'weekly',   label: 'Semana',  premium: false },
  { value: 'biweekly', label: '15 dias', premium: true },
  { value: 'monthly',  label: 'Mês',     premium: true },
]

export default function HomeScreen() {
  const { signOut, user } = useAuthStore()
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'bem-vindo'
  const isPremium = !!(user?.user_metadata?.is_premium)
  const [selectedPeriod, setSelectedPeriod] = useState<PlanPeriod>('weekly')
  const [includeBreakfast, setIncludeBreakfast] = useState(false)
  const [includeDinner, setIncludeDinner] = useState(false)
  const [includeDessert, setIncludeDessert] = useState(false)

  const { data: familyProfile, isLoading } = useQuery<FamilyProfile | null>({
    queryKey: ['family_profile', user?.id],
    queryFn: () => fetchFamilyProfile(user!.id),
    enabled: !!user?.id,
  })

  const hasFamily = !!familyProfile && familyProfile.members.length > 0
  const memberCount = familyProfile?.members.length ?? 0

  const generateMutation = useMutation({
    mutationFn: () => generatePlan(familyProfile!.id, selectedPeriod, includeBreakfast, includeDinner, includeDessert),
    onSuccess: (plan) => {
      router.push(`/plan?id=${plan.id}`)
    },
    onError: (err: Error) => {
      if (err.message.includes('Limite semanal') || err.message.includes('Premium')) {
        router.push('/paywall')
        return
      }
      Alert.alert('Erro', err.message ?? 'Não foi possível iniciar a geração. Verifique sua conexão.')
    },
  })

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Saudação */}
        <View>
          <Text style={styles.welcome}>Olá, {firstName}!</Text>
          <Text style={styles.subtitle}>
            {hasFamily
              ? 'Pronto para planejar a semana?'
              : 'Configure sua família para começar.'}
          </Text>
        </View>

        {/* Card — Perfil Familiar */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <MCI name="account-group-outline" size={22} color={colors.brand.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Perfil Familiar</Text>
              <Text style={styles.cardSubtitle}>
                {isLoading
                  ? 'Carregando...'
                  : hasFamily
                  ? `${memberCount} ${memberCount === 1 ? 'membro' : 'membros'} configurados`
                  : 'Nenhum membro adicionado'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/family')}
              style={styles.cardAction}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name={hasFamily ? 'edit-2' : 'plus-circle'}
                size={20}
                color={colors.brand.primary}
              />
            </TouchableOpacity>
          </View>

          {hasFamily && (
            <>
              <View style={styles.memberPills}>
                {familyProfile!.members.map((m) => (
                  <View key={m.id} style={styles.memberPill}>
                    <Text style={styles.memberPillText}>{m.name.split(' ')[0]}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.memberMotivation}>Tudo pronto! Gere o cardápio da semana.</Text>
            </>
          )}

          {!hasFamily && !isLoading && (
            <Button
              label="Configurar família"
              variant="outline"
              icon={<Feather name="users" size={16} color={colors.brand.primary} />}
              onPress={() => router.push('/family')}
            />
          )}
        </View>

        {/* Card — Histórico */}
        <TouchableOpacity style={styles.card} onPress={() => router.push('/history')} activeOpacity={0.7}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <MCI name="history" size={22} color={colors.brand.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Histórico</Text>
              <Text style={styles.cardSubtitle}>Ver cardápios gerados anteriormente</Text>
            </View>
            <View style={styles.cardAction}>
              <Feather name="chevron-right" size={20} color={colors.brand.primary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Seletor de período + Botão principal */}
        <View style={styles.generateSection}>
          {isPremium && (
            <View style={styles.periodRow}>
              {PERIOD_OPTIONS.map((opt) => {
                const active = selectedPeriod === opt.value
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.periodOption, active && styles.periodOptionActive]}
                    onPress={() => setSelectedPeriod(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.periodLabel, active && styles.periodLabelActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
          {isPremium && selectedPeriod !== 'weekly' && !!familyProfile?.weekly_budget_brl && (
            <Text style={styles.budgetNote}>
              {selectedPeriod === 'biweekly'
                ? `Orçamento: R$ ${familyProfile.weekly_budget_brl.toFixed(2).replace('.', ',')} × 2 semanas = R$ ${(familyProfile.weekly_budget_brl * 2).toFixed(2).replace('.', ',')}`
                : `Orçamento: R$ ${familyProfile.weekly_budget_brl.toFixed(2).replace('.', ',')} × 4 semanas = R$ ${(familyProfile.weekly_budget_brl * 4).toFixed(2).replace('.', ',')}`}
            </Text>
          )}
          {isPremium && (
            [
              { label: 'Incluir café da manhã', value: includeBreakfast, setter: setIncludeBreakfast },
              { label: 'Incluir janta',         value: includeDinner,    setter: setIncludeDinner },
              { label: 'Incluir sobremesa',      value: includeDessert,   setter: setIncludeDessert },
            ] as Array<{ label: string; value: boolean; setter: (v: boolean) => void }>
          ).map(({ label, value, setter }) => (
            <TouchableOpacity
              key={label}
              style={styles.breakfastToggle}
              onPress={() => setter(!value)}
              activeOpacity={0.7}
            >
              <Text style={styles.breakfastToggleLabel}>{label}</Text>
              <Switch
                value={value}
                onValueChange={setter}
                trackColor={{ false: colors.border.medium, true: colors.brand.primary + '50' }}
                thumbColor={value ? colors.brand.primary : colors.border.medium}
              />
            </TouchableOpacity>
          ))}
          <Button
            label={generateMutation.isPending ? 'Iniciando...' : 'Gerar cardápio'}
            onPress={() => generateMutation.mutate()}
            disabled={!hasFamily || generateMutation.isPending}
          />
          {!hasFamily && (
            <Text style={styles.disabledHint}>
              Configure o perfil familiar para habilitar.
            </Text>
          )}
        </View>

        {/* Como funciona — visível apenas para quem ainda não configurou a família */}
        {!hasFamily && !isLoading && (
          <View style={styles.howCard}>
            <Text style={styles.howTitle}>Como funciona</Text>
            <View style={styles.howRow}>
              {([
                { mciIcon: 'account-group-outline', label: 'Configure\nsua família' },
                { mciIcon: 'lightning-bolt-outline', label: 'Gere\ncom IA' },
                { mciIcon: 'bowl-mix-outline',       label: 'Marmitas\nprontas!' },
              ] as const).map((step, i) => (
                <View key={i} style={styles.howStep}>
                  <View style={styles.howIconWrap}>
                    <MCI name={step.mciIcon} size={24} color={colors.brand.primary} />
                  </View>
                  <Text style={styles.howStepText}>{step.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
      <View style={styles.footer}>
        <Button label="Sair da conta" onPress={signOut} variant="outline" />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.screen },
  container: {
    padding: spacing['6'],
    gap: spacing['5'],
    paddingBottom: spacing['4'],
  },
  footer: {
    paddingHorizontal: spacing['6'],
    paddingVertical: spacing['4'],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.screen,
  },

  welcome: { ...textStyles.h2, color: colors.text.heading },
  subtitle: {
    ...textStyles.body,
    color: colors.text.muted,
    marginTop: spacing['1'],
  },

  card: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing['4'],
    gap: spacing['3'],
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { ...textStyles.h3, color: colors.text.heading },
  cardSubtitle: { ...textStyles.bodySmall, color: colors.text.muted },
  cardAction: { padding: spacing['1'] },

  memberPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['2'],
  },
  memberPill: {
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1'],
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary + '1A',
  },
  memberPillText: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.primary,
  },

  generateSection: { gap: spacing['2'] },
  disabledHint: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
  },
  budgetNote: {
    ...textStyles.caption,
    color: colors.brand.primary,
    textAlign: 'center',
    backgroundColor: colors.brand.primary + '12',
    borderRadius: radius.sm,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
  },

  periodRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.badge,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  periodOption: {
    flex: 1,
    paddingVertical: spacing['2'],
    borderRadius: radius.sm,
    alignItems: 'center',
    gap: 2,
  },
  periodOptionActive: {
    backgroundColor: colors.brand.primary,
  },
  periodLabel: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.muted,
  },
  periodLabelActive: {
    color: colors.text.inverse,
  },
  premiumBadge: {
    fontSize: 8,
    fontFamily: fontFamily.bold,
    color: colors.brand.accent,
    letterSpacing: 0.5,
  },
  premiumBadgeActive: {
    color: colors.text.inverse + 'CC',
  },

  breakfastToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  breakfastToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },
  breakfastToggleLabel: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.body,
  },

  memberMotivation: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: 2,
  },

  howCard: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing['4'],
    gap: spacing['4'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.medium,
  },
  howTitle: {
    ...textStyles.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  howRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  howStep: {
    alignItems: 'center',
    gap: spacing['2'],
    flex: 1,
  },
  howIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howStepText: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 16,
  },

})
