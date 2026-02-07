import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

interface DeviationType {
  id: string;
  code: string;
  label: string;
  category: string;
  default_severity: 'minor' | 'major' | 'critical';
}

interface EnhancedDeviationFormData {
  deviation_type_id: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  immediateAction: string;
  photo_url?: string;
  stepInstanceId?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: EnhancedDeviationFormData) => Promise<void>;
  batchNumber: string;
  batchId: string;
  productName: string;
  currentStepName?: string;
  onAIAnalyze?: (description: string) => Promise<{
    suggestedSeverity: 'minor' | 'major' | 'critical';
    suggestedActions: string;
  }>;
}

export function EnhancedDeviationReportModal({
  visible,
  onClose,
  onSubmit,
  batchNumber,
  batchId,
  productName,
  currentStepName,
  onAIAnalyze,
}: Props) {
  const [deviationTypes, setDeviationTypes] = useState<DeviationType[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [formData, setFormData] = useState<EnhancedDeviationFormData>({
    deviation_type_id: '',
    severity: 'minor',
    description: '',
    immediateAction: '',
    stepInstanceId: undefined,
  });

  useEffect(() => {
    if (visible) {
      fetchDeviationTypes();
    }
  }, [visible]);

  const fetchDeviationTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deviation_types')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('code');

      if (error) throw error;
      setDeviationTypes((data || []) as DeviationType[]);
    } catch (error) {
      console.error('Error fetching deviation types:', error);
      Alert.alert('Erreur', 'Impossible de charger les types de déviations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviationTypeSelect = (type: DeviationType) => {
    setFormData({
      ...formData,
      deviation_type_id: type.id,
      severity: type.default_severity, // Auto-fill severity
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAIAnalyze = async () => {
    if (!formData.description.trim() || !onAIAnalyze) return;

    try {
      setAnalyzing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await onAIAnalyze(formData.description);

      setFormData({
        ...formData,
        severity: result.suggestedSeverity,
        immediateAction: result.suggestedActions,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Analyse IA Terminée', 'La sévérité et les actions ont été suggérées.');
    } catch (error) {
      console.error('AI analysis error:', error);
      Alert.alert('Erreur', "Impossible d'analyser avec l'IA");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Requise', "L'accès à la caméra est nécessaire");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Requise', "L'accès à la galerie est nécessaire");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  };

  const handleSubmit = async () => {
    if (!formData.deviation_type_id) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de déviation');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Erreur', 'La description est obligatoire');
      return;
    }

    try {
      setSubmitting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Upload photo if present
      let photoUrl: string | undefined;
      if (photoUri) {
        // In production, upload to Supabase Storage
        // For now, we'll just pass the local URI
        photoUrl = photoUri;
      }

      await onSubmit({
        ...formData,
        photo_url: photoUrl,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset form
      setFormData({
        deviation_type_id: '',
        severity: 'minor',
        description: '',
        immediateAction: '',
        stepInstanceId: undefined,
      });
      setPhotoUri(null);
      onClose();
    } catch (error) {
      console.error('Error submitting deviation:', error);
      Alert.alert('Erreur', 'Impossible de soumettre la déviation');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity: 'minor' | 'major' | 'critical') => {
    switch (severity) {
      case 'critical':
        return Colors.error;
      case 'major':
        return Colors.warning;
      case 'minor':
        return Colors.success;
    }
  };

  const getSeverityLabel = (severity: 'minor' | 'major' | 'critical') => {
    switch (severity) {
      case 'critical':
        return 'Critique';
      case 'major':
        return 'Majeure';
      case 'minor':
        return 'Mineure';
    }
  };

  const groupedTypes = deviationTypes.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, DeviationType[]>);

  const selectedType = deviationTypes.find((t) => t.id === formData.deviation_type_id);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="warning" size={24} color={Colors.ruby} />
              <Text style={styles.headerTitle}>Signaler une Déviation</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Batch Info */}
          <View style={styles.batchInfo}>
            <Text style={styles.batchInfoLabel}>Lot: #{batchNumber}</Text>
            <Text style={styles.batchInfoProduct}>{productName}</Text>
            {currentStepName && (
              <Text style={styles.batchInfoStep}>Étape: {currentStepName}</Text>
            )}
          </View>

          <ScrollView style={styles.content}>
            {/* Deviation Type Selection */}
            <Text style={styles.sectionTitle}>Type de Déviation *</Text>
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                {selectedType && (
                  <View style={styles.selectedType}>
                    <Text style={styles.selectedTypeCode}>{selectedType.code}</Text>
                    <Text style={styles.selectedTypeLabel}>{selectedType.label}</Text>
                  </View>
                )}

                {Object.entries(groupedTypes).map(([category, types]) => (
                  <View key={category} style={styles.category}>
                    <Text style={styles.categoryLabel}>{category}</Text>
                    {types.map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.typeOption,
                          formData.deviation_type_id === type.id && styles.typeOptionSelected,
                        ]}
                        onPress={() => handleDeviationTypeSelect(type)}
                      >
                        <View style={styles.typeOptionLeft}>
                          <Text style={styles.typeOptionCode}>{type.code}</Text>
                          <Text style={styles.typeOptionLabel}>{type.label}</Text>
                        </View>
                        {formData.deviation_type_id === type.id && (
                          <Ionicons name="checkmark-circle" size={24} color={Colors.ruby} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </>
            )}

            {/* Severity */}
            <Text style={styles.sectionTitle}>Sévérité * (Auto-rempli)</Text>
            <View style={styles.severityOptions}>
              {(['minor', 'major', 'critical'] as const).map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[
                    styles.severityOption,
                    {
                      borderColor: getSeverityColor(severity),
                      backgroundColor:
                        formData.severity === severity
                          ? getSeverityColor(severity)
                          : Colors.surface,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, severity })}
                >
                  <Text
                    style={[
                      styles.severityOptionText,
                      {
                        color:
                          formData.severity === severity
                            ? Colors.surface
                            : getSeverityColor(severity),
                      },
                    ]}
                  >
                    {getSeverityLabel(severity)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <Text style={styles.sectionTitle}>Description *</Text>
            <TextInput
              style={styles.textArea}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Décrivez la déviation observée..."
              placeholderTextColor={Colors.text.tertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* AI Analyze Button */}
            {onAIAnalyze && formData.description.trim().length > 10 && (
              <TouchableOpacity
                style={styles.aiButton}
                onPress={handleAIAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <ActivityIndicator color={Colors.surface} size="small" />
                    <Text style={styles.aiButtonText}>Analyse en cours...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color={Colors.surface} />
                    <Text style={styles.aiButtonText}>Analyser avec IA</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Immediate Action */}
            <Text style={styles.sectionTitle}>Action Immédiate *</Text>
            <TextInput
              style={styles.textArea}
              value={formData.immediateAction}
              onChangeText={(text) => setFormData({ ...formData, immediateAction: text })}
              placeholder="Actions prises immédiatement..."
              placeholderTextColor={Colors.text.tertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Photo Attachment */}
            <Text style={styles.sectionTitle}>Photo (Optionnel)</Text>
            {photoUri ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => setPhotoUri(null)}
                >
                  <Ionicons name="close-circle" size={32} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={24} color={Colors.primary} />
                  <Text style={styles.photoButtonText}>Prendre Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto}>
                  <Ionicons name="images" size={24} color={Colors.primary} />
                  <Text style={styles.photoButtonText}>Galerie</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>Soumettre</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h2,
  },
  batchInfo: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  batchInfoLabel: {
    ...Typography.body,
    fontWeight: '700',
  },
  batchInfoProduct: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  batchInfoStep: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: 4,
  },
  content: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  selectedType: {
    backgroundColor: Colors.ruby + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.ruby,
  },
  selectedTypeCode: {
    ...Typography.body,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: Colors.ruby,
  },
  selectedTypeLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  category: {
    marginBottom: Spacing.md,
  },
  categoryLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  typeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  typeOptionSelected: {
    borderColor: Colors.ruby,
    backgroundColor: Colors.ruby + '10',
  },
  typeOptionLeft: {
    flex: 1,
  },
  typeOptionCode: {
    ...Typography.small,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  typeOptionLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  severityOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  severityOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
  },
  severityOptionText: {
    ...Typography.small,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Typography.body,
    marginBottom: Spacing.md,
    minHeight: 100,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  aiButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoButtonText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  photoPreview: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.sm,
  },
  photoRemove: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.body,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.ruby,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.surface,
  },
});
