import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from './Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface DeviationStats {
  byPerson: { person: string; count: number }[];
  byType: { type: string; count: number }[];
  byProduct: { product: string; count: number }[];
  avgHoldingTime: { person: string; avgHours: number }[];
  slaExceeded: { batchNumber: string; hoursOver: number }[];
  avgStepSLA: { step: string; avgHours: number }[];
}

export function DeviationAnalyticsWidget() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DeviationStats>({
    byPerson: [],
    byType: [],
    byProduct: [],
    avgHoldingTime: [],
    slaExceeded: [],
    avgStepSLA: [],
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Deviations by person
      const { data: deviationsByPerson } = await supabase
        .from('deviations')
        .select('reported_by')
        .order('reported_by');

      const personCounts: { [key: string]: number } = {};
      deviationsByPerson?.forEach((d: any) => {
        personCounts[d.reported_by] = (personCounts[d.reported_by] || 0) + 1;
      });
      const byPerson = Object.entries(personCounts)
        .map(([person, count]) => ({ person, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Deviations by type
      const { data: deviationsByType } = await supabase
        .from('deviations')
        .select('deviation_type_id, deviation_types(label)')
        .not('deviation_type_id', 'is', null);

      const typeCounts: { [key: string]: number } = {};
      deviationsByType?.forEach((d: any) => {
        const label = d.deviation_types?.label || 'N/A';
        typeCounts[label] = (typeCounts[label] || 0) + 1;
      });
      const byType = Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Deviations by product
      const { data: deviationsByProduct } = await supabase
        .from('deviations')
        .select('product_name')
        .not('product_name', 'is', null);

      const productCounts: { [key: string]: number } = {};
      deviationsByProduct?.forEach((d: any) => {
        productCounts[d.product_name] = (productCounts[d.product_name] || 0) + 1;
      });
      const byProduct = Object.entries(productCounts)
        .map(([product, count]) => ({ product, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Average holding time per operator
      const { data: batchOwnership } = await supabase.rpc('get_avg_holding_time');

      const avgHoldingTime = batchOwnership || [];

      // Batches exceeding SLA
      const { data: slaData } = await supabase
        .from('step_instances')
        .select('batch:batches(batch_number), sla_deadline, completed_at')
        .eq('is_overdue', true)
        .not('completed_at', 'is', null)
        .limit(5);

      const slaExceeded =
        slaData?.map((s: any) => {
          const deadline = new Date(s.sla_deadline);
          const completed = new Date(s.completed_at);
          const hoursOver = (completed.getTime() - deadline.getTime()) / (1000 * 60 * 60);
          return {
            batchNumber: s.batch?.batch_number || 'N/A',
            hoursOver: Math.round(hoursOver * 10) / 10,
          };
        }) || [];

      // Average SLA per step
      const { data: stepSLA } = await supabase
        .from('step_instances')
        .select('step_definitions(name), started_at, completed_at')
        .not('started_at', 'is', null)
        .not('completed_at', 'is', null);

      const stepTimes: { [key: string]: { total: number; count: number } } = {};
      stepSLA?.forEach((s: any) => {
        const name = s.step_definitions?.name || 'Unknown';
        const duration =
          (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) /
          (1000 * 60 * 60);
        if (!stepTimes[name]) {
          stepTimes[name] = { total: 0, count: 0 };
        }
        stepTimes[name].total += duration;
        stepTimes[name].count++;
      });

      const avgStepSLA = Object.entries(stepTimes)
        .map(([step, data]) => ({
          step,
          avgHours: Math.round((data.total / data.count) * 10) / 10,
        }))
        .sort((a, b) => b.avgHours - a.avgHours)
        .slice(0, 5);

      setStats({
        byPerson,
        byType,
        byProduct,
        avgHoldingTime: avgHoldingTime.slice(0, 5),
        slaExceeded,
        avgStepSLA,
      });
    } catch (error) {
      console.error('Error fetching deviation analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {/* Deviations by Person */}
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="person-outline" size={24} color={Colors.ruby} />
          <Text style={styles.title}>Déviations par Personne</Text>
        </View>
        {stats.byPerson.length > 0 ? (
          stats.byPerson.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label}>{item.person}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.count}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune donnée</Text>
        )}
      </Card>

      {/* Deviations by Type */}
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="list-outline" size={24} color={Colors.ruby} />
          <Text style={styles.title}>Déviations par Type</Text>
        </View>
        {stats.byType.length > 0 ? (
          stats.byType.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label} numberOfLines={1}>
                {item.type}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.count}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune donnée</Text>
        )}
      </Card>

      {/* Deviations by Product */}
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="cube-outline" size={24} color={Colors.ruby} />
          <Text style={styles.title}>Déviations par Produit</Text>
        </View>
        {stats.byProduct.length > 0 ? (
          stats.byProduct.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label} numberOfLines={1}>
                {item.product}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.count}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune donnée</Text>
        )}
      </Card>

      {/* Average SLA per Step */}
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="time-outline" size={24} color={Colors.primary} />
          <Text style={styles.title}>SLA Moyen par Étape</Text>
        </View>
        {stats.avgStepSLA.length > 0 ? (
          stats.avgStepSLA.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label} numberOfLines={1}>
                {item.step}
              </Text>
              <Text style={styles.value}>{item.avgHours}h</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune donnée</Text>
        )}
      </Card>

      {/* Batches Exceeding SLA */}
      {stats.slaExceeded.length > 0 && (
        <Card style={[styles.card, styles.alertCard]}>
          <View style={styles.header}>
            <Ionicons name="alert-circle-outline" size={24} color={Colors.error} />
            <Text style={[styles.title, { color: Colors.error }]}>Lots Hors SLA</Text>
          </View>
          {stats.slaExceeded.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label}>Lot #{item.batchNumber}</Text>
              <Text style={[styles.value, { color: Colors.error }]}>+{item.hoursOver}h</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Average Holding Time */}
      {stats.avgHoldingTime.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="timer-outline" size={24} color={Colors.amber} />
            <Text style={styles.title}>Temps de Détention Moyen</Text>
          </View>
          {stats.avgHoldingTime.map((item: any, index: number) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label}>{item.person || item.owner_name}</Text>
              <Text style={styles.value}>{item.avgHours || item.avg_hours}h</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  card: {
    padding: Spacing.md,
  },
  alertCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...Typography.body,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  label: {
    ...Typography.caption,
    color: Colors.text.secondary,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.ruby + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    minWidth: 32,
    alignItems: 'center',
  },
  badgeText: {
    ...Typography.small,
    color: Colors.ruby,
    fontWeight: '700',
  },
  value: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
