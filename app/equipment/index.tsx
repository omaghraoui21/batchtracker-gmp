import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

type Equipment = Database['public']['Tables']['equipment']['Row'];

export default function EquipmentListScreen() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'cleaned' | 'in_use' | 'maintenance'>('all');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    unique_id: '',
    status: 'cleaned' as const,
    description: '',
    location: '',
    calibration_expiry_date: new Date(),
  });
  const [showCalibrationPicker, setShowCalibrationPicker] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, [filterStatus]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      let query = supabase.from('equipment').select('*').order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      Alert.alert('Erreur', 'Impossible de charger les équipements');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async () => {
    if (!newEquipment.name || !newEquipment.unique_id) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { error } = await supabase.from('equipment').insert({
        name: newEquipment.name,
        unique_id: newEquipment.unique_id,
        status: newEquipment.status,
        description: newEquipment.description || null,
        location: newEquipment.location || null,
        calibration_expiry_date: newEquipment.calibration_expiry_date.toISOString(),
        created_by: 'admin',
      });

      if (error) throw error;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Succès', 'Équipement ajouté avec succès');
      setAddModalVisible(false);
      setNewEquipment({
        name: '',
        unique_id: '',
        status: 'cleaned',
        description: '',
        location: '',
        calibration_expiry_date: new Date(),
      });
      fetchEquipment();
    } catch (error: any) {
      console.error('Error adding equipment:', error);
      Alert.alert('Erreur', error?.message || 'Impossible d&apos;ajouter l&apos;équipement');
    }
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

  const isCalibrationExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

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
          title: 'Équipements',
          headerRight: () => (
            <TouchableOpacity onPress={() => setAddModalVisible(true)}>
              <Ionicons name="add-circle" size={28} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {[
            { key: 'all', label: 'Tous', count: equipment.length },
            { key: 'cleaned', label: 'Nettoyés', count: equipment.filter(e => e.status === 'cleaned').length },
            { key: 'in_use', label: 'En cours', count: equipment.filter(e => e.status === 'in_use').length },
            { key: 'maintenance', label: 'Maintenance', count: equipment.filter(e => e.status === 'maintenance').length },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                filterStatus === filter.key && styles.filterTabActive,
              ]}
              onPress={() => setFilterStatus(filter.key as typeof filterStatus)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterStatus === filter.key && styles.filterTabTextActive,
                ]}
              >
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Equipment List */}
        <ScrollView contentContainerStyle={styles.content}>
          {equipment.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={64} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>Aucun équipement</Text>
              <Text style={styles.emptySubtext}>
                Ajoutez votre premier équipement en cliquant sur le bouton +
              </Text>
            </Card>
          ) : (
            equipment.map((item) => {
              const expired = isCalibrationExpired(item.calibration_expiry_date);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/equipment/${item.id}`)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.equipmentCard}>
                    <View style={styles.equipmentHeader}>
                      <View style={styles.equipmentLeft}>
                        <Text style={styles.equipmentName}>{item.name}</Text>
                        <Text style={styles.equipmentId}>ID: {item.unique_id}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(item.status) + '20' },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                          {getStatusLabel(item.status)}
                        </Text>
                      </View>
                    </View>

                    {item.description && (
                      <Text style={styles.equipmentDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}

                    <View style={styles.equipmentDetails}>
                      {item.location && (
                        <View style={styles.detailRow}>
                          <Ionicons name="location" size={14} color={Colors.text.secondary} />
                          <Text style={styles.detailText}>{item.location}</Text>
                        </View>
                      )}
                      {item.calibration_expiry_date && (
                        <View style={styles.detailRow}>
                          <Ionicons
                            name={expired ? 'alert-circle' : 'calendar-outline'}
                            size={14}
                            color={expired ? Colors.error : Colors.text.secondary}
                          />
                          <Text style={[styles.detailText, expired && { color: Colors.error }]}>
                            Calibration:{' '}
                            {new Date(item.calibration_expiry_date).toLocaleDateString('fr-FR')}
                            {expired && ' (Expiré)'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Add Equipment Modal */}
        <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvel Équipement</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom *</Text>
                <TextInput
                  style={styles.input}
                  value={newEquipment.name}
                  onChangeText={(text) => setNewEquipment({ ...newEquipment, name: text })}
                  placeholder="Ex: Mélangeur Industriel"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ID Unique *</Text>
                <TextInput
                  style={styles.input}
                  value={newEquipment.unique_id}
                  onChangeText={(text) => setNewEquipment({ ...newEquipment, unique_id: text })}
                  placeholder="Ex: MEL-001"
                  placeholderTextColor={Colors.text.tertiary}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Statut</Text>
                <View style={styles.statusButtons}>
                  {[
                    { key: 'cleaned', label: 'Nettoyé' },
                    { key: 'in_use', label: 'En cours' },
                    { key: 'maintenance', label: 'Maintenance' },
                  ].map((status) => (
                    <TouchableOpacity
                      key={status.key}
                      style={[
                        styles.statusButton,
                        newEquipment.status === status.key && styles.statusButtonActive,
                      ]}
                      onPress={() => setNewEquipment({ ...newEquipment, status: status.key as any })}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          newEquipment.status === status.key && styles.statusButtonTextActive,
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Emplacement</Text>
                <TextInput
                  style={styles.input}
                  value={newEquipment.location}
                  onChangeText={(text) => setNewEquipment({ ...newEquipment, location: text })}
                  placeholder="Ex: Zone de Production A"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date d'expiration de la calibration</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowCalibrationPicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {newEquipment.calibration_expiry_date.toLocaleDateString('fr-FR')}
                  </Text>
                  <Ionicons name="calendar" size={20} color={Colors.primary} />
                </TouchableOpacity>
                {showCalibrationPicker && (
                  <DateTimePicker
                    value={newEquipment.calibration_expiry_date}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowCalibrationPicker(false);
                      if (selectedDate) {
                        setNewEquipment({ ...newEquipment, calibration_expiry_date: selectedDate });
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newEquipment.description}
                  onChangeText={(text) => setNewEquipment({ ...newEquipment, description: text })}
                  placeholder="Description de l'équipement..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity style={styles.addButton} onPress={handleAddEquipment}>
                <Text style={styles.addButtonText}>Ajouter l'équipement</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
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
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: Colors.surface,
  },
  content: {
    padding: Spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    ...Typography.h3,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  equipmentCard: {
    marginBottom: Spacing.md,
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  equipmentLeft: {
    flex: 1,
  },
  equipmentName: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: 4,
  },
  equipmentId: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
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
  equipmentDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  equipmentDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.h2,
  },
  modalContent: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    color: Colors.text.secondary,
  },
  input: {
    ...Typography.body,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
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
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dateButtonText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  addButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '700',
  },
});
