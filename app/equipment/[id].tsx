import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type EquipmentLogbook = Database['public']['Tables']['equipment_logbook']['Row'] & {
  batch: { batch_number: string; product_name: string } | null;
};
type MaintenanceRecord = Database['public']['Tables']['equipment_maintenance']['Row'];

export default function EquipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [logbook, setLogbook] = useState<EquipmentLogbook[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquipmentDetails();
  }, [id]);

  const fetchEquipmentDetails = async () => {
    try {
      setLoading(true);

      // Fetch equipment
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', id)
        .single();

      if (equipmentError) throw equipmentError;

      setEquipment(equipmentData);

      // Fetch logbook
      const { data: logbookData } = await supabase
        .from('equipment_logbook')
        .select('*, batch:batches(batch_number, product_name)')
        .eq('equipment_id', id)
        .order('used_at', { ascending: false })
        .limit(20);

      setLogbook(logbookData || []);

      // Fetch maintenance records
      const { data: maintenanceData } = await supabase
        .from('equipment_maintenance')
        .select('*')
        .eq('equipment_id', id)
        .order('performed_at', { ascending: false })
        .limit(10);

      setMaintenance(maintenanceData || []);
    } catch (error) {
      console.error('Error fetching equipment details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de l&apos;équipement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (newStatus: 'cleaned' | 'in_use' | 'maintenance') => {
    Alert.alert(
      'Changer le Statut',
      `Confirmer le changement de statut vers "${newStatus === 'cleaned' ? 'Nettoyé' : newStatus === 'in_use' ? 'En cours' : 'Maintenance'}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await supabase
                .from('equipment')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);

              Alert.alert('Succès', 'Statut mis à jour');
              fetchEquipmentDetails();
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleaned':
        return Colors.success;
      case 'in_use':
        return Colors.primary;
      case 'maintenance':
        return Colors.error;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'cleaned':
        return 'Nettoyé';
      case 'in_use':
        return 'En cours';
      case 'maintenance':
        return 'Maintenance';
      default:
        return status;
    }
  };

  const isCalibrationExpired = equipment?.calibration_expiry_date
    ? new Date(equipment.calibration_expiry_date) < new Date()
    : false;

  if (loading || !equipment) {
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
          title: equipment.name,
          headerBackTitle: 'Retour',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.equipmentName}>{equipment.name}</Text>
              <Text style={styles.equipmentId}>ID: {equipment.unique_id}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(equipment.status) + '20' },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(equipment.status) }]}>
                {getStatusLabel(equipment.status)}
              </Text>
            </View>
          </View>

          {equipment.description && (
            <Text style={styles.description}>{equipment.description}</Text>
          )}

          <View style={styles.detailsGrid}>
            {equipment.location && (
              <View style={styles.detailItem}>
                <Ionicons name="location" size={16} color={Colors.text.secondary} />
                <Text style={styles.detailLabel}>Emplacement</Text>
                <Text style={styles.detailValue}>{equipment.location}</Text>
              </View>
            )}
            {equipment.calibration_expiry_date && (
              <View style={styles.detailItem}>
                <Ionicons
                  name={isCalibrationExpired ? 'alert-circle' : 'calendar-outline'}
                  size={16}
                  color={isCalibrationExpired ? Colors.error : Colors.text.secondary}
                />
                <Text style={styles.detailLabel}>Calibration</Text>
                <Text
                  style={[
                    styles.detailValue,
                    isCalibrationExpired && { color: Colors.error, fontWeight: '700' },
                  ]}
                >
                  {new Date(equipment.calibration_expiry_date).toLocaleDateString('fr-FR')}
                  {isCalibrationExpired && ' (EXPIRÉ)'}
                </Text>
              </View>
            )}
          </View>

          {isCalibrationExpired && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={20} color={Colors.error} />
              <Text style={styles.warningText}>
                La calibration de cet équipement a expiré. Ne pas utiliser en production.
              </Text>
            </View>
          )}
        </Card>

        {/* Status Actions */}
        <Card>
          <Text style={styles.sectionTitle}>Changer le Statut</Text>
          <View style={styles.statusButtons}>
            {[
              { key: 'cleaned', label: 'Nettoyé', icon: 'checkmark-circle' },
              { key: 'in_use', label: 'En cours', icon: 'play-circle' },
              { key: 'maintenance', label: 'Maintenance', icon: 'construct' },
            ].map((status) => (
              <TouchableOpacity
                key={status.key}
                style={[
                  styles.statusButton,
                  equipment.status === status.key && styles.statusButtonActive,
                ]}
                onPress={() =>
                  handleUpdateStatus(status.key as 'cleaned' | 'in_use' | 'maintenance')
                }
              >
                <Ionicons
                  name={status.icon as any}
                  size={24}
                  color={
                    equipment.status === status.key ? Colors.surface : Colors.text.secondary
                  }
                />
                <Text
                  style={[
                    styles.statusButtonText,
                    equipment.status === status.key && styles.statusButtonTextActive,
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Logbook */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Journal d'Utilisation ({logbook.length} entrées)
          </Text>
          {logbook.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>Aucune utilisation enregistrée</Text>
            </Card>
          ) : (
            logbook.map((entry) => (
              <Card key={entry.id} style={styles.logbookCard}>
                <View style={styles.logbookHeader}>
                  <Text style={styles.logbookBatch}>
                    Lot: {entry.batch?.batch_number || 'N/A'}
                  </Text>
                  <Text style={styles.logbookDate}>
                    {new Date(entry.used_at!).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                {entry.batch?.product_name && (
                  <Text style={styles.logbookProduct}>{entry.batch.product_name}</Text>
                )}
                {entry.notes && <Text style={styles.logbookNotes}>{entry.notes}</Text>}
                <Text style={styles.logbookUser}>Par: {entry.used_by || 'Non spécifié'}</Text>
              </Card>
            ))
          )}
        </View>

        {/* Maintenance History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Historique de Maintenance ({maintenance.length} interventions)
          </Text>
          {maintenance.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>Aucune maintenance enregistrée</Text>
            </Card>
          ) : (
            maintenance.map((record) => (
              <Card key={record.id} style={styles.maintenanceCard}>
                <View style={styles.maintenanceHeader}>
                  <Text style={styles.maintenanceType}>{record.maintenance_type}</Text>
                  <Text style={styles.maintenanceDate}>
                    {new Date(record.performed_at!).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                {record.notes && <Text style={styles.maintenanceNotes}>{record.notes}</Text>}
                <Text style={styles.maintenanceUser}>Par: {record.performed_by}</Text>
                {record.next_maintenance_date && (
                  <Text style={styles.maintenanceNext}>
                    Prochaine maintenance:{' '}
                    {new Date(record.next_maintenance_date).toLocaleDateString('fr-FR')}
                  </Text>
                )}
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  headerCard: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  equipmentName: {
    ...Typography.h2,
    marginBottom: 4,
  },
  equipmentId: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '700',
  },
  description: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  detailsGrid: {
    gap: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  detailValue: {
    ...Typography.caption,
    color: Colors.text.primary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.error + '15',
    borderRadius: BorderRadius.xs,
  },
  warningText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
    flex: 1,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  statusButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusButtonText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  statusButtonTextActive: {
    color: Colors.surface,
  },
  section: {
    marginTop: Spacing.lg,
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  logbookCard: {
    marginBottom: Spacing.sm,
  },
  logbookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  logbookBatch: {
    ...Typography.body,
    fontWeight: '700',
  },
  logbookDate: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  logbookProduct: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  logbookNotes: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  logbookUser: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  maintenanceCard: {
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  maintenanceType: {
    ...Typography.body,
    fontWeight: '700',
  },
  maintenanceDate: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  maintenanceNotes: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  maintenanceUser: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  maintenanceNext: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
});
