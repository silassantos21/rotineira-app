import React, { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Stack, router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Feather, MaterialCommunityIcons as MCI } from '@expo/vector-icons'
import { colors } from '../../src/theme/colors'
import { textStyles, fontFamily } from '../../src/theme/typography'
import { spacing, radius, shadow } from '../../src/theme/spacing'
import { listPlans } from '../../src/services/plans'
import type { WeeklyPlan } from '../../src/types/plans'

const PERIOD_LABEL: Record<string, string> = {
  weekly:   'Semana',
  biweekly: 'Quinzena',
  monthly:  'Mês',
}

const PERIOD_ICON: Record<string, string> = {
  weekly:   'calendar-week-outline',
  biweekly: 'calendar-range-outline',
  monthly:  'calendar-month-outline',
}

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

function formatCreatedAt(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `Gerado em ${day} às ${time}`
}

export default function HistoryScreen() {
  const queryClient = useQueryClient()
  const { data: plans, isLoading } = useQuery<WeeklyPlan[]>({
    queryKey: ['plans'],
    queryFn: listPlans,
  })

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
    }, [queryClient])
  )

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
            <MCI name="history" size={32} color={colors.brand.secondary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum plano gerado ainda</Text>
          <Text style={styles.emptySubtitle}>
            Gere seu primeiro cardápio na tela inicial.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {(() => {
            const adaptedParentIds = new Set(
              plans.filter((p) => p.parent_plan_id).map((p) => p.parent_plan_id!)
            )
            const visible = plans.filter((p) => !adaptedParentIds.has(p.id))
            return (
              <>
                <Text style={styles.countLabel}>
                  {visible.length} {visible.length === 1 ? 'plano gerado' : 'planos gerados'}
                </Text>
                {visible.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </>
            )
          })()}
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
  const periodLabel = PERIOD_LABEL[plan.period ?? 'weekly'] ?? 'Semana'
  const periodIcon = PERIOD_ICON[plan.period ?? 'weekly'] ?? 'calendar-week-outline'

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => canView && router.push(`/plan?id=${plan.id}`)}
      activeOpacity={canView ? 0.7 : 1}
    >
      <View style={[styles.cardIconWrap, { backgroundColor: color + '1A' }]}>
        <MCI name={periodIcon as any} size={20} color={color} />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardDate}>{periodLabel} de {formatWeekStart(plan.week_start)}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.badge, { backgroundColor: color + '1A' }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
          {plan.parent_plan_id && (
            <View style={styles.adaptedBadge}>
              <Feather name="refresh-cw" size={10} color={colors.brand.secondary} />
              <Text style={styles.adaptedBadgeText}>Adaptado</Text>
            </View>
          )}
          {mealCount > 0 && (
            <Text style={styles.mealCount}>{mealCount} refeições</Text>
          )}
        </View>
        {plan.created_at && (
          <Text style={styles.createdAt}>{formatCreatedAt(plan.created_at)}</Text>
        )}
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
  adaptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.brand.secondary + '1A',
  },
  adaptedBadgeText: {
    ...textStyles.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.brand.secondary,
  },
  createdAt: { ...textStyles.caption, color: colors.text.muted, marginTop: 2 },
  errorMsg:  { ...textStyles.caption, color: colors.status.error },
})
