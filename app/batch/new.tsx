import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import type { Database } from '@/lib/database.types';
import { logBatchCreation, logDraftBatchCreation, logQRGeneration } from '@/lib/auditLog';
import { assignBatchAutomatically } from '@/lib/assignmentEngine';

type WorkflowTemplate = Database['public']['Tables']['workflow_templates']['Row'];

interface BatchFormData {
  batchNumber: string;
  productName: string;
  dossierType: 'production' | 'packaging' | 'quality' | 'research';
  manufacturingDate: Date;
  expiryDate: Date;
  assignedTo: string;
  workflowTemplateId: string;
  priority: 'high' | 'normal' | 'low';
}

export default function NewBatchScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingUnique, setCheckingUnique] = useState(false);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [showManufacturingDatePicker, setShowManufacturingDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [batchNumberError, setBatchNumberError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftBatchId, setDraftBatchId] = useState<string | null>(null); // Track draft batch ID

  const [formData, setFormData] = useState<BatchFormData>({
    batchNumber: '',
    productName: '',
    dossierType: 'production',
    manufacturingDate: new Date(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    assignedTo: '',
    workflowTemplateId: '',
    priority: 'normal',
  });

  useEffect(() => {
    fetchWorkflowTemplates();
  }, []);

  const fetchWorkflowTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setWorkflowTemplates(data || []);

      // Set first template as default
      if (data && data.length > 0) {
        setFormData((prev) => ({ ...prev, workflowTemplateId: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
      Alert.alert('Erreur', 'Impossible de charger les modèles de workflow');
    }
  };

  const checkBatchNumberUnique = async (batchNumber: string) => {
    if (!batchNumber.trim()) {
      setBatchNumberError(null);
      return false;
    }

    try {
      setCheckingUnique(true);
      const { data, error } = await supabase
        .from('batches')
        .select('batch_number')
        .eq('batch_number', batchNumber)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is what we want
        throw error;
      }

      if (data) {
        setBatchNumberError('Ce numéro de lot existe déjà');
        return false;
      }

      setBatchNumberError(null);
      return true;
    } catch (error) {
      console.error('Error checking batch number:', error);
      return false;
    } finally {
      setCheckingUnique(false);
    }
  };

  const handleBatchNumberBlur = () => {
    checkBatchNumberUnique(formData.batchNumber);
  };

  const generateQRCodeData = (batchId: string): string => {
    // Format: BATCH:{batch_id}
    return `BATCH:${batchId}`;
  };

  const validateForm = (): boolean => {
    if (!formData.batchNumber.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un numéro de lot');
      return false;
    }

    if (!formData.productName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom de produit');
      return false;
    }

    if (!formData.workflowTemplateId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un modèle de workflow');
      return false;
    }

    if (!formData.assignedTo.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom de l&apos;assigné');
      return false;
    }

    if (formData.expiryDate <= formData.manufacturingDate) {
      Alert.alert('Erreur', 'La date d\'expiration doit être après la date de fabrication');
      return false;
    }

    if (batchNumberError) {
      Alert.alert('Erreur', 'Le numéro de lot n\'est pas valide');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Mock user ID - in production, get from auth context
      const mockUserId = 'user-123';

      let batchData;

      if (draftBatchId) {
        // Update existing draft to 'en_cours' status
        const { data: updatedBatch, error: updateError } = await supabase
          .from('batches')
          .update({
            assigned_to: formData.assignedTo,
            priority: formData.priority,
            batch_status: 'en_cours', // Move from brouillon to en_cours
            manufacturing_date: formData.manufacturingDate.toISOString(),
            expiry_date: formData.expiryDate.toISOString(),
          })
          .eq('id', draftBatchId)
          .select()
          .single();

        if (updateError) {
          Alert.alert(
            'Erreur de finalisation',
            `Impossible de finaliser le lot: ${updateError.message}`,
            [{ text: 'OK' }]
          );
          return;
        }

        batchData = updatedBatch;

        // Generate QR code data using the secure qr_token
        if (batchData.qr_token) {
          const qrCodeData = `BATCH:${batchData.qr_token}`;
          await supabase
            .from('batches')
            .update({ qr_code_data: qrCodeData })
            .eq('id', batchData.id);
        }
      } else {
        // Fallback: create batch directly (shouldn't happen with draft-first flow)
        const { data: newBatch, error: batchError } = await supabase
          .from('batches')
          .insert({
            batch_number: formData.batchNumber,
            product_name: formData.productName,
            dossier_type: formData.dossierType,
            manufacturing_date: formData.manufacturingDate.toISOString(),
            expiry_date: formData.expiryDate.toISOString(),
            assigned_to: formData.assignedTo,
            workflow_template_id: formData.workflowTemplateId,
            priority: formData.priority,
            status: 'active',
            batch_status: 'en_cours',
            created_by: mockUserId,
          })
          .select()
          .single();

        if (batchError) {
          Alert.alert(
            'Erreur de création',
            `Impossible de créer le lot: ${batchError.message}`,
            [{ text: 'OK' }]
          );
          return;
        }

        batchData = newBatch;

        // Generate QR code data
        if (batchData.qr_token) {
          const qrCodeData = `BATCH:${batchData.qr_token}`;
          await supabase
            .from('batches')
            .update({ qr_code_data: qrCodeData })
            .eq('id', batchData.id);
        }
      }

      // Fetch step definitions for this workflow
      const { data: stepDefinitions, error: stepsError } = await supabase
        .from('step_definitions')
        .select('*')
        .eq('workflow_template_id', formData.workflowTemplateId)
        .order('order_index', { ascending: true });

      if (stepsError) throw stepsError;

      // Create step instances
      if (stepDefinitions && stepDefinitions.length > 0) {
        const stepInstances = stepDefinitions.map((stepDef, index) => ({
          batch_id: batchData.id,
          step_definition_id: stepDef.id,
          status: index === 0 ? 'in_progress' : 'pending',
          started_at: index === 0 ? new Date().toISOString() : null,
          sla_deadline: new Date(Date.now() + stepDef.sla_hours * 60 * 60 * 1000).toISOString(),
        }));

        const { data: createdSteps, error: insertStepsError } = await supabase
          .from('step_instances')
          .insert(stepInstances)
          .select();

        if (insertStepsError) throw insertStepsError;

        // Set current step to first step
        if (createdSteps && createdSteps.length > 0) {
          await supabase
            .from('batches')
            .update({ current_step_id: createdSteps[0].id })
            .eq('id', batchData.id);

          // Phase 10: Try automatic assignment for first step
          const firstStepDef = stepDefinitions[0];
          const assignmentResult = await assignBatchAutomatically(
            batchData.id,
            firstStepDef.id,
            mockUserId,
            'Admin User',
            'ADMIN'
          );

          if (!assignmentResult.success && assignmentResult.reason) {
            // Show info that no automatic assignment was possible
            console.log('No automatic assignment:', assignmentResult.reason);
          }
        }
      }

      // Log batch creation for audit trail
      await logBatchCreation(
        batchData.id,
        batchData.batch_number,
        mockUserId,
        'Admin User', // In production, get from auth context
        'ADMIN',
        batchData.product_name
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Automatically redirect to newly created batch details
      router.replace(`/batch/${batchData.id}`);
    } catch (error) {
      console.error('Error creating batch:', error);
      Alert.alert('Erreur', 'Impossible de créer le lot');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      // Validate Step 1: Identification
      if (!formData.batchNumber.trim()) {
        Alert.alert('Erreur', 'Veuillez saisir un numéro de lot');
        return;
      }
      if (batchNumberError) {
        Alert.alert('Erreur', 'Le numéro de lot n\'est pas valide');
        return;
      }
      if (!formData.productName.trim()) {
        Alert.alert('Erreur', 'Veuillez saisir un nom de produit');
        return;
      }
      if (!formData.workflowTemplateId) {
        Alert.alert('Erreur', 'Veuillez sélectionner un modèle de workflow');
        return;
      }

      // Final check for uniqueness before proceeding
      const isUnique = await checkBatchNumberUnique(formData.batchNumber);
      if (!isUnique) {
        Alert.alert('Erreur', 'Ce numéro de lot existe déjà');
        return;
      }

      // Phase 10: Save draft after Step 1
      if (!draftBatchId) {
        try {
          setLoading(true);
          const mockUserId = 'user-123';

          const { data: draftBatch, error: draftError } = await supabase
            .from('batches')
            .insert({
              batch_number: formData.batchNumber,
              product_name: formData.productName,
              dossier_type: formData.dossierType,
              workflow_template_id: formData.workflowTemplateId,
              batch_status: 'brouillon', // Draft status
              status: 'active',
              created_by: mockUserId,
            })
            .select()
            .single();

          if (draftError) {
            // Show detailed error message
            Alert.alert(
              'Erreur de création',
              `Impossible de créer le brouillon: ${draftError.message}`,
              [{ text: 'OK' }]
            );
            return;
          }

          setDraftBatchId(draftBatch.id);

          // Log draft creation
          await logDraftBatchCreation(
            draftBatch.id,
            draftBatch.batch_number,
            mockUserId,
            'Admin User',
            'ADMIN',
            draftBatch.product_name
          );

          // Log QR generation
          if (draftBatch.qr_token) {
            await logQRGeneration(
              draftBatch.id,
              draftBatch.batch_number,
              mockUserId,
              'Admin User',
              'ADMIN',
              draftBatch.qr_token
            );
          }

          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.error('Error creating draft:', error);
          Alert.alert('Erreur', 'Impossible de sauvegarder le brouillon');
          return;
        } finally {
          setLoading(false);
        }
      }
    }

    if (currentStep === 2) {
      // Validate Step 2: Dates
      if (formData.expiryDate <= formData.manufacturingDate) {
        Alert.alert('Erreur', 'La date d\'expiration doit être après la date de fabrication');
        return;
      }

      // Update draft with dates
      if (draftBatchId) {
        try {
          setLoading(true);
          await supabase
            .from('batches')
            .update({
              manufacturing_date: formData.manufacturingDate.toISOString(),
              expiry_date: formData.expiryDate.toISOString(),
            })
            .eq('id', draftBatchId);
        } catch (error) {
          console.error('Error updating draft dates:', error);
        } finally {
          setLoading(false);
        }
      }
    }

    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDossierTypeLabel = (type: string) => {
    switch (type) {
      case 'production':
        return 'Production';
      case 'packaging':
        return 'Conditionnement';
      case 'quality':
        return 'Qualité';
      case 'research':
        return 'Recherche';
      default:
        return type;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return Colors.error;
      case 'low':
        return Colors.text.tertiary;
      default:
        return Colors.primary;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Nouveau Lot',
          headerBackTitle: 'Annuler',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressSteps}>
            {[1, 2, 3].map((step) => (
              <View key={step} style={styles.progressStepContainer}>
                <View
                  style={[
                    styles.progressStep,
                    currentStep >= step && styles.progressStepActive,
                    currentStep > step && styles.progressStepCompleted,
                  ]}
                >
                  {currentStep > step ? (
                    <Ionicons name="checkmark" size={16} color={Colors.surface} />
                  ) : (
                    <Text
                      style={[
                        styles.progressStepText,
                        currentStep >= step && styles.progressStepTextActive,
                      ]}
                    >
                      {step}
                    </Text>
                  )}
                </View>
                {step < 3 && (
                  <View
                    style={[
                      styles.progressLine,
                      currentStep > step && styles.progressLineActive,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressLabel, currentStep === 1 && styles.progressLabelActive]}>
              Informations
            </Text>
            <Text style={[styles.progressLabel, currentStep === 2 && styles.progressLabelActive]}>
              Dates
            </Text>
            <Text style={[styles.progressLabel, currentStep === 3 && styles.progressLabelActive]}>
              Assignation
            </Text>
          </View>
        </View>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card style={styles.formCard}>
            <Text style={styles.stepTitle}>Informations de Base</Text>
            <Text style={styles.stepSubtitle}>Définissez les informations principales du lot</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Numéro de Lot <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    batchNumberError && styles.inputError,
                    checkingUnique && styles.inputChecking,
                  ]}
                  value={formData.batchNumber}
                  onChangeText={(text) => {
                    setFormData({ ...formData, batchNumber: text });
                    setBatchNumberError(null);
                  }}
                  onBlur={handleBatchNumberBlur}
                  placeholder="Ex: LOT-2024-001"
                  placeholderTextColor={Colors.text.tertiary}
                  autoCapitalize="characters"
                  editable={!loading}
                />
                {checkingUnique && (
                  <ActivityIndicator
                    size="small"
                    color={Colors.primary}
                    style={styles.inputIcon}
                  />
                )}
                {!checkingUnique && formData.batchNumber && !batchNumberError && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Colors.success}
                    style={styles.inputIcon}
                  />
                )}
              </View>
              {batchNumberError && (
                <Text style={styles.errorText}>{batchNumberError}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Nom du Produit <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.productName}
                onChangeText={(text) => setFormData({ ...formData, productName: text })}
                placeholder="Ex: Comprimé XYZ 500mg"
                placeholderTextColor={Colors.text.tertiary}
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type de Dossier</Text>
              <View style={styles.radioGroup}>
                {(['production', 'packaging', 'quality', 'research'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.radioButton,
                      formData.dossierType === type && styles.radioButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, dossierType: type })}
                    disabled={loading}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        formData.dossierType === type && styles.radioCircleActive,
                      ]}
                    >
                      {formData.dossierType === type && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.radioLabel,
                        formData.dossierType === type && styles.radioLabelActive,
                      ]}
                    >
                      {getDossierTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Workflow</Text>
              <View style={styles.pickerContainer}>
                {workflowTemplates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.pickerOption,
                      formData.workflowTemplateId === template.id && styles.pickerOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, workflowTemplateId: template.id })}
                    disabled={loading}
                  >
                    <View style={styles.pickerOptionContent}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.workflowTemplateId === template.id &&
                            styles.pickerOptionTextActive,
                        ]}
                      >
                        {template.name}
                      </Text>
                      {template.description && (
                        <Text style={styles.pickerOptionDescription}>{template.description}</Text>
                      )}
                    </View>
                    {formData.workflowTemplateId === template.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>
        )}

        {/* Step 2: Dates */}
        {currentStep === 2 && (
          <Card style={styles.formCard}>
            <Text style={styles.stepTitle}>Dates</Text>
            <Text style={styles.stepSubtitle}>
              Définissez les dates de fabrication et d&apos;expiration
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date de Fabrication</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowManufacturingDatePicker(true)}
                disabled={loading}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{formatDate(formData.manufacturingDate)}</Text>
              </TouchableOpacity>
              {showManufacturingDatePicker && (
                <DateTimePicker
                  value={formData.manufacturingDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowManufacturingDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setFormData({ ...formData, manufacturingDate: selectedDate });
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date d&apos;Expiration</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowExpiryDatePicker(true)}
                disabled={loading}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{formatDate(formData.expiryDate)}</Text>
              </TouchableOpacity>
              {showExpiryDatePicker && (
                <DateTimePicker
                  value={formData.expiryDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={formData.manufacturingDate}
                  onChange={(event, selectedDate) => {
                    setShowExpiryDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setFormData({ ...formData, expiryDate: selectedDate });
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoText}>
                La durée de vie du lot sera de{' '}
                {Math.round(
                  (formData.expiryDate.getTime() - formData.manufacturingDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                jours
              </Text>
            </View>
          </Card>
        )}

        {/* Step 3: Assignment */}
        {currentStep === 3 && (
          <Card style={styles.formCard}>
            <Text style={styles.stepTitle}>Assignation</Text>
            <Text style={styles.stepSubtitle}>Définissez l&apos;assigné et la priorité du lot</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Assigné à <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.assignedTo}
                onChangeText={(text) => setFormData({ ...formData, assignedTo: text })}
                placeholder="Nom de l&apos;opérateur"
                placeholderTextColor={Colors.text.tertiary}
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Priorité</Text>
              <View style={styles.priorityGroup}>
                {(['high', 'normal', 'low'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      formData.priority === priority && styles.priorityButtonActive,
                      formData.priority === priority && {
                        borderColor: getPriorityColor(priority),
                        backgroundColor: getPriorityColor(priority) + '15',
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, priority })}
                    disabled={loading}
                  >
                    <Ionicons
                      name={
                        priority === 'high'
                          ? 'flag'
                          : priority === 'low'
                          ? 'flag-outline'
                          : 'remove-outline'
                      }
                      size={16}
                      color={
                        formData.priority === priority
                          ? getPriorityColor(priority)
                          : Colors.text.tertiary
                      }
                    />
                    <Text
                      style={[
                        styles.priorityLabel,
                        formData.priority === priority && {
                          color: getPriorityColor(priority),
                        },
                      ]}
                    >
                      {priority === 'high'
                        ? 'Élevée'
                        : priority === 'low'
                        ? 'Basse'
                        : 'Normale'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Récapitulatif</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Numéro de lot:</Text>
                <Text style={styles.summaryValue}>{formData.batchNumber}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Produit:</Text>
                <Text style={styles.summaryValue}>{formData.productName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type:</Text>
                <Text style={styles.summaryValue}>{getDossierTypeLabel(formData.dossierType)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fabrication:</Text>
                <Text style={styles.summaryValue}>{formatDate(formData.manufacturingDate)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Expiration:</Text>
                <Text style={styles.summaryValue}>{formatDate(formData.expiryDate)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Assigné à:</Text>
                <Text style={styles.summaryValue}>{formData.assignedTo}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <Button
              title="Précédent"
              onPress={prevStep}
              variant="outline"
              style={styles.navButton}
              disabled={loading}
            />
          )}
          {currentStep < 3 ? (
            <Button
              title="Suivant"
              onPress={nextStep}
              style={styles.navButton}
              disabled={loading || checkingUnique}
            />
          ) : (
            <Button
              title="Créer le Lot"
              onPress={handleSubmit}
              loading={loading}
              style={styles.navButton}
            />
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
    paddingBottom: Spacing.xl * 2,
  },
  progressContainer: {
    marginBottom: Spacing.xl,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  progressStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStep: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  progressStepCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  progressStepText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.tertiary,
  },
  progressStepTextActive: {
    color: Colors.surface,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  progressLineActive: {
    backgroundColor: Colors.success,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressLabel: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  progressLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  stepTitle: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  required: {
    color: Colors.error,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text.primary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputChecking: {
    borderColor: Colors.primary,
  },
  inputIcon: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
  },
  errorText: {
    ...Typography.small,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  radioGroup: {
    gap: Spacing.sm,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
  },
  radioButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  radioCircleActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  radioLabel: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  radioLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  pickerContainer: {
    gap: Spacing.sm,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
  },
  pickerOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  pickerOptionContent: {
    flex: 1,
  },
  pickerOptionText: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  pickerOptionTextActive: {
    color: Colors.primary,
  },
  pickerOptionDescription: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
  },
  dateButtonText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.primary,
    flex: 1,
  },
  priorityGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
  },
  priorityButtonActive: {
    borderWidth: 2,
  },
  priorityLabel: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  summaryBox: {
    backgroundColor: Colors.primary + '05',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginTop: Spacing.lg,
  },
  summaryTitle: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  summaryValue: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  navButton: {
    flex: 1,
  },
});
