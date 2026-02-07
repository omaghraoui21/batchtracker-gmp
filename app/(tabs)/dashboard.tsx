import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/SkeletonLoader';
import { DebugAuthInfo } from '@/components/DebugAuthInfo';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Database } from '@/lib/database.types';

type Batch = Database['public']['Tables']['batches']['Row'] & {
  current_step?: {
    step_definition?: Database['public']['Tables']['step_definitions']['Row'];
  };
};

interface DashboardStats {
  averageLatency: number;
  criticalDeviations: number;
  activeBatches: number;
  recentBatches: Batch[];
}

/**
 * Dashboard Skeleton - KPI cards and recent lots skeleton placeholders
 * Maintains the Slate & Steel / industrial aesthetic during loading.
 */
function DashboardSkeleton() {
  return (
    <View>
      {/* Header skeleton */}
      <View style={styles.header}>
        <View>
          <Skeleton width={80} height={14} />
          <Skeleton width={160} height={26} style={{ marginTop: Spacing.xs }} />
          <Skeleton width={100} height={14} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={48} height={48} borderRadius={BorderRadius.full} />
      </View>

      {/* KPI Section skeleton */}
      <View style={styles.section}>
        <Skeleton width={160} height={22} style={{ marginBottom: Spacing.md }} />

        {/* KPI Card 1 */}
        <Card style={styles.kpiCard}>
          <Skeleton
            width={48}
            height={48}
            borderRadius={BorderRadius.sm}
            style={{ marginRight: Spacing.md }}
          />
          <View style={styles.kpiContent}>
            <Skeleton width="70%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={24} />
          </View>
        </Card>

        {/* KPI Card 2 */}
        <Card style={{ ...styles.kpiCard, borderLeftWidth: 4, borderLeftColor: Colors.border }}>
          <Skeleton
            width={48}
            height={48}
            borderRadius={BorderRadius.sm}
            style={{ marginRight: Spacing.md }}
          />
          <View style={styles.kpiContent}>
            <Skeleton width="70%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="50%" height={24} />
          </View>
        </Card>

        {/* KPI Card 3 */}
        <Card style={styles.kpiCard}>
          <Skeleton
            width={48}
            height={48}
            borderRadius={BorderRadius.sm}
            style={{ marginRight: Spacing.md }}
          />
          <View style={styles.kpiContent}>
            <Skeleton width="60%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="35%" height={24} />
          </View>
        </Card>
      </View>

      {/* Recent Lots Section skeleton */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Skeleton width={130} height={22} />
          <Skeleton width={60} height={14} />
        </View>

        {/* Batch card skeletons */}
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} style={styles.batchCard}>
            <View style={styles.batchHeader}>
              <Skeleton width="60%" height={18} />
              <Skeleton width={70} height={24} borderRadius={BorderRadius.sm} />
            </View>
            <Skeleton width="40%" height={14} style={{ marginTop: Spacing.xs }} />
          </Card>
        ))}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showError } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    averageLatency: 0,
    criticalDeviations: 0,
    activeBatches: 0,
    recentBatches: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }

      // Fetch active batches count
      const { count: activeBatchesCount, error: batchesError } = await supabase
        .from('batches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (batchesError) throw batchesError;

      // Fetch critical deviations count
      const { count: deviationsCount, error: deviationsError } = await supabase
        .from('deviations')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .eq('status', 'open');

      if (deviationsError) throw deviationsError;

      // Fetch recent batches
      const { data: recentBatchesData, error: recentBatchesError } = await supabase
        .from('batches')
        .select(`
          *,
          current_step:step_instances!fk_current_step(
            *,
            step_definition:step_definitions(*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentBatchesError) throw recentBatchesError;

      // Calculate average latency (simplified - time from creation to current step)
      let totalLatency = 0;
      let latencyCount = 0;

      const { data: completedSteps, error: stepsError } = await supabase
        .from('step_instances')
        .select('started_at, completed_at')
        .not('completed_at', 'is', null)
        .not('started_at', 'is', null)
        .limit(10);

      if (stepsError) {
        showError(
          'Erreur de chargement',
          'Impossible de calculer la latence moyenne des etapes.'
        );
      }

      if (!stepsError && completedSteps) {
        completedSteps.forEach((step) => {
          if (step.started_at && step.completed_at) {
            const start = new Date(step.started_at).getTime();
            const end = new Date(step.completed_at).getTime();
            totalLatency += (end - start) / (1000 * 60 * 60); // Convert to hours
            latencyCount++;
          }
        });
      }

      const averageLatency = latencyCount > 0 ? totalLatency / latencyCount : 2.5;

      setStats({
        averageLatency: Math.round(averageLatency * 10) / 10,
        criticalDeviations: deviationsCount || 0,
        activeBatches: activeBatchesCount || 0,
        recentBatches: (recentBatchesData as Batch[]) || [],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
      showError(
        'Erreur du tableau de bord',
        `Impossible de charger les donnees: ${errorMessage}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'completed':
        return Colors.success;
      case 'blocked':
        return Colors.error;
      default:
        return Colors.warning;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'En cours';
      case 'completed':
        return 'Termine';
      case 'blocked':
        return 'Bloque';
      default:
        return status;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Debug Information - Only visible in development */}
      <DebugAuthInfo visible={__DEV__} />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* En-tete utilisateur */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bonjour,</Text>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userRole}>{user?.role}</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Cartes KPI */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Indicateurs Cles</Text>

            <Card style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="time-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiLabel}>Latence Moyenne (Verif.)</Text>
                <Text style={styles.kpiValue}>{stats.averageLatency}h</Text>
              </View>
            </Card>

            <Card style={styles.warningCard}>
              <View style={styles.warningIcon}>
                <Ionicons name="warning-outline" size={24} color={Colors.error} />
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiLabel}>Deviations Critiques</Text>
                <Text style={styles.warningValue}>{stats.criticalDeviations} Ouvertes</Text>
              </View>
            </Card>

            <Card style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="layers-outline" size={24} color={Colors.success} />
              </View>
              <View style={styles.kpiContent}>
                <Text style={styles.kpiLabel}>Lots en Cours</Text>
                <Text style={styles.kpiValue}>{stats.activeBatches} Actifs</Text>
              </View>
            </Card>
          </View>

          {/* Lots recents */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lots Recents</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/batches')}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {stats.recentBatches.length === 0 && (
              <Card style={styles.batchCard}>
                <Text style={styles.emptyText}>Aucun lot recent a afficher.</Text>
              </Card>
            )}

            {stats.recentBatches.map((batch) => (
              <TouchableOpacity
                key={batch.id}
                onPress={() => router.push(`/batch/${batch.id}`)}
              >
                <Card style={styles.batchCard}>
                  <View style={styles.batchHeader}>
                    <Text style={styles.batchNumber}>
                      Lot #{batch.batch_number} - {batch.product_name}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(batch.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(batch.status) },
                        ]}
                      >
                        {getStatusLabel(batch.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.batchStage}>
                    ({batch.current_step?.step_definition?.name || 'En attente'})
                  </Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Floating Quick Scan Button */}
      <TouchableOpacity
        style={[styles.quickScanFab, { bottom: Spacing.xl + insets.bottom }]}
        onPress={() => router.push('/(tabs)/scanner')}
        activeOpacity={0.8}
      >
        <Ionicons name="scan" size={28} color={Colors.surface} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  userName: {
    ...Typography.h2,
    marginTop: Spacing.xs,
  },
  userRole: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  warningIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  kpiContent: {
    flex: 1,
  },
  kpiLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  kpiValue: {
    ...Typography.h3,
    fontSize: 22,
  },
  warningValue: {
    ...Typography.h3,
    fontSize: 22,
    color: Colors.error,
  },
  batchCard: {
    marginBottom: Spacing.sm,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  batchNumber: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  batchStage: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  quickScanFab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
