import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
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
import { generatePlan } from '../../src/services/plans'
import type { FamilyProfile } from '../../src/types/family'

export default function HomeScreen() {
  const { signOut, user } = useAuthStore()
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'bem-vindo'

  const { data: familyProfile, isLoading } = useQuery<FamilyProfile | null>({
    queryKey: ['family_profile', user?.id],
    queryFn: () => fetchFamilyProfile(user!.id),
    enabled: !!user?.id,
  })

  const hasFamily = !!familyProfile && familyProfile.members.length > 0
  const memberCount = familyProfile?.members.length ?? 0

  const generateMutation = useMutation({
    mutationFn: () => generatePlan(familyProfile!.id),
    onSuccess: (plan) => {
      router.push(`/plan?id=${plan.id}`)
    },
    onError: (err: Error) => {
      if (err.message.includes('Limite semanal')) {
        router.push('/paywall')
        return
      }
      Alert.alert('Erro', err.message ?? 'Não foi possível iniciar a geração. Verifique sua conexão.')
    },
  })

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>

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

        {/* Botão principal — Gerar Cardápio */}
        <View style={styles.generateSection}>
          <Button
            label={generateMutation.isPending ? 'Iniciando...' : 'Gerar cardápio semanal'}
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

        <View style={styles.spacer} />

        <Button label="Sair da conta" onPress={signOut} variant="outline" />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.screen },
  container: {
    flex: 1,
    padding: spacing['6'],
    gap: spacing['5'],
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

  spacer: { flex: 1 },
})
