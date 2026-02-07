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
import { ProductSelector } from '@/components/ProductSelector';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import type { Database } from '@/lib/database.types';
import { logBatchCreation, logDraftBatchCreation, logQRGeneration } from '@/lib/auditLog';
import { assignBatchAutomatically } from '@/lib/assignmentEngine';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

type WorkflowTemplate = Database['public']['Tables']['workflow_templates']['Row'];

interface BatchFormData {
  batchNumber: string;
  productId: string | null;
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
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingUnique, setCheckingUnique] = useState(false);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [showManufacturingDatePicker, setShowManufacturingDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [batchNumberError, setBatchNumberError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftBatchId, setDraftBatchId] = useState<string | null>(null); // Track draft batch ID

  const [formData, setFormData] = useState<BatchFormData>({
    batchNumber: '',
    productId: null,
    productName: '',
    dossierType: 'production',
    manufacturingDate: new Date(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    assignedTo: '',
    workflowTemplateId: '',
    priority: 'normal',
  });
  const [productError, setProductError] = useState<string | null>(null);

  // Derive user info from auth context with safe fallbacks
  const userId = user?.id ?? '';
  const userName = user?.name ?? '';
  const userRole = user?.role ?? 'VIEWER';

  useEffect(() => {
    fetchWorkflowTemplates();
  }, []);

  const fetchWorkflowTemplates = async () => {
    try {
      setLoadingTemplates(true);
      setTemplatesError(null);

      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setWorkflowTemplates(data || []);

      if (!data || data.length === 0) {
        setTemplatesError('Aucun workflow disponible');
        return;
      }

      // Set first template as default
      setFormData((prev) => ({ ...prev, workflowTemplateId: data[0].id }));
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
      setTemplatesError('Impossible de charger les workflows');
      toast.showError('Erreur', 'Impossible de charger les modeles de workflow');
    } finally {
      setLoadingTemplates(false);
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
        setBatchNumberError('Ce numero de lot existe deja');
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

  const validateForm = (): boolean => {
    if (!formData.batchNumber.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Champ requis', 'Veuillez saisir un numero de lot');
      return false;
    }

    if (!formData.productName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Champ requis', 'Veuillez saisir un nom de produit');
      return false;
    }

    if (!formData.workflowTemplateId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Champ requis', 'Veuillez selectionner un modele de workflow');
      return false;
    }

    if (!formData.assignedTo.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Champ requis', 'Veuillez saisir le nom de l\'assigne');
      return false;
    }

    if (formData.expiryDate <= formData.manufacturingDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Date invalide', 'La date d\'expiration doit etre apres la date de fabrication');
      return false;
    }

    if (batchNumberError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Numero invalide', 'Le numero de lot n\'est pas valide');
      return false;
    }

    if (!userId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Non authentifie', 'Vous devez etre connecte pour creer un lot');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
          toast.showError(
            'Erreur de finalisation',
            `Impossible de finaliser le lot: ${updateError.message}`
          );
          return;
        }

        batchData = updatedBatch;

        // Generate QR code data using the secure qr_token
        if (batchData.qr_token) {
          const qrCodeData = `BATCH:${batchData.qr_token}`;
          const { error: qrError } = await supabase
            .from('batches')
            .update({ qr_code_data: qrCodeData })
            .eq('id', batchData.id);

          if (qrError) {
            toast.showWarning(
              'QR Code',
              `Le lot a ete cree mais le QR code n'a pas pu etre genere: ${qrError.message}`
            );
          }
        } else {
          toast.showWarning(
            'QR Code',
            'Le lot a ete cree mais aucun jeton QR n\'a ete genere. Contactez un administrateur.'
          );
        }
      } else {
        // Fallback: create batch directly (shouldn't happen with draft-first flow)
        const { data: newBatch, error: batchError } = await supabase
          .from('batches')
          .insert({
            batch_number: formData.batchNumber,
            product_id: formData.productId,
            product_name: formData.productName,
            dossier_type: formData.dossierType,
            manufacturing_date: formData.manufacturingDate.toISOString(),
            expiry_date: formData.expiryDate.toISOString(),
            assigned_to: formData.assignedTo,
            workflow_template_id: formData.workflowTemplateId,
            priority: formData.priority,
            status: 'active',
            batch_status: 'en_cours',
            created_by: userId,
          })
          .select()
          .single();

        if (batchError) {
          toast.showError(
            'Erreur de creation',
            `Impossible de creer le lot: ${batchError.message}`
          );
          return;
        }

        batchData = newBatch;

        // Generate QR code data
        if (batchData.qr_token) {
          const qrCodeData = `BATCH:${batchData.qr_token}`;
          const { error: qrError } = await supabase
            .from('batches')
            .update({ qr_code_data: qrCodeData })
            .eq('id', batchData.id);

          if (qrError) {
            toast.showWarning(
              'QR Code',
              `Le lot a ete cree mais le QR code n'a pas pu etre genere: ${qrError.message}`
            );
          }
        } else {
          toast.showWarning(
            'QR Code',
            'Le lot a ete cree mais aucun jeton QR n\'a ete genere. Contactez un administrateur.'
          );
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
          try {
            const assignmentResult = await assignBatchAutomatically(
              batchData.id,
              firstStepDef.id,
              userId,
              userName,
              userRole
            );

            if (!assignmentResult.success) {
              // Mark as needing manual assignment instead of failing silently
              await supabase
                .from('batches')
                .update({ assigned_to: formData.assignedTo || '\u00C0 ASSIGNER' })
                .eq('id', batchData.id);

              if (assignmentResult.reason) {
                toast.showInfo(
                  'Assignation manuelle requise',
                  assignmentResult.reason
                );
              }
            }
          } catch (assignError) {
            console.error('Auto-assignment error:', assignError);
            // Mark as needing manual assignment
            await supabase
              .from('batches')
              .update({ assigned_to: formData.assignedTo || '\u00C0 ASSIGNER' })
              .eq('id', batchData.id);

            toast.showWarning(
              'Assignation automatique echouee',
              'Le lot a ete marque comme "\u00C0 ASSIGNER". Veuillez assigner manuellement.'
            );
          }
        }
      }

      // Log batch creation for audit trail
      try {
        await logBatchCreation(
          batchData.id,
          batchData.batch_number,
          userId,
          userName,
          userRole,
          batchData.product_name
        );
      } catch (auditError) {
        console.error('Audit log error (non-blocking):', auditError);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.showSuccess('Lot cree', `Le lot ${batchData.batch_number} a ete cree avec succes`);

      // Automatically redirect to newly created batch details
      router.replace(`/batch/${batchData.id}`);
    } catch (error) {
      console.error('Error creating batch:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Erreur', 'Impossible de creer le lot. Veuillez reessayer.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      // Validate Step 1: Identification
      if (!formData.batchNumber.trim()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.showError('Champ requis', 'Veuillez saisir un numero de lot');
        return;
      }
      if (batchNumberError) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.showError('Numero invalide', 'Le numero de lot n\'est pas valide');
        return;
      }
      if (!formData.productId || !formData.productName.trim()) {
        setProductError('Veuillez selectionner un produit');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.showError('Champ requis', 'Veuillez selectionner un produit dans le catalogue');
        return;
      }
      if (!formData.workflowTemplateId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.showError('Champ requis', 'Veuillez selectionner un modele de workflow');
        return;
      }
      if (!userId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.showError('Non authentifie', 'Vous devez etre connecte pour creer un lot');
        return;
      }

      // Final check for uniqueness before proceeding
      const isUnique = await checkBatchNumberUnique(formData.batchNumber);
      if (!isUnique) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.showError('Doublon', 'Ce numero de lot existe deja');
        return;
      }

      // Phase 10: Save draft after Step 1
      if (!draftBatchId) {
        try {
          setLoading(true);

          const { data: draftBatch, error: draftError } = await supabase
            .from('batches')
            .insert({
              batch_number: formData.batchNumber,
              product_id: formData.productId,
              product_name: formData.productName,
              dossier_type: formData.dossierType,
              workflow_template_id: formData.workflowTemplateId,
              batch_status: 'brouillon', // Draft status
              status: 'active',
              created_by: userId,
            })
            .select()
            .single();

          if (draftError) {
            // Show detailed error message but do NOT advance the step
            toast.showError(
              'Erreur de creation',
              `Impossible de creer le brouillon: ${draftError.message}`
            );
            // Form stays on step 1 - user can retry
            return;
          }

          setDraftBatchId(draftBatch.id);

          // Log draft creation
          try {
            await logDraftBatchCreation(
              draftBatch.id,
              draftBatch.batch_number,
              userId,
              userName,
              userRole,
              draftBatch.product_name
            );
          } catch (auditError) {
            console.error('Draft audit log error (non-blocking):', auditError);
          }

          // Log QR generation
          if (draftBatch.qr_token) {
            try {
              await logQRGeneration(
                draftBatch.id,
                draftBatch.batch_number,
                userId,
                userName,
                userRole,
                draftBatch.qr_token
              );
            } catch (qrLogError) {
              console.error('QR audit log error (non-blocking):', qrLogError);
              toast.showWarning(
                'QR Code',
                'Le jeton QR a ete genere mais la trace d\'audit n\'a pas pu etre enregistree.'
              );
            }
          } else {
            // QR token was not generated by the database trigger/default
            toast.showWarning(
              'QR Code',
              'Aucun jeton QR genere pour ce brouillon. Le QR sera genere a la finalisation.'
            );
          }

          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast.showSuccess('Brouillon sauvegarde', `Le brouillon ${draftBatch.batch_number} a ete cree`);
        } catch (error) {
          console.error('Error creating draft:', error);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          toast.showError('Erreur', 'Impossible de sauvegarder le brouillon. Veuillez reessayer.');
          // Form stays on step 1 - user can retry without losing data
          return;
        } finally {
          setLoading(false);
        }
      }
    }

    if (currentStep === 2) {
      // Validate Step 2: Dates
      if (formData.expiryDate <= formData.manufacturingDate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.showError('Date invalide', 'La date d\'expiration doit etre apres la date de fabrication');
        return;
      }

      // Update draft with dates
      if (draftBatchId) {
        try {
          setLoading(true);
          const { error: dateUpdateError } = await supabase
            .from('batches')
            .update({
              manufacturing_date: formData.manufacturingDate.toISOString(),
              expiry_date: formData.expiryDate.toISOString(),
            })
            .eq('id', draftBatchId);

          if (dateUpdateError) {
            toast.showWarning(
              'Sauvegarde partielle',
              'Les dates n\'ont pas pu etre sauvegardees dans le brouillon.'
            );
          }
        } catch (error) {
          console.error('Error updating draft dates:', error);
          toast.showWarning(
            'Sauvegarde partielle',
            'Les dates n\'ont pas pu etre sauvegardees dans le brouillon.'
          );
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
        return 'Qualite';
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

  const handleCancel = () => {
    if (draftBatchId) {
      // Draft exists, confirm cancellation
      Alert.alert(
        'Quitter le formulaire',
        'Un brouillon a ete sauvegarde. Voulez-vous revenir a la liste des lots?',
        [
          { text: 'Continuer l\'edition', style: 'cancel' },
          {
            text: 'Quitter',
            onPress: () => router.push('/(tabs)/batches'),
            style: 'destructive',
          },
        ]
      );
    } else {
      // No draft, just go back
      router.push('/(tabs)/batches');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Nouveau Lot',
          headerBackTitle: 'Annuler',
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: 16,
                minWidth: 48,
                minHeight: 48,
                justifyContent: 'center',
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.primary} />
              <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: '600', marginLeft: 4 }}>
                Annuler
              </Text>
            </TouchableOpacity>
          ),
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
            <Text style={styles.stepSubtitle}>Definissez les informations principales du lot</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Numero de Lot <Text style={styles.required}>*</Text>
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
                Produit <Text style={styles.required}>*</Text>
              </Text>
              <ProductSelector
                selectedProductId={formData.productId}
                onSelectProduct={(product) => {
                  setFormData({
                    ...formData,
                    productId: product.id,
                    productName: product.product_name,
                  });
                  setProductError(null);
                }}
                error={productError}
                disabled={loading}
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
              {loadingTemplates ? (
                <View style={styles.templatesLoading}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.templatesLoadingText}>Chargement des workflows...</Text>
                </View>
              ) : templatesError && workflowTemplates.length === 0 ? (
                <View style={styles.templatesEmpty}>
                  <Ionicons name="alert-circle-outline" size={24} color={Colors.warning} />
                  <Text style={styles.templatesEmptyTitle}>{templatesError}</Text>
                  <Text style={styles.templatesEmptyText}>
                    Aucun modele de workflow actif n&apos;a ete trouve. Veuillez contacter un administrateur pour configurer les workflows avant de creer un lot.
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={fetchWorkflowTemplates}
                  >
                    <Ionicons name="refresh" size={16} color={Colors.primary} />
                    <Text style={styles.retryButtonText}>Reessayer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
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
              )}
            </View>
          </Card>
        )}

        {/* Step 2: Dates */}
        {currentStep === 2 && (
          <Card style={styles.formCard}>
            <Text style={styles.stepTitle}>Dates</Text>
            <Text style={styles.stepSubtitle}>
              Definissez les dates de fabrication et d&apos;expiration
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
                La duree de vie du lot sera de{' '}
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
            <Text style={styles.stepSubtitle}>Definissez l&apos;assigne et la priorite du lot</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Assigne a <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.assignedTo}
                onChangeText={(text) => setFormData({ ...formData, assignedTo: text })}
                placeholder="Nom de l&apos;operateur"
                placeholderTextColor={Colors.text.tertiary}
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Priorite</Text>
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
                        ? 'Elevee'
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
              <Text style={styles.summaryTitle}>Recapitulatif</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Numero de lot:</Text>
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
                <Text style={styles.summaryLabel}>Assigne a:</Text>
                <Text style={styles.summaryValue}>{formData.assignedTo}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cree par:</Text>
                <Text style={styles.summaryValue}>{userName || 'N/A'}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <Button
              title="Precedent"
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
              disabled={loading || checkingUnique || (currentStep === 1 && loadingTemplates)}
            />
          ) : (
            <Button
              title="Creer le Lot"
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
  templatesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
  },
  templatesLoadingText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  templatesEmpty: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  templatesEmptyTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.warning,
  },
  templatesEmptyText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  retryButtonText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
});
