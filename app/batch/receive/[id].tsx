import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

interface BatchInfo {
  id: string;
  batch_number: string;
  product_name: string;
  status: string;
  current_owner_id: string | null;
  current_owner_name: string | null;
  ownership_updated_at: string | null;
  current_step_id: string | null;
  created_at: string;
}

interface StepInfo {
  id: string;
  name: string;
  started_at: string | null;
}

interface TransferOption {
  id: string;
  name: string;
  role: string;
}

export default function BatchReceptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [currentStep, setCurrentStep] = useState<StepInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferOptions, setTransferOptions] = useState<TransferOption[]>([]);
  const [selectedTransferUser, setSelectedTransferUser] = useState<string | null>(null);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchBatchInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBatchInfo = async () => {
    try {
      setLoading(true);

      // Fetch batch details
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .single();

      if (batchError) throw batchError;

      setBatch(batchData);

      // Fetch current step info
      if (batchData.current_step_id) {
        const { data: stepData } = await supabase
          .from('step_instances')
          .select('id, step_definitions(name)')
          .eq('id', batchData.current_step_id)
          .single();

        if (stepData && stepData.step_definitions) {
          setCurrentStep({
            id: stepData.id,
            name: (stepData.step_definitions as any).name,
            started_at: null,
          });
        }
      }

      // Log scan view event
      await supabase.from('audit_trail').insert({
        entity_type: 'batch',
        entity_id: id,
        event_type: 'SCAN_VIEW',
        user_id: user?.id || 'unknown',
        user_name: user?.name || 'Unknown',
        user_role: user?.role || 'VIEWER',
        metadata: {
          batch_number: batchData.batch_number,
          current_owner: batchData.current_owner_name,
          viewer: user?.name,
        },
      });
    } catch (error) {
      console.error('Error fetching batch info:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations du lot');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('is_active', true)
        .neq('id', user?.id || '')
        .order('name');

      if (error) throw error;

      setTransferOptions(data || []);
    } catch (error) {
      console.error('Error fetching transfer options:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste des utilisateurs');
    }
  };

  const handleReceiveDossier = async () => {
    if (!batch || !user) return;

    Alert.alert(
      'Recevoir le Dossier',
      `Confirmez-vous la réception du lot #${batch.batch_number}?\n\nVous deviendrez le détenteur actuel du dossier.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Recevoir',
          style: 'default',
          onPress: async () => {
            try {
              setReceiving(true);
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              const previousOwner = batch.current_owner_name;

              // Update batch ownership
              const { error: updateError } = await supabase
                .from('batches')
                .update({
                  current_owner_id: user.id,
                  current_owner_name: user.name,
                  ownership_updated_at: new Date().toISOString(),
                })
                .eq('id', batch.id);

              if (updateError) throw updateError;

              // Log RECEIVED event
              await supabase.from('audit_trail').insert({
                entity_type: 'batch',
                entity_id: batch.id,
                event_type: 'RECEIVED',
                user_id: user.id,
                user_name: user.name,
                user_role: user.role,
                metadata: {
                  batch_number: batch.batch_number,
                  previous_owner: previousOwner,
                  new_owner: user.name,
                  reception_timestamp: new Date().toISOString(),
                },
              });

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              Alert.alert(
                '✅ Dossier Reçu',
                `Vous êtes maintenant le détenteur du lot #${batch.batch_number}`,
                [
                  {
                    text: 'Voir le Lot',
                    onPress: () => router.replace(`/batch/${batch.id}`),
                  },
                ]
              );
            } catch (error) {
              console.error('Error receiving dossier:', error);
              Alert.alert('Erreur', 'Impossible de recevoir le dossier');
            } finally {
              setReceiving(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenTransferModal = async () => {
    await fetchTransferOptions();
    setTransferModalVisible(true);
  };

  const handleTransferDossier = async () => {
    if (!selectedTransferUser || !batch || !user) return;

    const targetUser = transferOptions.find((u) => u.id === selectedTransferUser);
    if (!targetUser) return;

    try {
      setTransferring(true);

      const previousOwner = batch.current_owner_name;

      // Update batch ownership
      const { error: updateError } = await supabase
        .from('batches')
        .update({
          current_owner_id: targetUser.id,
          current_owner_name: targetUser.name,
          ownership_updated_at: new Date().toISOString(),
        })
        .eq('id', batch.id);

      if (updateError) throw updateError;

      // Log TRANSFERRED event
      await supabase.from('audit_trail').insert({
        entity_type: 'batch',
        entity_id: batch.id,
        event_type: 'TRANSFERRED',
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
        metadata: {
          batch_number: batch.batch_number,
          previous_owner: previousOwner,
          new_owner: targetUser.name,
          transferred_by: user.name,
          transfer_notes: transferNotes,
          transfer_timestamp: new Date().toISOString(),
        },
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTransferModalVisible(false);
      setTransferNotes('');
      setSelectedTransferUser(null);

      Alert.alert(
        '✅ Transfert Réussi',
        `Le lot #${batch.batch_number} a été transféré à ${targetUser.name}`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error transferring dossier:', error);
      Alert.alert('Erreur', 'Impossible de transférer le dossier');
    } finally {
      setTransferring(false);
    }
  };

  const getTimeElapsed = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}j ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}min`;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.priority.urgent} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!batch) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Lot introuvable</Text>
        <Button title="Retour" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Réception du Dossier',
          headerStyle: { backgroundColor: Colors.priority.urgent },
          headerTintColor: Colors.surface,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header Badge */}
        <View style={styles.receptionBadge}>
          <Ionicons name="scan" size={48} color={Colors.priority.urgent} />
          <Text style={styles.receptionTitle}>Dossier de Lot Scanné</Text>
        </View>

        {/* Batch Info Card */}
        <Card style={styles.batchCard}>
          <View style={styles.batchHeader}>
            <Ionicons name="document-text" size={32} color={Colors.primary} />
            <View style={styles.batchHeaderText}>
              <Text style={styles.batchNumber}>Lot #{batch.batch_number}</Text>
              <Text style={styles.productName}>{batch.product_name}</Text>
            </View>
          </View>
        </Card>

        {/* Current Step Info */}
        {currentStep && (
          <Card style={styles.stepCard}>
            <Text style={styles.sectionTitle}>Étape Actuelle</Text>
            <View style={styles.stepInfo}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, { backgroundColor: Colors.status.inProgress }]} />
              </View>
              <View style={styles.stepDetails}>
                <Text style={styles.stepName}>{currentStep.name}</Text>
                <Text style={styles.stepStatus}>En cours</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Current Owner Info */}
        <Card style={styles.ownerCard}>
          <Text style={styles.sectionTitle}>Détenteur Actuel</Text>
          <View style={styles.ownerInfo}>
            <View style={styles.ownerAvatar}>
              <Ionicons name="person" size={32} color={Colors.surface} />
            </View>
            <View style={styles.ownerDetails}>
              <Text style={styles.ownerName}>
                {batch.current_owner_name || 'Non assigné'}
              </Text>
              <View style={styles.ownerMeta}>
                <Ionicons name="time-outline" size={14} color={Colors.text.secondary} />
                <Text style={styles.ownerTime}>
                  Depuis: {getTimeElapsed(batch.ownership_updated_at)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title="Recevoir le Dossier"
            onPress={handleReceiveDossier}
            loading={receiving}
            disabled={receiving}
            style={styles.receiveButton}
            size="large"
          />

          <TouchableOpacity
            style={styles.transferButton}
            onPress={handleOpenTransferModal}
            disabled={receiving}
          >
            <Ionicons name="swap-horizontal" size={20} color={Colors.priority.urgent} />
            <Text style={styles.transferButtonText}>Transférer à un Autre Utilisateur</Text>
          </TouchableOpacity>
        </View>

        {/* Info Panel */}
        <Card variant="outlined" style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={Colors.primary} />
            <Text style={styles.infoTitle}>À Propos de la Réception</Text>
          </View>
          <Text style={styles.infoText}>
            • En recevant ce dossier, vous devenez le détenteur actuel{'\n'}
            • L'horodatage de la réception sera enregistré{'\n'}
            • Un événement d'audit sera créé pour la traçabilité{'\n'}
            • Vous pourrez ensuite accéder aux détails complets du lot
          </Text>
        </Card>
      </ScrollView>

      {/* Transfer Modal */}
      <Modal
        visible={transferModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transférer le Dossier</Text>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Sélectionnez l'utilisateur qui recevra le lot #{batch.batch_number}
            </Text>

            <ScrollView style={styles.transferList}>
              {transferOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.transferOption,
                    selectedTransferUser === option.id && styles.transferOptionSelected,
                  ]}
                  onPress={() => setSelectedTransferUser(option.id)}
                >
                  <View style={styles.transferOptionAvatar}>
                    <Ionicons
                      name="person"
                      size={24}
                      color={
                        selectedTransferUser === option.id ? Colors.surface : Colors.text.secondary
                      }
                    />
                  </View>
                  <View style={styles.transferOptionInfo}>
                    <Text
                      style={[
                        styles.transferOptionName,
                        selectedTransferUser === option.id && styles.transferOptionNameSelected,
                      ]}
                    >
                      {option.name}
                    </Text>
                    <Text style={styles.transferOptionRole}>{option.role}</Text>
                  </View>
                  {selectedTransferUser === option.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.surface} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.transferNotesInput}
              placeholder="Notes de transfert (optionnel)"
              placeholderTextColor={Colors.text.tertiary}
              value={transferNotes}
              onChangeText={setTransferNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setTransferModalVisible(false);
                  setSelectedTransferUser(null);
                  setTransferNotes('');
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !selectedTransferUser && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleTransferDossier}
                disabled={!selectedTransferUser || transferring}
              >
                {transferring ? (
                  <ActivityIndicator color={Colors.surface} />
                ) : (
                  <Text style={styles.modalConfirmText}>Transférer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  errorText: {
    ...Typography.h3,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  receptionBadge: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  receptionTitle: {
    ...Typography.h2,
    color: Colors.priority.urgent,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  batchCard: {
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.priority.urgent,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  batchHeaderText: {
    flex: 1,
  },
  batchNumber: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  productName: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  stepCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  stepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepIndicator: {
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDetails: {
    flex: 1,
  },
  stepName: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepStatus: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  ownerCard: {
    marginBottom: Spacing.xl,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ownerAvatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerDetails: {
    flex: 1,
  },
  ownerName: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  ownerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ownerTime: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  actionsContainer: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  receiveButton: {
    backgroundColor: Colors.priority.urgent,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.priority.urgent,
    borderRadius: BorderRadius.sm,
  },
  transferButtonText: {
    ...Typography.body,
    color: Colors.priority.urgent,
    fontWeight: '600',
  },
  infoCard: {
    marginBottom: Spacing.xl,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    ...Typography.body,
    fontWeight: '600',
  },
  infoText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    ...Typography.h2,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  transferList: {
    maxHeight: 300,
    marginBottom: Spacing.md,
  },
  transferOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  transferOptionSelected: {
    backgroundColor: Colors.priority.urgent,
  },
  transferOptionAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.text.tertiary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferOptionInfo: {
    flex: 1,
  },
  transferOptionName: {
    ...Typography.body,
    fontWeight: '600',
  },
  transferOptionNameSelected: {
    color: Colors.surface,
  },
  transferOptionRole: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  transferNotesInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Typography.body,
    marginBottom: Spacing.lg,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  modalCancelText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalConfirmButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.priority.urgent,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.surface,
  },
});
