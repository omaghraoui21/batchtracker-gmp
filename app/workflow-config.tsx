import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type WorkflowTemplate = Database['public']['Tables']['workflow_templates']['Row'];
type StepDefinition = Database['public']['Tables']['step_definitions']['Row'];

interface WorkflowWithSteps extends WorkflowTemplate {
  steps: StepDefinition[];
}

export default function WorkflowConfigScreen() {
  const [workflows, setWorkflows] = useState<WorkflowWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowWithSteps | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStep, setEditingStep] = useState<StepDefinition | null>(null);

  // Form state for step editing
  const [stepName, setStepName] = useState('');
  const [stepRole, setStepRole] = useState('');
  const [stepSLA, setStepSLA] = useState('');

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);

      const { data: workflowsData, error: workflowsError } = await supabase
        .from('workflow_templates')
        .select('*')
        .order('name');

      if (workflowsError) throw workflowsError;

      // Fetch steps for each workflow
      const workflowsWithSteps = await Promise.all(
        (workflowsData || []).map(async (workflow) => {
          const { data: stepsData, error: stepsError } = await supabase
            .from('step_definitions')
            .select('*')
            .eq('workflow_template_id', workflow.id)
            .order('order_index');

          if (stepsError) throw stepsError;

          return {
            ...workflow,
            steps: stepsData || [],
          };
        })
      );

      setWorkflows(workflowsWithSteps);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      Alert.alert('Erreur', 'Impossible de charger les workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkflow = (workflow: WorkflowWithSteps) => {
    setSelectedWorkflow(workflow);
  };

  const handleEditStep = (step: StepDefinition) => {
    setEditingStep(step);
    setStepName(step.name);
    setStepRole(step.required_role);
    setStepSLA(step.sla_hours.toString());
    setModalVisible(true);
  };

  const handleAddStep = () => {
    if (!selectedWorkflow) return;

    setEditingStep(null);
    setStepName('');
    setStepRole('');
    setStepSLA('24');
    setModalVisible(true);
  };

  const handleSaveStep = async () => {
    if (!selectedWorkflow) return;

    if (!stepName || !stepRole || !stepSLA) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }

    const slaHours = parseInt(stepSLA, 10);
    if (isNaN(slaHours) || slaHours <= 0) {
      Alert.alert('Erreur', 'Le SLA doit être un nombre positif');
      return;
    }

    try {
      if (editingStep) {
        // Update existing step
        const { error } = await supabase
          .from('step_definitions')
          .update({
            name: stepName,
            required_role: stepRole,
            sla_hours: slaHours,
          })
          .eq('id', editingStep.id);

        if (error) throw error;

        Alert.alert('Succès', 'Étape mise à jour avec succès');
      } else {
        // Create new step
        const maxOrder = Math.max(...selectedWorkflow.steps.map((s) => s.order_index), 0);

        const { error } = await supabase.from('step_definitions').insert({
          workflow_template_id: selectedWorkflow.id,
          name: stepName,
          required_role: stepRole,
          sla_hours: slaHours,
          order_index: maxOrder + 1,
        });

        if (error) throw error;

        Alert.alert('Succès', 'Étape ajoutée avec succès');
      }

      setModalVisible(false);
      fetchWorkflows();
    } catch (error) {
      console.error('Error saving step:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'étape');
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cette étape ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('step_definitions')
                .delete()
                .eq('id', stepId);

              if (error) throw error;

              Alert.alert('Succès', 'Étape supprimée avec succès');
              fetchWorkflows();
            } catch (error) {
              console.error('Error deleting step:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'étape');
            }
          },
        },
      ]
    );
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    if (!selectedWorkflow) return;

    const stepIndex = selectedWorkflow.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    if (targetIndex < 0 || targetIndex >= selectedWorkflow.steps.length) return;

    try {
      const step = selectedWorkflow.steps[stepIndex];
      const targetStep = selectedWorkflow.steps[targetIndex];

      // Swap order indices
      await supabase
        .from('step_definitions')
        .update({ order_index: targetStep.order_index })
        .eq('id', step.id);

      await supabase
        .from('step_definitions')
        .update({ order_index: step.order_index })
        .eq('id', targetStep.id);

      fetchWorkflows();
    } catch (error) {
      console.error('Error moving step:', error);
      Alert.alert('Erreur', 'Impossible de déplacer l\'étape');
    }
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
          title: 'Configuration du Workflow',
          headerBackTitle: 'Retour',
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Modèles de Workflow</Text>
          <Text style={styles.headerSubtitle}>
            Configurez les étapes et les rôles requis pour chaque workflow
          </Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Workflow Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sélectionner un Modèle</Text>
            {workflows.map((workflow) => (
              <TouchableOpacity
                key={workflow.id}
                onPress={() => handleSelectWorkflow(workflow)}
              >
                <Card
                  style={
                    selectedWorkflow?.id === workflow.id
                      ? { ...styles.workflowCard, ...styles.selectedWorkflowCard }
                      : styles.workflowCard
                  }
                >
                  <View style={styles.workflowHeader}>
                    <View style={styles.workflowInfo}>
                      <Text style={styles.workflowName}>{workflow.name}</Text>
                      <Text style={styles.workflowDescription}>
                        {workflow.description || 'Aucune description'}
                      </Text>
                    </View>
                    <View style={styles.stepCount}>
                      <Text style={styles.stepCountText}>{workflow.steps.length}</Text>
                      <Text style={styles.stepCountLabel}>étapes</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>

          {/* Step Configuration */}
          {selectedWorkflow && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Étapes du Workflow</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddStep}>
                  <Ionicons name="add" size={20} color={Colors.surface} />
                </TouchableOpacity>
              </View>

              {selectedWorkflow.steps.map((step, index) => (
                <Card key={step.id} style={styles.stepCard}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepOrder}>
                      <Text style={styles.stepOrderText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepInfo}>
                      <Text style={styles.stepName}>{step.name}</Text>
                      <View style={styles.stepDetails}>
                        <View style={styles.stepDetail}>
                          <Ionicons name="person-outline" size={14} color={Colors.text.secondary} />
                          <Text style={styles.stepDetailText}>{step.required_role}</Text>
                        </View>
                        <View style={styles.stepDetail}>
                          <Ionicons name="time-outline" size={14} color={Colors.text.secondary} />
                          <Text style={styles.stepDetailText}>SLA: {step.sla_hours}h</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.stepActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, index === 0 && styles.disabledButton]}
                      onPress={() => handleMoveStep(step.id, 'up')}
                      disabled={index === 0}
                    >
                      <Ionicons name="arrow-up" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        index === selectedWorkflow.steps.length - 1 && styles.disabledButton,
                      ]}
                      onPress={() => handleMoveStep(step.id, 'down')}
                      disabled={index === selectedWorkflow.steps.length - 1}
                    >
                      <Ionicons name="arrow-down" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditStep(step)}
                    >
                      <Ionicons name="create-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteStep(step.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Edit Step Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingStep ? 'Modifier l\'Étape' : 'Ajouter une Étape'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de l&apos;étape</Text>
                <TextInput
                  style={styles.input}
                  value={stepName}
                  onChangeText={setStepName}
                  placeholder="Ex: Production, QA, etc."
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Rôle requis</Text>
                <TextInput
                  style={styles.input}
                  value={stepRole}
                  onChangeText={setStepRole}
                  placeholder="Ex: Opérateur, Vérificateur, etc."
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>SLA (heures)</Text>
                <TextInput
                  style={styles.input}
                  value={stepSLA}
                  onChangeText={setStepSLA}
                  placeholder="24"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveStep}>
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  header: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
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
    marginBottom: Spacing.md,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workflowCard: {
    marginBottom: Spacing.sm,
  },
  selectedWorkflowCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workflowInfo: {
    flex: 1,
  },
  workflowName: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  workflowDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  stepCount: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  stepCountText: {
    ...Typography.h3,
    color: Colors.primary,
    fontSize: 20,
  },
  stepCountLabel: {
    ...Typography.small,
    color: Colors.primary,
    fontSize: 10,
  },
  stepCard: {
    marginBottom: Spacing.sm,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepOrder: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepOrderText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '700',
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  stepDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepDetailText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h3,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    color: Colors.text.primary,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.surface,
  },
});
