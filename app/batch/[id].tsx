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
import ElectronicSignatureModal, { SignatureData } from '@/components/ElectronicSignatureModal';
import DeviationReportModal, { DeviationFormData } from '@/components/DeviationReportModal';
import * as Haptics from 'expo-haptics';
import { generateText } from '@fastshot/ai';

type Batch = Database['public']['Tables']['batches']['Row'];
type StepInstance = Database['public']['Tables']['step_instances']['Row'] & {
  step_definition: Database['public']['Tables']['step_definitions']['Row'] | null;
};
type Deviation = Database['public']['Tables']['deviations']['Row'];
type ElectronicSignature = Database['public']['Tables']['electronic_signatures']['Row'];

interface BatchWithDetails extends Batch {
  steps: (StepInstance & { signatures: ElectronicSignature[] })[];
  deviations: Deviation[];
}

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [batch, setBatch] = useState<BatchWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [currentSigningStep, setCurrentSigningStep] = useState<StepInstance | null>(null);
  const [signatureOrder, setSignatureOrder] = useState<1 | 2>(1);
  const [deviationModalVisible, setDeviationModalVisible] = useState(false);

  useEffect(() => {
    fetchBatchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);

      // Fetch batch
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .single();

      if (batchError) throw batchError;

      // Fetch step instances with definitions and signatures
      const { data: stepsData, error: stepsError } = await supabase
        .from('step_instances')
        .select(`
          *,
          step_definition:step_definitions(*)
        `)
        .eq('batch_id', id)
        .order('created_at', { ascending: true });

      if (stepsError) throw stepsError;

      // Fetch signatures for all steps
      const stepIds = stepsData?.map((s) => s.id) || [];
      const { data: signaturesData } = await supabase
        .from('electronic_signatures')
        .select('*')
        .in('step_instance_id', stepIds)
        .order('signature_order', { ascending: true });

      // Map signatures to steps
      const stepsWithSignatures = (stepsData as StepInstance[] || []).map((step) => ({
        ...step,
        signatures: signaturesData?.filter((sig) => sig.step_instance_id === step.id) || [],
      }));

      // Fetch deviations
      const { data: deviationsData, error: deviationsError } = await supabase
        .from('deviations')
        .select('*')
        .eq('batch_id', id)
        .order('reported_at', { ascending: false });

      if (deviationsError) throw deviationsError;

      setBatch({
        ...batchData,
        steps: stepsWithSignatures,
        deviations: deviationsData || [],
      });
    } catch (error) {
      console.error('Error fetching batch details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du lot');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (step: StepInstance) => {
    try {
      setActionLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Mock user data - in production, get from auth context
      const mockUserId = 'user-123';
      const mockUserName = 'Jean Dupont';

      // Update step assignment
      await supabase
        .from('step_instances')
        .update({
          assigned_to: mockUserName,
          assigned_at: new Date().toISOString(),
          status: 'in_progress',
          started_at: step.started_at || new Date().toISOString(),
        })
        .eq('id', step.id);

      // Insert history entry
      await supabase.from('step_history').insert({
        step_instance_id: step.id,
        from_status: step.status,
        to_status: 'in_progress',
        changed_by: mockUserId,
        notes: `Check-in par ${mockUserName}`,
      });

      Alert.alert('Check-in Réussi', `Vous êtes maintenant assigné à cette étape`);
      fetchBatchDetails();
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Erreur', 'Impossible de s\'assigner à cette étape');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenSignatureModal = (step: StepInstance & { signatures: ElectronicSignature[] }) => {
    const requiresDoubleValidation = step.step_definition?.requires_double_validation || false;
    const existingSignatures = step.signatures.length;

    if (requiresDoubleValidation && existingSignatures >= 2) {
      Alert.alert('Info', 'Cette étape a déjà été validée par deux signatures');
      return;
    }

    if (!requiresDoubleValidation && existingSignatures >= 1) {
      Alert.alert('Info', 'Cette étape a déjà été signée');
      return;
    }

    setCurrentSigningStep(step);
    setSignatureOrder(existingSignatures === 0 ? 1 : 2);
    setSignatureModalVisible(true);
  };

  const handleSign = async (signatureData: SignatureData) => {
    if (!currentSigningStep || !batch) return;

    try {
      setActionLoading(true);

      // Mock user ID - in production, get from auth context
      const mockUserId = 'user-123';

      // Create electronic signature
      const { error: signatureError } = await supabase
        .from('electronic_signatures')
        .insert({
          step_instance_id: currentSigningStep.id,
          signer_user_id: mockUserId,
          signer_name: signatureData.signerName,
          signer_role: signatureData.signerRole,
          signature_type: signatureData.signatureType,
          signature_order: signatureData.signatureOrder,
          comments: signatureData.comments,
        });

      if (signatureError) throw signatureError;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Check if step can be completed
      const requiresDoubleValidation =
        currentSigningStep.step_definition?.requires_double_validation || false;
      const canComplete =
        !requiresDoubleValidation ||
        (requiresDoubleValidation && signatureData.signatureOrder === 2);

      if (canComplete) {
        // Complete current step
        await supabase
          .from('step_instances')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            decision: 'approved',
          })
          .eq('id', currentSigningStep.id);

        // Insert history entry
        await supabase.from('step_history').insert({
          step_instance_id: currentSigningStep.id,
          from_status: 'in_progress',
          to_status: 'completed',
          notes: `Validé avec signature électronique par ${signatureData.signerName}`,
        });

        // Move to next step if available
        const currentIndex = batch.steps.findIndex((s) => s.id === currentSigningStep.id);
        if (currentIndex < batch.steps.length - 1) {
          const nextStep = batch.steps[currentIndex + 1];

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

        Alert.alert('Succès', 'Étape validée et signature enregistrée');
      } else {
        Alert.alert(
          'Première Signature',
          'Première signature enregistrée. Une deuxième signature est requise pour valider cette étape.'
        );
      }

      fetchBatchDetails();
    } catch (error) {
      console.error('Error signing:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la signature');
    } finally {
      setActionLoading(false);
      setSignatureModalVisible(false);
      setCurrentSigningStep(null);
    }
  };

  const handleReportDeviation = () => {
    setDeviationModalVisible(true);
  };

  const handleSubmitDeviation = async (data: DeviationFormData) => {
    try {
      // Mock user data - in production, get from auth context
      const mockUserName = 'Jean Dupont';

      const { error } = await supabase.from('deviations').insert({
        title: data.title,
        description: data.description,
        severity: data.severity,
        immediate_action: data.immediateAction,
        batch_id: id,
        step_instance_id: data.stepInstanceId,
        reported_by: mockUserName,
        reported_at: new Date().toISOString(),
        status: 'open',
      });

      if (error) throw error;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Succès', 'Déviation enregistrée avec succès');
      fetchBatchDetails();
    } catch (error) {
      console.error('Error reporting deviation:', error);
      throw error;
    }
  };

  const handleAIAnalyze = async (description: string) => {
    try {
      // Use Newell AI to analyze the deviation and suggest severity and actions
      const prompt = `Tu es un expert en qualité pharmaceutique GMP. Analyse cette déviation et fournis:
1. Niveau de criticité (mineure/majeure/critique)
2. Actions immédiates recommandées

Déviation: ${description}

Réponds au format JSON:
{
  "severity": "minor|major|critical",
  "actions": "description des actions immédiates"
}`;

      const aiResponse = await generateText({ prompt });

      // Parse AI response
      try {
        // Try to extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            suggestedSeverity: parsed.severity as 'minor' | 'major' | 'critical',
            suggestedActions: parsed.actions,
          };
        }
      } catch {
        console.log('Could not parse AI response as JSON, using fallback');
      }

      // Fallback: analyze keywords in description
      const lowerDesc = description.toLowerCase();
      let suggestedSeverity: 'minor' | 'major' | 'critical' = 'minor';

      if (
        lowerDesc.includes('critique') ||
        lowerDesc.includes('danger') ||
        lowerDesc.includes('contamination') ||
        lowerDesc.includes('toxique') ||
        lowerDesc.includes('sécurité')
      ) {
        suggestedSeverity = 'critical';
      } else if (
        lowerDesc.includes('majeur') ||
        lowerDesc.includes('important') ||
        lowerDesc.includes('écart') ||
        lowerDesc.includes('hors spécification')
      ) {
        suggestedSeverity = 'major';
      }

      return {
        suggestedSeverity,
        suggestedActions:
          'Isoler le lot concerné, documenter l\'écart observé, informer immédiatement le superviseur et le service qualité.',
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fallback on error
      return {
        suggestedSeverity: 'minor' as const,
        suggestedActions:
          'Documenter l\'écart et informer le superviseur pour évaluation.',
      };
    }
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
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(batch.status) + '20' },
              ]}
            >
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
        {batch.deviations.filter((d) => d.severity === 'critical' && d.status === 'open')
          .length > 0 && (
          <Card style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={24} color={Colors.error} />
              <Text style={styles.warningTitle}>Déviations Critiques</Text>
            </View>
            <Text style={styles.warningText}>
              {batch.deviations.filter((d) => d.severity === 'critical' && d.status === 'open').length}{' '}
              déviation(s) critique(s) ouverte(s)
            </Text>
            <Text style={styles.warningSubtext}>La validation est bloquée</Text>
          </Card>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline des Étapes</Text>

          <Card style={styles.timelineCard}>
            {batch.steps.map((step, index) => {
              const slaStatus = calculateSLAStatus(step);
              const isOverdue = slaStatus === 'overdue';
              const requiresDoubleValidation =
                step.step_definition?.requires_double_validation || false;
              const hasFirstSignature = step.signatures.length >= 1;
              const hasSecondSignature = step.signatures.length >= 2;
              const canCheckIn = step.status === 'pending' && !step.assigned_to;
              const canSign =
                step.status === 'in_progress' &&
                (!requiresDoubleValidation || step.signatures.length < 2);

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
                                step.status === 'completed' ? Colors.success : Colors.border,
                            },
                          ]}
                        />
                      )}
                    </View>

                    {/* Step content */}
                    <View style={styles.timelineContent}>
                      <View style={styles.stepHeader}>
                        <View style={styles.stepHeaderLeft}>
                          <Text style={styles.stepName}>
                            {step.step_definition?.name || 'Étape'}
                          </Text>
                          {requiresDoubleValidation && (
                            <View style={styles.doubleValidationBadge}>
                              <Ionicons name="people" size={12} color={Colors.primary} />
                              <Text style={styles.doubleValidationText}>Double</Text>
                            </View>
                          )}
                        </View>
                        {isOverdue && (
                          <View style={styles.slaWarning}>
                            <Ionicons name="time-outline" size={14} color={Colors.error} />
                            <Text style={styles.slaWarningText}>Hors SLA</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.stepDetails}>
                        <View style={styles.stepDetailRow}>
                          <Ionicons
                            name="person-outline"
                            size={14}
                            color={Colors.text.secondary}
                          />
                          <Text style={styles.stepDetailText}>
                            {step.step_definition?.required_role || 'Non assigné'}
                          </Text>
                        </View>

                        {step.assigned_to && (
                          <View style={styles.assignedRow}>
                            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                            <Text style={[styles.stepDetailText, { color: Colors.primary }]}>
                              En cours par: {step.assigned_to}
                            </Text>
                          </View>
                        )}

                        {step.started_at && (
                          <View style={styles.stepDetailRow}>
                            <Ionicons
                              name="time-outline"
                              size={14}
                              color={Colors.text.secondary}
                            />
                            <Text style={styles.stepDetailText}>
                              Démarrée: {formatDate(step.started_at)}
                            </Text>
                          </View>
                        )}

                        {step.completed_at && (
                          <View style={styles.stepDetailRow}>
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={14}
                              color={Colors.success}
                            />
                            <Text style={styles.stepDetailText}>
                              Terminée: {formatDate(step.completed_at)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Signatures */}
                      {step.signatures.length > 0 && (
                        <View style={styles.signaturesContainer}>
                          <Text style={styles.signaturesTitle}>Signatures:</Text>
                          {step.signatures.map((sig) => (
                            <View key={sig.id} style={styles.signatureRow}>
                              <Ionicons name="create" size={14} color={Colors.success} />
                              <Text style={styles.signatureText}>
                                {sig.signature_order === 1 ? '1ère' : '2ème'}: {sig.signer_name} (
                                {sig.signer_role}) -{' '}
                                {new Date(sig.signed_at).toLocaleString('fr-FR')}
                              </Text>
                            </View>
                          ))}
                          {requiresDoubleValidation && hasFirstSignature && !hasSecondSignature && (
                            <Text style={styles.pendingSignatureText}>
                              ⏳ En attente de la 2ème signature
                            </Text>
                          )}
                        </View>
                      )}

                      <View
                        style={[
                          styles.stepStatusBadge,
                          { backgroundColor: getStatusColor(step.status) + '15' },
                        ]}
                      >
                        <Text
                          style={[styles.stepStatusText, { color: getStatusColor(step.status) }]}
                        >
                          {getStatusLabel(step.status)}
                        </Text>
                      </View>

                      {/* Step Actions */}
                      {(canCheckIn || canSign) && (
                        <View style={styles.stepActions}>
                          {canCheckIn && (
                            <TouchableOpacity
                              style={styles.checkInButton}
                              onPress={() => handleCheckIn(step)}
                              disabled={actionLoading}
                            >
                              <Ionicons name="log-in" size={16} color={Colors.primary} />
                              <Text style={styles.checkInButtonText}>Check-in</Text>
                            </TouchableOpacity>
                          )}
                          {canSign && (
                            <TouchableOpacity
                              style={styles.signButton}
                              onPress={() => handleOpenSignatureModal(step)}
                              disabled={actionLoading}
                            >
                              <Ionicons name="create" size={16} color={Colors.surface} />
                              <Text style={styles.signButtonText}>
                                {requiresDoubleValidation && hasFirstSignature
                                  ? 'Signer (2ème)'
                                  : 'Signer'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
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
            <Text style={styles.sectionTitle}>Déviations ({batch.deviations.length})</Text>
            {batch.deviations.map((deviation) => (
              <TouchableOpacity
                key={deviation.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/deviations/${deviation.id}`)}
              >
                <Card style={styles.deviationCard}>
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
                              : deviation.status === 'investigating'
                              ? Colors.warning + '15'
                              : Colors.success + '15',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.deviationStatusText,
                          {
                            color:
                              deviation.status === 'open'
                                ? Colors.error
                                : deviation.status === 'investigating'
                                ? Colors.warning
                                : Colors.success,
                          },
                        ]}
                      >
                        {deviation.status === 'open'
                          ? 'Ouverte'
                          : deviation.status === 'investigating'
                          ? 'Investigation'
                          : 'Clôturée'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.deviationTitle}>{deviation.title}</Text>
                  <Text style={styles.deviationDescription} numberOfLines={2}>
                    {deviation.description}
                  </Text>
                  <View style={styles.deviationFooter}>
                    <Text style={styles.deviationDate}>
                      Signalée le {formatDate(deviation.reported_at)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Deviation Report Button */}
        {batch.status === 'active' && (
          <TouchableOpacity style={styles.deviationReportButton} onPress={handleReportDeviation}>
            <Ionicons name="warning-outline" size={20} color={Colors.error} />
            <Text style={styles.deviationReportButtonText}>Signaler une Déviation</Text>
          </TouchableOpacity>
        )}

        {/* eBMR PDF Generation Button */}
        {batch.status === 'completed' && (
          <TouchableOpacity
            style={styles.pdfGenerateButton}
            onPress={() => router.push(`/ebmr/${batch.id}`)}
          >
            <Ionicons name="document-text" size={20} color={Colors.surface} />
            <Text style={styles.pdfGenerateButtonText}>
              Générer le Dossier de Lot (PDF)
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Electronic Signature Modal */}
      {currentSigningStep && batch && (
        <ElectronicSignatureModal
          visible={signatureModalVisible}
          onClose={() => {
            setSignatureModalVisible(false);
            setCurrentSigningStep(null);
          }}
          onSign={handleSign}
          stepName={currentSigningStep.step_definition?.name || 'Étape'}
          batchNumber={batch.batch_number}
          signatureOrder={signatureOrder}
          requiresDoubleValidation={
            currentSigningStep.step_definition?.requires_double_validation || false
          }
          existingSignature={
            batch.steps.find((s) => s.id === currentSigningStep.id)?.signatures[0]
              ? {
                  signerName: batch.steps.find((s) => s.id === currentSigningStep.id)!.signatures[0].signer_name,
                  signerRole: batch.steps.find((s) => s.id === currentSigningStep.id)!.signatures[0].signer_role,
                  signedAt: batch.steps.find((s) => s.id === currentSigningStep.id)!.signatures[0].signed_at,
                }
              : undefined
          }
        />
      )}

      {/* Deviation Report Modal */}
      {batch && (
        <DeviationReportModal
          visible={deviationModalVisible}
          onClose={() => setDeviationModalVisible(false)}
          onSubmit={handleSubmitDeviation}
          batchNumber={batch.batch_number}
          batchId={batch.id}
          onAIAnalyze={handleAIAnalyze}
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
  stepHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  stepName: {
    ...Typography.body,
    fontWeight: '700',
  },
  doubleValidationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  doubleValidationText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 10,
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
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    alignSelf: 'flex-start',
  },
  stepDetailText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  signaturesContainer: {
    backgroundColor: Colors.success + '05',
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderLeftWidth: 2,
    borderLeftColor: Colors.success,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  signaturesTitle: {
    ...Typography.small,
    fontWeight: '600',
    marginBottom: 4,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  signatureText: {
    ...Typography.small,
    color: Colors.text.secondary,
    flex: 1,
  },
  pendingSignatureText: {
    ...Typography.small,
    color: Colors.warning,
    fontStyle: 'italic',
    marginTop: 4,
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
  stepActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  checkInButtonText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },
  signButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  signButtonText: {
    ...Typography.small,
    color: Colors.surface,
    fontWeight: '600',
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
  deviationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deviationReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xl,
  },
  deviationReportButtonText: {
    ...Typography.body,
    color: Colors.error,
    fontWeight: '600',
  },
  pdfGenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xl,
  },
  pdfGenerateButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '700',
  },
});
