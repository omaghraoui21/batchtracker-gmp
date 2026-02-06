import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export interface DeviationFormData {
  title: string;
  description: string;
  location: string;
  severity: 'minor' | 'major' | 'critical';
  immediateAction: string;
  batchId?: string;
  stepInstanceId?: string;
}

interface DeviationReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DeviationFormData) => Promise<void>;
  batchNumber?: string;
  batchId?: string;
  stepInstanceId?: string;
  stepName?: string;
  onAIAnalyze?: (description: string) => Promise<{
    suggestedSeverity: 'minor' | 'major' | 'critical';
    suggestedActions: string;
  }>;
}

export default function DeviationReportModal({
  visible,
  onClose,
  onSubmit,
  batchNumber,
  batchId,
  stepInstanceId,
  stepName,
  onAIAnalyze,
}: DeviationReportModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(stepName || '');
  const [severity, setSeverity] = useState<'minor' | 'major' | 'critical'>('minor');
  const [immediateAction, setImmediateAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setLocation(stepName || '');
    setSeverity('minor');
    setImmediateAction('');
    onClose();
  };

  const handleAIAnalyze = async () => {
    if (!description.trim() || !onAIAnalyze) return;

    try {
      setAnalyzing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await onAIAnalyze(description);

      setSeverity(result.suggestedSeverity);
      if (!immediateAction) {
        setImmediateAction(result.suggestedActions);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Analyse IA', 'Suggestion de criticité et actions générées');
    } catch (error) {
      console.error('Error analyzing deviation:', error);
      Alert.alert('Erreur', 'Impossible d\'analyser la déviation');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez décrire la déviation');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Erreur', 'Veuillez indiquer la localisation');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        title,
        description,
        location,
        severity,
        immediateAction,
        batchId,
        stepInstanceId,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch (error) {
      console.error('Error submitting deviation:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la déviation');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return Colors.error;
      case 'major':
        return Colors.warning;
      default:
        return Colors.text.secondary;
    }
  };

  const getSeverityLabel = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'Critique';
      case 'major':
        return 'Majeure';
      default:
        return 'Mineure';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={loading}>
            <Ionicons name="close" size={28} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Signaler une Déviation</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Batch Context */}
          {batchNumber && (
            <View style={styles.contextCard}>
              <Ionicons name="cube-outline" size={20} color={Colors.primary} />
              <View style={styles.contextInfo}>
                <Text style={styles.contextLabel}>Lot</Text>
                <Text style={styles.contextValue}>{batchNumber}</Text>
              </View>
            </View>
          )}

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Titre <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Écart de température"
              placeholderTextColor={Colors.text.tertiary}
              value={title}
              onChangeText={setTitle}
              editable={!loading}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              {onAIAnalyze && description.length > 20 && (
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={handleAIAnalyze}
                  disabled={analyzing || loading}
                >
                  {analyzing ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={14} color={Colors.primary} />
                      <Text style={styles.aiButtonText}>Analyser avec IA</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez la déviation observée..."
              placeholderTextColor={Colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Localisation / Étape <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Zone de production, Étape 2"
              placeholderTextColor={Colors.text.tertiary}
              value={location}
              onChangeText={setLocation}
              editable={!loading}
            />
          </View>

          {/* Severity */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Niveau de Criticité <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.severityOptions}>
              {(['minor', 'major', 'critical'] as const).map((sev) => (
                <TouchableOpacity
                  key={sev}
                  style={[
                    styles.severityOption,
                    severity === sev && styles.severityOptionActive,
                    {
                      borderColor: severity === sev ? getSeverityColor(sev) : Colors.border,
                      backgroundColor: severity === sev ? getSeverityColor(sev) + '15' : Colors.surface,
                    },
                  ]}
                  onPress={() => {
                    setSeverity(sev);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  disabled={loading}
                >
                  <View
                    style={[
                      styles.severityDot,
                      { backgroundColor: getSeverityColor(sev) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.severityText,
                      {
                        color: severity === sev ? getSeverityColor(sev) : Colors.text.secondary,
                        fontWeight: severity === sev ? '700' : '400',
                      },
                    ]}
                  >
                    {getSeverityLabel(sev)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>
              {severity === 'critical' && '⚠️ Une déviation critique bloque la validation du lot'}
              {severity === 'major' && 'ℹ️ Nécessite une investigation approfondie'}
              {severity === 'minor' && 'ℹ️ Déviation mineure, documentation requise'}
            </Text>
          </View>

          {/* Immediate Action */}
          <View style={styles.field}>
            <Text style={styles.label}>Actions Immédiates</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez les actions immédiates prises..."
              placeholderTextColor={Colors.text.tertiary}
              value={immediateAction}
              onChangeText={setImmediateAction}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={Colors.surface} />
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h3,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  contextInfo: {
    marginLeft: Spacing.sm,
  },
  contextLabel: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  contextValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  field: {
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  aiButtonText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  severityOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  severityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  severityOptionActive: {
    borderWidth: 2,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
  },
  severityText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  hint: {
    ...Typography.small,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.surface,
  },
});
