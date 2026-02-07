/**
 * Enhanced Batches Screen - Phase 8
 *
 * Professional Track & Trace batch list with:
 * - Color-coded status badges (Cobalt, Emerald, Amber, Ruby)
 * - Assignee initials
 * - Priority icons
 * - SLA timers
 * - Pagination (20 items per page)
 * - Search debouncing (500ms)
 * - Skeleton loaders
 * - Stale-while-revalidate caching
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { BatchListSkeleton } from '@/components/SkeletonLoader';
import type { Database } from '@/lib/database.types';

type Batch = Database['public']['Tables']['batches']['Row'] & {
  current_step?: Database['public']['Tables']['step_instances']['Row'] & {
    step_definition?: Database['public']['Tables']['step_definitions']['Row'];
  };
  critical_deviations_count?: number;
};

const ITEMS_PER_PAGE = 20;

export default function BatchesScreenEnhanced() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [cachedBatches, setCachedBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query
  useEffect(() => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBatches = async () => {
    try {
      // Show cached data immediately (stale-while-revalidate)
      if (cachedBatches.length > 0 && !refreshing) {
        setBatches(cachedBatches);
        setLoading(false);
      }

      // Fetch batches with current step info
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select(`
          *,
          current_step:step_instances!fk_current_step(
            *,
            step_definition:step_definitions(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (batchesError) throw batchesError;

      // Fetch critical deviations count for each batch
      const { data: deviationsData, error: deviationsError } = await supabase
        .from('deviations')
        .select('batch_id')
        .eq('severity', 'critical')
        .eq('status', 'open');

      if (deviationsError) throw deviationsError;

      // Count deviations per batch
      const deviationsCount: Record<string, number> = {};
      deviationsData?.forEach((dev) => {
        if (dev.batch_id) {
          deviationsCount[dev.batch_id] = (deviationsCount[dev.batch_id] || 0) + 1;
        }
      });

      // Add deviation count to batches
      const batchesWithDeviations = batchesData?.map((batch) => ({
        ...batch,
        critical_deviations_count: deviationsCount[batch.id] || 0,
      })) || [];

      setBatches(batchesWithDeviations as Batch[]);
      setCachedBatches(batchesWithDeviations as Batch[]);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatches();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return Colors.status.inProgress;
      case 'completed':
        return Colors.status.completed;
      case 'cancelled':
        return Colors.text.tertiary;
      case 'blocked':
        return Colors.status.blocked;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'En cours';
      case 'completed':
        return 'Validé';
      case 'cancelled':
        return 'Annulé';
      case 'blocked':
        return 'Bloqué';
      default:
        return status;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'flag';
      case 'normal':
        return 'flag-outline';
      default:
        return 'flag-outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return Colors.priority.critical;
      case 'normal':
        return Colors.priority.normal;
      default:
        return Colors.text.tertiary;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Urgent';
      case 'normal':
        return 'Normal';
      case 'low':
        return 'Basse';
      default:
        return priority;
    }
  };

  const calculateSLATimer = (batch: Batch): string => {
    if (!batch.current_step?.sla_deadline) return 'N/A';

    const now = new Date();
    const deadline = new Date(batch.current_step.sla_deadline);
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      return `Retard: ${Math.abs(diffHours)}h`;
    }

    if (diffDays > 0) {
      return `${diffDays}j restant`;
    }

    return `${diffHours}h restantes`;
  };

  const getSLAColor = (batch: Batch): string => {
    if (!batch.current_step?.sla_deadline) return Colors.text.secondary;

    const now = new Date();
    const deadline = new Date(batch.current_step.sla_deadline);
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMs < 0) return Colors.status.alert;
    if (diffHours < 24) return Colors.status.pending;
    return Colors.status.validated;
  };

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const filteredBatches = batches.filter(
    (batch) =>
      batch.batch_number.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      batch.product_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredBatches.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedBatches = filteredBatches.slice(startIndex, endIndex);

  const activeBatchesCount = batches.filter((b) => b.status === 'active').length;
  const priorityBatchesCount = batches.filter((b) => b.priority === 'high').length;
  const monthlyBatchesCount = batches.length;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un lot..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Enhanced Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderLeftColor: Colors.status.inProgress }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="play-circle" size={24} color={Colors.status.inProgress} />
            </View>
            <Text style={[styles.statValue, { color: Colors.status.inProgress }]}>{activeBatchesCount}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.priority.critical }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="flag" size={24} color={Colors.priority.critical} />
            </View>
            <Text style={[styles.statValue, { color: Colors.priority.critical }]}>{priorityBatchesCount}</Text>
            <Text style={styles.statLabel}>Prioritaires</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.status.validated }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar" size={24} color={Colors.status.validated} />
            </View>
            <Text style={[styles.statValue, { color: Colors.status.validated }]}>{monthlyBatchesCount}</Text>
            <Text style={styles.statLabel}>Ce mois</Text>
          </View>
        </View>

        {/* Enhanced Batch List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Tous les Lots ({filteredBatches.length})
            </Text>
            {totalPages > 1 && (
              <Text style={styles.pageInfo}>
                Page {currentPage} / {totalPages}
              </Text>
            )}
          </View>

          {loading && !cachedBatches.length ? (
            <BatchListSkeleton count={5} />
          ) : (
            paginatedBatches.map((batch) => (
              <TouchableOpacity
                key={batch.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/batch/${batch.id}`)}
              >
                <Card style={styles.batchCard}>
                  {/* Header with Batch Number, Priority, and Alerts */}
                  <View style={styles.batchHeader}>
                    <View style={styles.batchTitleRow}>
                      <Text style={styles.batchNumber}>Lot #{batch.batch_number}</Text>
                      <View style={styles.badgeRow}>
                        {batch.priority === 'high' && (
                          <View style={[styles.priorityBadge, { backgroundColor: Colors.priority.critical + '20' }]}>
                            <Ionicons name={getPriorityIcon(batch.priority)} size={12} color={Colors.priority.critical} />
                            <Text style={[styles.priorityText, { color: Colors.priority.critical }]}>Urgent</Text>
                          </View>
                        )}
                        {batch.critical_deviations_count && batch.critical_deviations_count > 0 && (
                          <View style={styles.alertBadge}>
                            <Ionicons name="warning" size={12} color={Colors.surface} />
                            <Text style={styles.alertText}>{batch.critical_deviations_count}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: getStatusColor(batch.status) },
                      ]}
                    />
                  </View>

                  {/* Product Name */}
                  <Text style={styles.batchProduct}>{batch.product_name}</Text>

                  {/* Status Badge and Current Step */}
                  <View style={styles.batchMeta}>
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
                    <Text style={styles.stepText}>
                      {batch.current_step?.step_definition?.name || 'N/A'}
                    </Text>
                  </View>

                  {/* Assignee and SLA Timer */}
                  <View style={styles.batchFooter}>
                    {batch.current_step?.assigned_to && (
                      <View style={styles.assigneeContainer}>
                        <View style={styles.assigneeAvatar}>
                          <Text style={styles.assigneeInitials}>
                            {getInitials(batch.current_step.assigned_to)}
                          </Text>
                        </View>
                        <Text style={styles.assigneeText} numberOfLines={1}>
                          {batch.current_step.assigned_to}
                        </Text>
                      </View>
                    )}
                    {batch.current_step?.sla_deadline && (
                      <View style={[styles.slaTimer, { borderColor: getSLAColor(batch) }]}>
                        <Ionicons name="time-outline" size={12} color={getSLAColor(batch)} />
                        <Text style={[styles.slaText, { color: getSLAColor(batch) }]}>
                          {calculateSLATimer(batch)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Chevron Icon */}
                  <View style={styles.chevronContainer}>
                    <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? Colors.text.tertiary : Colors.primary} />
                <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                  Précédent
                </Text>
              </TouchableOpacity>
              <Text style={styles.paginationInfo}>
                {startIndex + 1}-{Math.min(endIndex, filteredBatches.length)} sur {filteredBatches.length}
              </Text>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                  Suivant
                </Text>
                <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? Colors.text.tertiary : Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/batch/new')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.surface} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.xs,
    fontSize: 16,
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: Spacing.xs,
  },
  statValue: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.small,
    color: Colors.text.secondary,
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
  },
  pageInfo: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  batchCard: {
    marginBottom: Spacing.md,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  batchTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: Spacing.sm,
  },
  batchNumber: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 17,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  priorityText: {
    ...Typography.small,
    fontWeight: '700',
    fontSize: 10,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.status.alert,
  },
  alertText: {
    ...Typography.small,
    color: Colors.surface,
    fontWeight: '700',
    fontSize: 10,
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: BorderRadius.full,
  },
  batchProduct: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  batchMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '700',
    fontSize: 11,
  },
  stepText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontSize: 11,
  },
  batchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  assigneeAvatar: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assigneeInitials: {
    ...Typography.small,
    color: Colors.surface,
    fontWeight: '700',
    fontSize: 10,
  },
  assigneeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 11,
    flex: 1,
  },
  slaTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  slaText: {
    ...Typography.small,
    fontWeight: '700',
    fontSize: 10,
  },
  chevronContainer: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: Colors.text.tertiary,
  },
  paginationInfo: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
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
