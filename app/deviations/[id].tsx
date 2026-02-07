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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import ElectronicSignatureModal, { SignatureData } from '@/components/ElectronicSignatureModal';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';

type Deviation = Database['public']['Tables']['deviations']['Row'] & {
  batch?: { batch_number: string; product_name: string; status: string } | null;
  step_instance?: { step_definition?: { name: string } | null } | null;
};

export default function DeviationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [deviation, setDeviation] = useState<Deviation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);

  // CAPA form fields
  const [editMode, setEditMode] = useState(false);
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [preventiveActions, setPreventiveActions] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    fetchDeviationDetails();
  }, [id]);

  const fetchDeviationDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('deviations')
        .select(`
          *,
          batch:batches(batch_number, product_name, status),
          step_instance:step_instances(
            step_definition:step_definitions(name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const deviationData = data as unknown as Deviation;
      setDeviation(deviationData);
      setRootCauseAnalysis(deviationData.root_cause_analysis || '');
      setCorrectiveActions(deviationData.corrective_actions || '');
      setPreventiveActions(deviationData.preventive_actions || '');
      setVerificationNotes(deviationData.verification_notes || '');
    } catch (error) {
      console.error('Error fetching deviation:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la déviation');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCAPA = async () => {
    if (!deviation) return;

    try {
      setActionLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { error } = await supabase
        .from('deviations')
        .update({
          root_cause_analysis: rootCauseAnalysis,
          corrective_actions: correctiveActions,
          preventive_actions: preventiveActions,
          verification_notes: verificationNotes,
          status: 'investigating',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deviation.id);

      if (error) throw error;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Succès', 'Actions CAPA enregistrées');
      setEditMode(false);
      fetchDeviationDetails();
    } catch (error) {
      console.error('Error saving CAPA:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer les actions CAPA');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenSignatureModal = () => {
    if (!deviation) return;

    // Check if user has QA or Supervisor role
    const isAuthorized = user?.role === 'QA' || user?.role === 'SUPERVISOR';
    if (!isAuthorized) {
      Alert.alert(
        'Non autorisé',
        'Seuls les utilisateurs QA ou Superviseur peuvent valider et clôturer une déviation'
      );
      return;
    }

    // Check if CAPA is complete
    if (!deviation.root_cause_analysis || !deviation.corrective_actions) {
      Alert.alert(
        'CAPA Incomplet',
        'L\'analyse des causes et les actions correctives doivent être renseignées avant de clôturer la déviation'
      );
      return;
    }

    setSignatureModalVisible(true);
  };

  const handleSign = async (signatureData: SignatureData) => {
    if (!deviation) return;

    try {
      setActionLoading(true);

      // Close the deviation
      const { error } = await supabase
        .from('deviations')
        .update({
          status: 'closed',
          closed_by: signatureData.signerName,
          closed_at: new Date().toISOString(),
          verified_by: signatureData.signerName,
          verified_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
        })
        .eq('id', deviation.id);

      if (error) throw error;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Succès', 'Déviation validée et clôturée');
      fetchDeviationDetails();
    } catch (error) {
      console.error('Error closing deviation:', error);
      Alert.alert('Erreur', 'Impossible de clôturer la déviation');
    } finally {
      setActionLoading(false);
      setSignatureModalVisible(false);
    }
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
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!deviation) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
        <Text style={styles.errorText}>Déviation introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canEdit = deviation.status !== 'closed';
  const canClose = deviation.status !== 'closed' && (user?.role === 'QA' || user?.role === 'SUPERVISOR');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Détail Déviation',
          headerBackTitle: 'Retour',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
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
                <Text style={[styles.statusText, { color: getStatusColor(deviation.status) }]}>
                  {getStatusLabel(deviation.status)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.title}>{deviation.title}</Text>

          {deviation.batch && (
            <View style={styles.batchInfo}>
              <Ionicons name="cube" size={16} color={Colors.primary} />
              <Text style={styles.batchText}>
                Lot {deviation.batch.batch_number} - {deviation.batch.product_name}
              </Text>
            </View>
          )}
        </Card>

        {/* Critical Warning */}
        {deviation.severity === 'critical' && deviation.status !== 'closed' && (
          <Card style={styles.criticalWarningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={24} color={Colors.error} />
              <Text style={styles.warningTitle}>Déviation Critique</Text>
            </View>
            <Text style={styles.warningText}>
              Cette déviation critique bloque la validation du lot. Elle doit être résolue et validée par
              le service QA avant de pouvoir finaliser le lot.
            </Text>
          </Card>
        )}

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Card>
            <Text style={styles.description}>{deviation.description}</Text>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={Colors.text.secondary} />
              <Text style={styles.infoText}>
                Localisation:{' '}
                {deviation.step_instance?.step_definition?.name || 'Non spécifié'}
              </Text>
            </View>

            {deviation.immediate_action && (
              <View style={styles.immediateActionBox}>
                <Text style={styles.immediateActionTitle}>Actions Immédiates:</Text>
                <Text style={styles.immediateActionText}>{deviation.immediate_action}</Text>
              </View>
            )}

            <View style={styles.metadata}>
              <Text style={styles.metadataText}>
                Signalée le {formatDate(deviation.reported_at)}
              </Text>
              {deviation.reported_by && (
                <Text style={styles.metadataText}>Par: {deviation.reported_by}</Text>
              )}
            </View>
          </Card>
        </View>

        {/* CAPA Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CAPA (Corrective & Preventive Actions)</Text>
            {canEdit && !editMode && (
              <TouchableOpacity onPress={() => setEditMode(true)} style={styles.editButton}>
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
            )}
          </View>

          <Card>
            {/* Root Cause Analysis */}
            <View style={styles.capaField}>
              <Text style={styles.capaLabel}>Analyse des Causes Racines</Text>
              {editMode ? (
                <TextInput
                  style={[styles.capaInput, styles.capaTextArea]}
                  placeholder="Analysez la cause racine de la déviation..."
                  placeholderTextColor={Colors.text.tertiary}
                  value={rootCauseAnalysis}
                  onChangeText={setRootCauseAnalysis}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.capaValue}>
                  {rootCauseAnalysis || 'Non renseigné'}
                </Text>
              )}
            </View>

            {/* Corrective Actions */}
            <View style={styles.capaField}>
              <Text style={styles.capaLabel}>Actions Correctives</Text>
              {editMode ? (
                <TextInput
                  style={[styles.capaInput, styles.capaTextArea]}
                  placeholder="Décrivez les actions correctives à mettre en place..."
                  placeholderTextColor={Colors.text.tertiary}
                  value={correctiveActions}
                  onChangeText={setCorrectiveActions}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.capaValue}>
                  {correctiveActions || 'Non renseigné'}
                </Text>
              )}
            </View>

            {/* Preventive Actions */}
            <View style={styles.capaField}>
              <Text style={styles.capaLabel}>Actions Préventives</Text>
              {editMode ? (
                <TextInput
                  style={[styles.capaInput, styles.capaTextArea]}
                  placeholder="Décrivez les actions préventives pour éviter la récurrence..."
                  placeholderTextColor={Colors.text.tertiary}
                  value={preventiveActions}
                  onChangeText={setPreventiveActions}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.capaValue}>
                  {preventiveActions || 'Non renseigné'}
                </Text>
              )}
            </View>

            {/* Verification */}
            <View style={styles.capaField}>
              <Text style={styles.capaLabel}>Notes de Vérification</Text>
              {editMode ? (
                <TextInput
                  style={[styles.capaInput, styles.capaTextArea]}
                  placeholder="Notes sur la vérification de l'efficacité des actions..."
                  placeholderTextColor={Colors.text.tertiary}
                  value={verificationNotes}
                  onChangeText={setVerificationNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.capaValue}>
                  {verificationNotes || 'Non renseigné'}
                </Text>
              )}
            </View>

            {editMode && (
              <View style={styles.capaActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditMode(false);
                    setRootCauseAnalysis(deviation.root_cause_analysis || '');
                    setCorrectiveActions(deviation.corrective_actions || '');
                    setPreventiveActions(deviation.preventive_actions || '');
                    setVerificationNotes(deviation.verification_notes || '');
                  }}
                  disabled={actionLoading}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveCAPA}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color={Colors.surface} size="small" />
                  ) : (
                    <>
                      <Ionicons name="save" size={16} color={Colors.surface} />
                      <Text style={styles.saveButtonText}>Enregistrer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </View>

        {/* Validation Section */}
        {deviation.status === 'closed' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Validation QA</Text>
            <Card style={styles.validatedCard}>
              <View style={styles.validatedHeader}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
                <Text style={styles.validatedTitle}>Déviation Clôturée</Text>
              </View>
              {deviation.verified_by && (
                <View style={styles.validationInfo}>
                  <Text style={styles.validationLabel}>Validée par:</Text>
                  <Text style={styles.validationValue}>{deviation.verified_by}</Text>
                </View>
              )}
              {deviation.verified_at && (
                <View style={styles.validationInfo}>
                  <Text style={styles.validationLabel}>Date de validation:</Text>
                  <Text style={styles.validationValue}>{formatDate(deviation.verified_at)}</Text>
                </View>
              )}
              {deviation.closed_at && (
                <View style={styles.validationInfo}>
                  <Text style={styles.validationLabel}>Date de clôture:</Text>
                  <Text style={styles.validationValue}>{formatDate(deviation.closed_at)}</Text>
                </View>
              )}
            </Card>
          </View>
        ) : (
          canClose && (
            <TouchableOpacity
              style={styles.validateButton}
              onPress={handleOpenSignatureModal}
              disabled={actionLoading}
            >
              <Ionicons name="checkmark-circle" size={20} color={Colors.surface} />
              <Text style={styles.validateButtonText}>Valider et Clôturer (QA)</Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      {/* Electronic Signature Modal */}
      {deviation && (
        <ElectronicSignatureModal
          visible={signatureModalVisible}
          onClose={() => setSignatureModalVisible(false)}
          onSign={handleSign}
          stepName="Validation Déviation"
          batchNumber={deviation.batch?.batch_number || 'N/A'}
          signatureOrder={1}
          requiresDoubleValidation={false}
        />
      )}
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
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  headerCard: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    marginBottom: Spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
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
  title: {
    ...Typography.h2,
    marginBottom: Spacing.sm,
  },
  batchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  batchText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  criticalWarningCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.error + '10',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  warningTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.error,
  },
  warningText: {
    ...Typography.caption,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  editButtonText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  description: {
    ...Typography.body,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  immediateActionBox: {
    backgroundColor: Colors.warning + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  immediateActionTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: Spacing.xs,
  },
  immediateActionText: {
    ...Typography.caption,
    color: Colors.text.primary,
  },
  metadata: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
  },
  metadataText: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  capaField: {
    marginBottom: Spacing.lg,
  },
  capaLabel: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  capaValue: {
    ...Typography.caption,
    color: Colors.text.secondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  capaInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text.primary,
  },
  capaTextArea: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },
  capaActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  saveButtonText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.surface,
  },
  validatedCard: {
    backgroundColor: Colors.success + '10',
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  validatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  validatedTitle: {
    ...Typography.h3,
    color: Colors.success,
  },
  validationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  validationLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  validationValue: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xl,
  },
  validateButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.surface,
  },
});
