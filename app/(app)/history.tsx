import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { colors } from '../../src/theme/colors'
import { textStyles, fontFamily } from '../../src/theme/typography'
import { spacing, radius, shadow } from '../../src/theme/spacing'
import { listPlans } from '../../src/services/plans'
import type { WeeklyPlan } from '../../src/types/plans'

const STATUS_LABEL: Record<string, string> = {
  done:       'Concluído',
  processing: 'Processando',
  pending:    'Aguardando',
  error:      'Erro',
}

const STATUS_COLOR: Record<string, string> = {
  done:       colors.status.success,
  processing: colors.brand.primary,
  pending:    colors.text.muted,
  error:      colors.status.error,
}

function formatWeekStart(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function HistoryScreen() {
  const { data: plans, isLoading } = useQuery<WeeklyPlan[]>({
    queryKey: ['plans'],
    queryFn: listPlans,
  })

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: 'Histórico',
          headerTitleStyle: { ...textStyles.h3, color: colors.text.inverse } as any,
          headerBackTitle: '',
        }}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : !plans?.length ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Feather name="clock" size={32} color={colors.brand.secondary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum plano gerado ainda</Text>
          <Text style={styles.emptySubtitle}>
            Gere seu primeiro cardápio semanal na tela inicial.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.countLabel}>
            {plans.length} {plans.length === 1 ? 'plano gerado' : 'planos gerados'}
          </Text>
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function PlanCard({ plan }: { plan: WeeklyPlan }) {
  const color = STATUS_COLOR[plan.status] ?? colors.text.muted
  const label = STATUS_LABEL[plan.status] ?? plan.status
  const mealCount = plan.meals?.length ?? 0
  const canView = plan.status === 'done'

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => canView && router.push(`/plan?id=${plan.id}`)}
      activeOpacity={canView ? 0.7 : 1}
    >
      <View style={[styles.cardIconWrap, { backgroundColor: color + '1A' }]}>
        <Feather name="calendar" size={20} color={color} />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardDate}>Semana de {formatWeekStart(plan.week_start)}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.badge, { backgroundColor: color + '1A' }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
          {mealCount > 0 && (
            <Text style={styles.mealCount}>{mealCount} refeições</Text>
          )}
        </View>
        {plan.status === 'error' && plan.error_message && (
          <Text style={styles.errorMsg} numberOfLines={2}>{plan.error_message}</Text>
        )}
      </View>

      {canView && (
        <Feather name="chevron-right" size={20} color={colors.text.muted} />
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background.screen },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['4'],
    padding: spacing['6'],
  },
  scroll: { padding: spacing['6'], gap: spacing['4'] },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...textStyles.h3,
    color: colors.text.heading,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...textStyles.body,
    color: colors.text.muted,
    textAlign: 'center',
  },

  countLabel: { ...textStyles.label, color: colors.text.muted },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    backgroundColor: colors.background.card,
    borderRadius: radius.md,
    padding: spacing['4'],
    ...shadow.card,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: spacing['1'] },
  cardDate: { ...textStyles.h3, color: colors.text.heading },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  badge: {
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: { ...textStyles.caption, fontFamily: fontFamily.semiBold },
  mealCount: { ...textStyles.caption, color: colors.text.muted },
  errorMsg:  { ...textStyles.caption, color: colors.status.error },
})
