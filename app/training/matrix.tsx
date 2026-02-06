import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type SOP = Database['public']['Tables']['sops']['Row'];
type OperatorQualification = Database['public']['Tables']['operator_qualifications']['Row'];

interface MatrixData {
  operators: Set<string>;
  sops: SOP[];
  qualifications: Map<string, OperatorQualification>;
}

export default function TrainingMatrixScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matrixData, setMatrixData] = useState<MatrixData>({
    operators: new Set(),
    sops: [],
    qualifications: new Map(),
  });

  useEffect(() => {
    fetchMatrixData();
  }, []);

  const fetchMatrixData = async () => {
    try {
      setLoading(true);

      // Fetch all SOPs
      const { data: sopsData, error: sopsError } = await supabase
        .from('sops')
        .select('*')
        .eq('status', 'active')
        .order('category', { ascending: true });

      if (sopsError) throw sopsError;

      // Fetch all operator qualifications
      const { data: qualificationsData, error: qualificationsError } = await supabase
        .from('operator_qualifications')
        .select('*');

      if (qualificationsError) throw qualificationsError;

      // Build operators set
      const operators = new Set<string>();
      const qualificationsMap = new Map<string, OperatorQualification>();

      qualificationsData?.forEach((qual) => {
        operators.add(qual.operator_id);
        qualificationsMap.set(`${qual.operator_id}-${qual.sop_id}`, qual);
      });

      setMatrixData({
        operators,
        sops: sopsData || [],
        qualifications: qualificationsMap,
      });
    } catch (error) {
      console.error('Error fetching matrix data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatrixData();
  };

  const getQualificationStatus = (operatorId: string, sopId: string) => {
    const key = `${operatorId}-${sopId}`;
    const qualification = matrixData.qualifications.get(key);
    return qualification?.qualification_status || 'not_trained';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified':
        return Colors.success;
      case 'expired':
        return Colors.error;
      case 'pending_renewal':
        return Colors.warning;
      default:
        return Colors.text.tertiary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'checkmark-circle';
      case 'expired':
        return 'close-circle';
      case 'pending_renewal':
        return 'warning';
      default:
        return 'remove-circle-outline';
    }
  };

  // Get unique operator names
  const getOperatorName = (operatorId: string) => {
    for (const [, qual] of matrixData.qualifications) {
      if (qual.operator_id === operatorId) {
        return qual.operator_name;
      }
    }
    return operatorId;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const operatorsList = Array.from(matrixData.operators);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Matrice de Formation',
          headerBackTitle: 'Retour',
        }}
      />
      <View style={styles.container}>
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.legendText}>Qualifié</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="warning" size={16} color={Colors.warning} />
            <Text style={styles.legendText}>Renouvellement</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="close-circle" size={16} color={Colors.error} />
            <Text style={styles.legendText}>Expiré</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="remove-circle-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.legendText}>Non formé</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* Header Row */}
              <View style={styles.headerRow}>
                <View style={styles.operatorHeaderCell}>
                  <Text style={styles.headerText}>Opérateur</Text>
                </View>
                {matrixData.sops.map((sop) => (
                  <View key={sop.id} style={styles.sopHeaderCell}>
                    <Text style={styles.sopHeaderText} numberOfLines={2}>
                      {sop.code}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Operator Rows */}
              {operatorsList.map((operatorId, index) => (
                <View
                  key={operatorId}
                  style={[styles.operatorRow, index % 2 === 0 && styles.operatorRowEven]}
                >
                  <View style={styles.operatorNameCell}>
                    <Text style={styles.operatorNameText} numberOfLines={1}>
                      {getOperatorName(operatorId)}
                    </Text>
                  </View>
                  {matrixData.sops.map((sop) => {
                    const status = getQualificationStatus(operatorId, sop.id);
                    return (
                      <View key={sop.id} style={styles.statusCell}>
                        <Ionicons
                          name={getStatusIcon(status) as any}
                          size={24}
                          color={getStatusColor(status)}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>

        {/* Stats Summary */}
        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{operatorsList.length}</Text>
            <Text style={styles.statLabel}>Opérateurs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{matrixData.sops.length}</Text>
            <Text style={styles.statLabel}>SOPs Actifs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {Array.from(matrixData.qualifications.values()).filter(
                (q) => q.qualification_status === 'qualified'
              ).length}
            </Text>
            <Text style={styles.statLabel}>Qualifiés</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.error }]}>
              {Array.from(matrixData.qualifications.values()).filter(
                (q) => q.qualification_status === 'expired'
              ).length}
            </Text>
            <Text style={styles.statLabel}>Expirés</Text>
          </View>
        </View>
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
  legend: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendText: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  scrollContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.secondary,
  },
  operatorHeaderCell: {
    width: 150,
    padding: Spacing.sm,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.secondary,
  },
  sopHeaderCell: {
    width: 80,
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.secondary,
  },
  headerText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.surface,
  },
  sopHeaderText: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.surface,
    textAlign: 'center',
    fontSize: 10,
  },
  operatorRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  operatorRowEven: {
    backgroundColor: Colors.background,
  },
  operatorNameCell: {
    width: 150,
    padding: Spacing.sm,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  operatorNameText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  statusCell: {
    width: 80,
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  stats: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
  },
  statValue: {
    ...Typography.h3,
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    ...Typography.small,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
