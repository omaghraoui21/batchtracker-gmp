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

type Batch = Database['public']['Tables']['batches']['Row'];
type StepInstance = Database['public']['Tables']['step_instances']['Row'] & {
  step_definition: Database['public']['Tables']['step_definitions']['Row'];
};
type Deviation = Database['public']['Tables']['deviations']['Row'];

interface BatchWithDetails extends Batch {
  steps: StepInstance[];
  deviations: Deviation[];
}

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [batch, setBatch] = useState<BatchWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBatchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);

      // Fetch batch with workflow template
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .single();

      if (batchError) throw batchError;

      // Fetch step instances with their definitions
      const { data: stepsData, error: stepsError } = await supabase
        .from('step_instances')
        .select(`
          *,
          step_definition:step_definitions(*)
        `)
        .eq('batch_id', id)
        .order('created_at', { ascending: true });

      if (stepsError) throw stepsError;

      // Fetch deviations
      const { data: deviationsData, error: deviationsError } = await supabase
        .from('deviations')
        .select('*')
        .eq('batch_id', id)
        .order('reported_at', { ascending: false });

      if (deviationsError) throw deviationsError;

      setBatch({
        ...batchData,
        steps: stepsData as StepInstance[],
        deviations: deviationsData || [],
      });
    } catch (error) {
      console.error('Error fetching batch details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du lot');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!batch) return -1;
    return batch.steps.findIndex((step) => step.id === batch.current_step_id);
  };

  const canValidateCurrentStep = () => {
    if (!batch) return false;

    const currentStepIndex = getCurrentStepIndex();
    if (currentStepIndex === -1) return false;

    const currentStep = batch.steps[currentStepIndex];
    if (currentStep.status !== 'in_progress') return false;

    // Check for critical deviations
    const hasCriticalDeviation = batch.deviations.some(
      (d) => d.severity === 'critical' && d.status === 'open'
    );

    return !hasCriticalDeviation;
  };

  const handleMarkAsReady = async () => {
    if (!batch) return;

    if (!canValidateCurrentStep()) {
      Alert.alert(
        'Validation impossible',
        'Vous ne pouvez pas valider cette étape car il y a des déviations critiques ouvertes.'
      );
      return;
    }

    Alert.alert(
      'Confirmer la validation',
      'Êtes-vous sûr de vouloir marquer cette étape comme prête ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              setActionLoading(true);
              const currentStepIndex = getCurrentStepIndex();
              const currentStep = batch.steps[currentStepIndex];

              // Update current step as completed
              await supabase
                .from('step_instances')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  decision: 'approved',
                })
                .eq('id', currentStep.id);

              // Insert history entry
              await supabase.from('step_history').insert({
                step_instance_id: currentStep.id,
                from_status: 'in_progress',
                to_status: 'completed',
              });

              // Move to next step if available
              if (currentStepIndex < batch.steps.length - 1) {
                const nextStep = batch.steps[currentStepIndex + 1];

                await supabase
                  .from('step_instances')
                  .update({
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                  })
                  .eq('id', nextStep.id);

                await supabase
                  .from('batches')
                  .update({ current_step_id: nextStep.id })
                  .eq('id', batch.id);
              } else {
                // Mark batch as completed
                await supabase
                  .from('batches')
                  .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', batch.id);
              }

              Alert.alert('Succès', 'Étape validée avec succès');
              fetchBatchDetails();
            } catch (error) {
              console.error('Error validating step:', error);
              Alert.alert('Erreur', 'Impossible de valider l\'étape');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReportDeviation = () => {
    // Navigate to deviation reporting screen (to be implemented)
    Alert.alert('Signaler une Déviation', 'Fonctionnalité à venir');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Colors.success;
      case 'in_progress':
        return Colors.primary;
      case 'pending':
        return Colors.text.tertiary;
      case 'blocked':
        return Colors.error;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'in_progress':
        return 'En cours';
      case 'pending':
        return 'En attente';
      case 'blocked':
        return 'Bloquée';
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

  const calculateSLAStatus = (step: StepInstance) => {
    if (!step.sla_deadline) return null;

    const now = new Date();
    const deadline = new Date(step.sla_deadline);

    if (step.status === 'completed') {
      const completedAt = new Date(step.completed_at!);
      return completedAt > deadline ? 'overdue' : 'on-time';
    }

    return now > deadline ? 'overdue' : 'on-time';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!batch) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
        <Text style={styles.errorText}>Lot introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <>
      <Stack.Screen
        options={{
          title: `Lot #${batch.batch_number}`,
          headerBackTitle: 'Retour',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.batchNumber}>Lot #{batch.batch_number}</Text>
              <Text style={styles.productName}>{batch.product_name}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(batch.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(batch.status) }]}>
                {batch.status === 'active' ? 'En production' : 'Terminé'}
              </Text>
            </View>
          </View>
          {batch.priority === 'high' && (
            <View style={styles.priorityBanner}>
              <Ionicons name="flag" size={16} color={Colors.error} />
              <Text style={styles.priorityText}>Priorité élevée</Text>
            </View>
          )}
        </Card>

        {/* Critical Deviations Warning */}
        {batch.deviations.filter((d) => d.severity === 'critical' && d.status === 'open').length > 0 && (
          <Card style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={24} color={Colors.error} />
              <Text style={styles.warningTitle}>Déviations Critiques</Text>
            </View>
            <Text style={styles.warningText}>
              {batch.deviations.filter((d) => d.severity === 'critical' && d.status === 'open').length} déviation(s) critique(s) ouverte(s)
            </Text>
            <Text style={styles.warningSubtext}>
              La validation de cette étape est bloquée
            </Text>
          </Card>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline des Étapes</Text>

          <Card style={styles.timelineCard}>
            {batch.steps.map((step, index) => {
              const slaStatus = calculateSLAStatus(step);
              const isOverdue = slaStatus === 'overdue';

              return (
                <View key={step.id}>
                  <View style={styles.timelineItem}>
                    {/* Step indicator */}
                    <View style={styles.timelineIndicator}>
                      <View
                        style={[
                          styles.timelineDot,
                          {
                            backgroundColor: getStatusColor(step.status),
                            borderColor: getStatusColor(step.status),
                          },
                        ]}
                      >
                        {step.status === 'completed' && (
                          <Ionicons name="checkmark" size={16} color={Colors.surface} />
                        )}
                        {step.status === 'in_progress' && (
                          <View style={styles.pulsingDot} />
                        )}
                      </View>
                      {index < batch.steps.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            {
                              backgroundColor:
                                step.status === 'completed'
                                  ? Colors.success
                                  : Colors.border,
                            },
                          ]}
                        />
                      )}
                    </View>

                    {/* Step content */}
                    <View style={styles.timelineContent}>
                      <View style={styles.stepHeader}>
                        <Text style={styles.stepName}>
                          {step.step_definition?.name || 'Étape'}
                        </Text>
                        {isOverdue && (
                          <View style={styles.slaWarning}>
                            <Ionicons name="time-outline" size={14} color={Colors.error} />
                            <Text style={styles.slaWarningText}>Hors SLA</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.stepDetails}>
                        <View style={styles.stepDetailRow}>
                          <Ionicons name="person-outline" size={14} color={Colors.text.secondary} />
                          <Text style={styles.stepDetailText}>
                            {step.step_definition?.required_role || 'Non assigné'}
                          </Text>
                        </View>

                        {step.started_at && (
                          <View style={styles.stepDetailRow}>
                            <Ionicons name="time-outline" size={14} color={Colors.text.secondary} />
                            <Text style={styles.stepDetailText}>
                              Démarrée: {formatDate(step.started_at)}
                            </Text>
                          </View>
                        )}

                        {step.completed_at && (
                          <View style={styles.stepDetailRow}>
                            <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
                            <Text style={styles.stepDetailText}>
                              Terminée: {formatDate(step.completed_at)}
                            </Text>
                          </View>
                        )}

                        {step.sla_deadline && (
                          <View style={styles.stepDetailRow}>
                            <Ionicons
                              name="alarm-outline"
                              size={14}
                              color={isOverdue ? Colors.error : Colors.text.secondary}
                            />
                            <Text
                              style={[
                                styles.stepDetailText,
                                isOverdue && { color: Colors.error },
                              ]}
                            >
                              SLA: {formatDate(step.sla_deadline)}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={[styles.stepStatusBadge, { backgroundColor: getStatusColor(step.status) + '15' }]}>
                        <Text style={[styles.stepStatusText, { color: getStatusColor(step.status) }]}>
                          {getStatusLabel(step.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>

        {/* Deviations */}
        {batch.deviations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Déviations ({batch.deviations.length})
            </Text>
            {batch.deviations.map((deviation) => (
              <Card key={deviation.id} style={styles.deviationCard}>
                <View style={styles.deviationHeader}>
                  <View
                    style={[
                      styles.severityBadge,
                      {
                        backgroundColor:
                          deviation.severity === 'critical'
                            ? Colors.error + '20'
                            : deviation.severity === 'major'
                            ? Colors.warning + '20'
                            : Colors.text.tertiary + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        {
                          color:
                            deviation.severity === 'critical'
                              ? Colors.error
                              : deviation.severity === 'major'
                              ? Colors.warning
                              : Colors.text.secondary,
                        },
                      ]}
                    >
                      {deviation.severity === 'critical'
                        ? 'Critique'
                        : deviation.severity === 'major'
                        ? 'Majeure'
                        : 'Mineure'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.deviationStatusBadge,
                      {
                        backgroundColor:
                          deviation.status === 'open'
                            ? Colors.error + '15'
                            : Colors.success + '15',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deviationStatusText,
                        {
                          color: deviation.status === 'open' ? Colors.error : Colors.success,
                        },
                      ]}
                    >
                      {deviation.status === 'open' ? 'Ouvert' : 'Résolu'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.deviationTitle}>{deviation.title}</Text>
                <Text style={styles.deviationDescription}>{deviation.description}</Text>
                <Text style={styles.deviationDate}>
                  Signalée le {formatDate(deviation.reported_at)}
                </Text>
              </Card>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        {batch.status === 'active' && currentStepIndex >= 0 && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!canValidateCurrentStep() || actionLoading) && styles.disabledButton,
              ]}
              onPress={handleMarkAsReady}
              disabled={!canValidateCurrentStep() || actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.surface} />
                  <Text style={styles.primaryButtonText}>Marquer comme Prêt</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleReportDeviation}>
              <Ionicons name="warning-outline" size={20} color={Colors.primary} />
              <Text style={styles.secondaryButtonText}>Signaler une Déviation</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingBottom: Spacing.xl * 2,
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
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
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
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '700',
  },
  priorityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  priorityText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
  },
  warningCard: {
    marginBottom: Spacing.lg,
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
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  warningSubtext: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  timelineCard: {
    padding: Spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    zIndex: 1,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    position: 'absolute',
    top: 32,
    bottom: -16,
    left: 15,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stepName: {
    ...Typography.body,
    fontWeight: '700',
  },
  slaWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.error + '15',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  slaWarningText: {
    ...Typography.small,
    color: Colors.error,
    fontWeight: '600',
    fontSize: 11,
  },
  stepDetails: {
    marginBottom: Spacing.sm,
    gap: 4,
  },
  stepDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stepDetailText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  stepStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  stepStatusText: {
    ...Typography.small,
    fontWeight: '600',
    fontSize: 11,
  },
  deviationCard: {
    marginBottom: Spacing.sm,
  },
  deviationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
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
  deviationStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  deviationStatusText: {
    ...Typography.small,
    fontWeight: '600',
    fontSize: 11,
  },
  deviationTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  deviationDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  deviationDate: {
    ...Typography.small,
    color: Colors.text.tertiary,
    fontSize: 11,
  },
  actionButtons: {
    gap: Spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.xs,
  },
  secondaryButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
});
