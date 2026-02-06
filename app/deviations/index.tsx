import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Deviation = Database['public']['Tables']['deviations']['Row'] & {
  batch?: { batch_number: string; product_name: string } | null;
};

type FilterStatus = 'all' | 'open' | 'investigating' | 'closed';
type FilterSeverity = 'all' | 'minor' | 'major' | 'critical';

export default function DeviationsScreen() {
  const router = useRouter();
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [filteredDeviations, setFilteredDeviations] = useState<Deviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');

  useEffect(() => {
    fetchDeviations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [deviations, filterStatus, filterSeverity]);

  const fetchDeviations = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('deviations')
        .select(`
          *,
          batch:batches(batch_number, product_name)
        `)
        .order('reported_at', { ascending: false });

      if (error) throw error;

      setDeviations((data as Deviation[]) || []);
    } catch (error) {
      console.error('Error fetching deviations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deviations];

    if (filterStatus !== 'all') {
      filtered = filtered.filter((d) => {
        if (filterStatus === 'open') return d.status === 'open';
        if (filterStatus === 'investigating') return d.status === 'investigating';
        if (filterStatus === 'closed') return d.status === 'closed';
        return true;
      });
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter((d) => d.severity === filterSeverity);
    }

    setFilteredDeviations(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeviations();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return Colors.error;
      case 'major':
        return Colors.warning;
      default:
        return Colors.text.secondary;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'Critique';
      case 'major':
        return 'Majeure';
      default:
        return 'Mineure';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return Colors.error;
      case 'investigating':
        return Colors.warning;
      case 'closed':
        return Colors.success;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Ouverte';
      case 'investigating':
        return 'En investigation';
      case 'closed':
        return 'Clôturée';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Statistics
  const criticalCount = deviations.filter((d) => d.severity === 'critical' && d.status === 'open').length;
  const openCount = deviations.filter((d) => d.status === 'open').length;
  const investigatingCount = deviations.filter((d) => d.status === 'investigating').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestion des Déviations',
          headerBackTitle: 'Retour',
        }}
      />
      <View style={styles.container}>
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderLeftColor: Colors.error }]}>
            <Text style={[styles.statValue, { color: Colors.error }]}>{criticalCount}</Text>
            <Text style={styles.statLabel}>Critiques Ouvertes</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{investigatingCount}</Text>
            <Text style={styles.statLabel}>En Investigation</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{openCount}</Text>
            <Text style={styles.statLabel}>Ouvertes</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            <Text style={styles.filterLabel}>Statut:</Text>
            {(['all', 'open', 'investigating', 'closed'] as FilterStatus[]).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  filterStatus === status && styles.filterChipActive,
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === status && styles.filterChipTextActive,
                  ]}
                >
                  {status === 'all'
                    ? 'Tous'
                    : status === 'open'
                    ? 'Ouvertes'
                    : status === 'investigating'
                    ? 'Investigation'
                    : 'Clôturées'}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.filterDivider} />

            <Text style={styles.filterLabel}>Criticité:</Text>
            {(['all', 'critical', 'major', 'minor'] as FilterSeverity[]).map((severity) => (
              <TouchableOpacity
                key={severity}
                style={[
                  styles.filterChip,
                  filterSeverity === severity && styles.filterChipActive,
                  filterSeverity === severity && {
                    backgroundColor:
                      severity === 'critical'
                        ? Colors.error + '20'
                        : severity === 'major'
                        ? Colors.warning + '20'
                        : severity === 'minor'
                        ? Colors.text.secondary + '20'
                        : Colors.primary + '20',
                  },
                ]}
                onPress={() => setFilterSeverity(severity)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterSeverity === severity && styles.filterChipTextActive,
                  ]}
                >
                  {severity === 'all' ? 'Tous' : getSeverityLabel(severity)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Deviations List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          <Text style={styles.sectionTitle}>
            Déviations ({filteredDeviations.length})
          </Text>

          {filteredDeviations.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={64} color={Colors.success} />
              <Text style={styles.emptyTitle}>Aucune déviation</Text>
              <Text style={styles.emptyText}>
                {filterStatus !== 'all' || filterSeverity !== 'all'
                  ? 'Aucune déviation ne correspond aux filtres'
                  : 'Aucune déviation enregistrée'}
              </Text>
            </Card>
          ) : (
            filteredDeviations.map((deviation) => (
              <TouchableOpacity
                key={deviation.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/deviations/${deviation.id}`)}
              >
                <Card style={styles.deviationCard}>
                  <View style={styles.deviationHeader}>
                    <View style={styles.badges}>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: getSeverityColor(deviation.severity) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            { color: getSeverityColor(deviation.severity) },
                          ]}
                        >
                          {getSeverityLabel(deviation.severity)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(deviation.status) + '15' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(deviation.status) },
                          ]}
                        >
                          {getStatusLabel(deviation.status)}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
                  </View>

                  <Text style={styles.deviationTitle}>{deviation.title}</Text>
                  <Text style={styles.deviationDescription} numberOfLines={2}>
                    {deviation.description}
                  </Text>

                  {deviation.batch && (
                    <View style={styles.batchInfo}>
                      <Ionicons name="cube" size={14} color={Colors.primary} />
                      <Text style={styles.batchText}>
                        Lot {deviation.batch.batch_number} - {deviation.batch.product_name}
                      </Text>
                    </View>
                  )}

                  <View style={styles.deviationFooter}>
                    <Text style={styles.dateText}>
                      Signalée le {formatDate(deviation.reported_at)}
                    </Text>
                    {deviation.assigned_to && (
                      <View style={styles.assignedInfo}>
                        <Ionicons name="person" size={12} color={Colors.text.secondary} />
                        <Text style={styles.assignedText}>{deviation.assigned_to}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    ...Typography.h2,
    marginBottom: 2,
  },
  statLabel: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  filtersContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filtersContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  filterLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginRight: Spacing.xs,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  filterChipText: {
    ...Typography.small,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  deviationCard: {
    marginBottom: Spacing.md,
  },
  deviationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  severityText: {
    ...Typography.small,
    fontWeight: '700',
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
    fontSize: 11,
  },
  deviationTitle: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  deviationDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  batchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  batchText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },
  deviationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  assignedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignedText: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
});
