import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Batch = Database['public']['Tables']['batches']['Row'] & {
  current_step?: Database['public']['Tables']['step_instances']['Row'] & {
    step_definition?: Database['public']['Tables']['step_definitions']['Row'];
  };
  critical_deviations_count?: number;
};

export default function BatchesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);

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
        return Colors.primary;
      case 'completed':
        return Colors.success;
      case 'cancelled':
        return Colors.text.tertiary;
      case 'blocked':
        return Colors.error;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'En cours';
      case 'completed':
        return 'Terminé';
      case 'cancelled':
        return 'Annulé';
      case 'blocked':
        return 'Bloqué';
      default:
        return status;
    }
  };

  const filteredBatches = batches.filter(
    (batch) =>
      batch.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeBatchesCount = batches.filter((b) => b.status === 'active').length;
  const priorityBatchesCount = batches.filter((b) => b.priority === 'high').length;
  const monthlyBatchesCount = batches.length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
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
        {/* Statistiques rapides */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeBatchesCount}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{priorityBatchesCount}</Text>
            <Text style={styles.statLabel}>Prioritaires</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{monthlyBatchesCount}</Text>
            <Text style={styles.statLabel}>Ce mois</Text>
          </View>
        </View>

        {/* Liste des lots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Tous les Lots ({filteredBatches.length})
          </Text>

          {filteredBatches.map((batch) => (
            <TouchableOpacity
              key={batch.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/batch/${batch.id}`)}
            >
              <Card style={styles.batchCard}>
                <View style={styles.batchHeader}>
                  <View style={styles.batchTitleContainer}>
                    <Text style={styles.batchNumber}>Lot #{batch.batch_number}</Text>
                    {batch.priority === 'high' && (
                      <View style={styles.priorityBadge}>
                        <Ionicons name="flag" size={12} color={Colors.error} />
                      </View>
                    )}
                    {batch.critical_deviations_count && batch.critical_deviations_count > 0 && (
                      <View style={styles.warningBadge}>
                        <Ionicons name="warning" size={12} color={Colors.error} />
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(batch.status) },
                    ]}
                  />
                </View>

                <Text style={styles.batchProduct}>{batch.product_name}</Text>

                <View style={styles.batchFooter}>
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
                  <Text style={styles.stageText}>
                    Étape: {batch.current_step?.step_definition?.name || 'N/A'}
                  </Text>
                </View>

                {/* Show who is working on current step */}
                {batch.current_step?.assigned_to && (
                  <View style={styles.assignedInfo}>
                    <Ionicons name="person" size={14} color={Colors.primary} />
                    <Text style={styles.assignedText}>
                      En cours par: {batch.current_step.assigned_to}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => router.push(`/batch/${batch.id}`)}
                >
                  <Text style={styles.detailButtonText}>Voir les détails</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bouton flottant d'ajout */}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  statValue: {
    ...Typography.h2,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  batchCard: {
    marginBottom: Spacing.md,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  batchTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  batchNumber: {
    ...Typography.body,
    fontWeight: '700',
  },
  priorityBadge: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBadge: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  batchProduct: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  batchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
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
    fontWeight: '600',
  },
  stageText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  assignedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  assignedText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  detailButtonText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: 4,
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
