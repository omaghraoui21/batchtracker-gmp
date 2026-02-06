import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

export interface SignatureData {
  signerName: string;
  signerRole: string;
  signatureType: 'operator' | 'supervisor' | 'qa' | 'admin';
  signatureOrder: 1 | 2;
  comments?: string;
}

interface ElectronicSignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onSign: (data: SignatureData) => Promise<void>;
  stepName: string;
  batchNumber: string;
  signatureOrder: 1 | 2;
  requiresDoubleValidation: boolean;
  existingSignature?: {
    signerName: string;
    signerRole: string;
    signedAt: string;
  };
}

export default function ElectronicSignatureModal({
  visible,
  onClose,
  onSign,
  stepName,
  batchNumber,
  signatureOrder,
  requiresDoubleValidation,
  existingSignature,
}: ElectronicSignatureModalProps) {
  const [signerName, setSignerName] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const roles = [
    { value: 'operator', label: 'Opérateur', type: 'operator' },
    { value: 'supervisor', label: 'Superviseur', type: 'supervisor' },
    { value: 'qa', label: 'Qualité', type: 'qa' },
    { value: 'admin', label: 'Administrateur', type: 'admin' },
  ];

  const handleSign = async () => {
    if (!signerName.trim() || !selectedRole || !agreed) {
      return;
    }

    try {
      setLoading(true);
      const role = roles.find((r) => r.value === selectedRole);
      await onSign({
        signerName: signerName.trim(),
        signerRole: role?.label || selectedRole,
        signatureType: selectedRole as 'operator' | 'supervisor' | 'qa' | 'admin',
        signatureOrder,
        comments: comments.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      console.error('Error signing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSignerName('');
    setSelectedRole('');
    setComments('');
    setAgreed(false);
    onClose();
  };

  const canSign = signerName.trim().length > 0 && selectedRole && agreed;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="create-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Signature Électronique</Text>
              <Text style={styles.subtitle}>Conformité GMP</Text>
            </View>

            {/* Batch Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Lot:</Text>
                <Text style={styles.infoValue}>#{batchNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Étape:</Text>
                <Text style={styles.infoValue}>{stepName}</Text>
              </View>
              {requiresDoubleValidation && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Validation:</Text>
                  <Text style={styles.infoValue}>
                    Double validation requise ({signatureOrder}/2)
                  </Text>
                </View>
              )}
            </View>

            {/* Existing Signature (for double validation) */}
            {existingSignature && signatureOrder === 2 && (
              <View style={styles.existingSignature}>
                <View style={styles.existingHeader}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  <Text style={styles.existingTitle}>Première Signature</Text>
                </View>
                <Text style={styles.existingText}>
                  Par: {existingSignature.signerName} ({existingSignature.signerRole})
                </Text>
                <Text style={styles.existingDate}>
                  Le: {new Date(existingSignature.signedAt).toLocaleString('fr-FR')}
                </Text>
              </View>
            )}

            {/* Signer Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Nom du Signataire <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={signerName}
                onChangeText={setSignerName}
                placeholder="Prénom Nom"
                placeholderTextColor={Colors.text.tertiary}
                autoCapitalize="words"
              />
            </View>

            {/* Role Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Rôle <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.roleGrid}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleButton,
                      selectedRole === role.value && styles.roleButtonActive,
                    ]}
                    onPress={() => setSelectedRole(role.value)}
                  >
                    <Ionicons
                      name={
                        selectedRole === role.value
                          ? 'radio-button-on'
                          : 'radio-button-off'
                      }
                      size={20}
                      color={
                        selectedRole === role.value ? Colors.primary : Colors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.roleLabel,
                        selectedRole === role.value && styles.roleLabelActive,
                      ]}
                    >
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Comments */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Commentaires (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={comments}
                onChangeText={setComments}
                placeholder="Ajoutez des commentaires sur cette validation..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Agreement */}
            <TouchableOpacity
              style={styles.agreementContainer}
              onPress={() => setAgreed(!agreed)}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                {agreed && <Ionicons name="checkmark" size={16} color={Colors.surface} />}
              </View>
              <Text style={styles.agreementText}>
                Je confirme l&apos;exactitude de cette validation électronique et comprends
                qu&apos;elle a la même valeur légale qu&apos;une signature manuscrite dans le
                cadre des BPF.
              </Text>
            </TouchableOpacity>

            {/* Timestamp Info */}
            <View style={styles.timestampInfo}>
              <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
              <Text style={styles.timestampText}>
                L&apos;horodatage sera automatiquement enregistré
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.signButton, !canSign && styles.signButtonDisabled]}
                onPress={handleSign}
                disabled={!canSign || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.surface} />
                ) : (
                  <>
                    <Ionicons name="create" size={18} color={Colors.surface} />
                    <Text style={styles.signButtonText}>Signer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '90%',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  infoValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  existingSignature: {
    backgroundColor: Colors.success + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
    marginBottom: Spacing.lg,
  },
  existingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  existingTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.success,
  },
  existingText: {
    ...Typography.caption,
    marginBottom: 2,
  },
  existingDate: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text.primary,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.md,
  },
  roleGrid: {
    gap: Spacing.sm,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  roleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  roleLabel: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  roleLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  agreementContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  agreementText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  timestampInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  timestampText: {
    ...Typography.small,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  signButton: {
    backgroundColor: Colors.primary,
  },
  signButtonDisabled: {
    opacity: 0.5,
  },
  signButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.surface,
  },
});
