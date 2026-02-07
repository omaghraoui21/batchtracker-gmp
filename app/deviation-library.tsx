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
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

type DeviationCategory =
  | 'Quality'
  | 'Documentation'
  | 'Safety'
  | 'Equipment'
  | 'Process'
  | 'Material'
  | 'Personnel'
  | 'Environmental';

type DeviationSeverity = 'minor' | 'major' | 'critical';

interface DeviationType {
  id: string;
  code: string;
  label: string;
  category: DeviationCategory;
  default_severity: DeviationSeverity;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DeviationFormData {
  code: string;
  label: string;
  category: DeviationCategory;
  default_severity: DeviationSeverity;
  is_active: boolean;
}

const CATEGORIES: DeviationCategory[] = [
  'Quality',
  'Documentation',
  'Safety',
  'Equipment',
  'Process',
  'Material',
  'Personnel',
  'Environmental',
];

const SEVERITIES: { value: DeviationSeverity; label: string; color: string }[] = [
  { value: 'minor', label: 'Mineure', color: Colors.success },
  { value: 'major', label: 'Majeure', color: Colors.warning },
  { value: 'critical', label: 'Critique', color: Colors.error },
];

export default function DeviationLibraryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [deviationTypes, setDeviationTypes] = useState<DeviationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDeviation, setEditingDeviation] = useState<DeviationType | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<DeviationFormData>({
    code: '',
    label: '',
    category: 'Quality',
    default_severity: 'minor',
    is_active: true,
  });

  useEffect(() => {
    // Check admin permission
    if (user?.role !== 'ADMIN') {
      Alert.alert('Accès Refusé', 'Seuls les administrateurs peuvent accéder à cette section.', [
        { text: 'Retour', onPress: () => router.back() },
      ]);
      return;
    }

    fetchDeviationTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDeviationTypes = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('deviation_types')
        .select('*')
        .order('category')
        .order('code');

      if (error) throw error;

      setDeviationTypes((data || []) as DeviationType[]);
    } catch (error) {
      console.error('Error fetching deviation types:', error);
      Alert.alert('Erreur', 'Impossible de charger la bibliothèque des déviations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenModal = (deviation?: DeviationType) => {
    if (deviation) {
      setEditingDeviation(deviation);
      setFormData({
        code: deviation.code,
        label: deviation.label,
        category: deviation.category,
        default_severity: deviation.default_severity,
        is_active: deviation.is_active,
      });
    } else {
      setEditingDeviation(null);
      setFormData({
        code: '',
        label: '',
        category: 'Quality',
        default_severity: 'minor',
        is_active: true,
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.label.trim()) {
      Alert.alert('Erreur', 'Le code et le libellé sont obligatoires');
      return;
    }

    try {
      setSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (editingDeviation) {
        // Update existing
        const { error } = await supabase
          .from('deviation_types')
          .update({
            code: formData.code.trim().toUpperCase(),
            label: formData.label.trim(),
            category: formData.category,
            default_severity: formData.default_severity,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDeviation.id);

        if (error) throw error;

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Succès', 'Type de déviation mis à jour');
      } else {
        // Create new
        const { error } = await supabase.from('deviation_types').insert({
          code: formData.code.trim().toUpperCase(),
          label: formData.label.trim(),
          category: formData.category,
          default_severity: formData.default_severity,
          is_active: formData.is_active,
        });

        if (error) {
          if (error.code === '23505') {
            // Unique constraint violation
            Alert.alert('Erreur', 'Ce code existe déjà');
            return;
          }
          throw error;
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Succès', 'Type de déviation créé');
      }

      setModalVisible(false);
      fetchDeviationTypes();
    } catch (error) {
      console.error('Error saving deviation type:', error);
      Alert.alert('Erreur', "Impossible d'enregistrer le type de déviation");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (deviation: DeviationType) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { error } = await supabase
        .from('deviation_types')
        .update({
          is_active: !deviation.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deviation.id);

      if (error) throw error;

      fetchDeviationTypes();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error toggling deviation type:', error);
      Alert.alert('Erreur', 'Impossible de modifier le statut');
    }
  };

  const handleDelete = async (deviation: DeviationType) => {
    Alert.alert(
      'Confirmer la Suppression',
      `Êtes-vous sûr de vouloir supprimer "${deviation.code} - ${deviation.label}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

              const { error } = await supabase.from('deviation_types').delete().eq('id', deviation.id);

              if (error) {
                if (error.code === '23503') {
                  // Foreign key violation
                  Alert.alert(
                    'Impossible de Supprimer',
                    'Ce type de déviation est utilisé par des déviations existantes. Désactivez-le plutôt.'
                  );
                  return;
                }
                throw error;
              }

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Succès', 'Type de déviation supprimé');
              fetchDeviationTypes();
            } catch (error) {
              console.error('Error deleting deviation type:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le type de déviation');
            }
          },
        },
      ]
    );
  };

  const getSeverityColor = (severity: DeviationSeverity) => {
    const severityInfo = SEVERITIES.find((s) => s.value === severity);
    return severityInfo?.color || Colors.text.secondary;
  };

  const getSeverityLabel = (severity: DeviationSeverity) => {
    const severityInfo = SEVERITIES.find((s) => s.value === severity);
    return severityInfo?.label || severity;
  };

  const getCategoryIcon = (category: DeviationCategory): keyof typeof Ionicons.glyphMap => {
    const icons: Record<DeviationCategory, keyof typeof Ionicons.glyphMap> = {
      Quality: 'shield-checkmark-outline',
      Documentation: 'document-text-outline',
      Safety: 'warning-outline',
      Equipment: 'construct-outline',
      Process: 'git-branch-outline',
      Material: 'cube-outline',
      Personnel: 'people-outline',
      Environmental: 'leaf-outline',
    };
    return icons[category] || 'alert-circle-outline';
  };

  const groupedDeviations = CATEGORIES.map((category) => ({
    category,
    items: deviationTypes.filter((dt) => dt.category === category),
  })).filter((group) => group.items.length > 0);

  if (user?.role !== 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Bibliothèque des Déviations',
          headerBackTitle: 'Retour Admin',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/admin')}
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
                Retour Admin
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDeviationTypes();
              }}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Header */}
          <Card style={styles.headerCard}>
            <View style={styles.headerIcon}>
              <Ionicons name="library" size={32} color={Colors.error} />
            </View>
            <Text style={styles.headerTitle}>Bibliothèque des Déviations</Text>
            <Text style={styles.headerSubtitle}>
              Gérez les types de déviations standards pour la conformité GMP
            </Text>
          </Card>

          {/* Stats */}
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{deviationTypes.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.success }]}>
                {deviationTypes.filter((dt) => dt.is_active).length}
              </Text>
              <Text style={styles.statLabel}>Actifs</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.text.tertiary }]}>
                {deviationTypes.filter((dt) => !dt.is_active).length}
              </Text>
              <Text style={styles.statLabel}>Inactifs</Text>
            </Card>
          </View>

          {/* Deviation Types by Category */}
          {groupedDeviations.map((group) => (
            <View key={group.category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Ionicons name={getCategoryIcon(group.category)} size={24} color={Colors.primary} />
                <Text style={styles.categoryTitle}>{group.category}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{group.items.length}</Text>
                </View>
              </View>

              <Card style={styles.deviationListCard}>
                {group.items.map((deviation, index) => (
                  <View
                    key={deviation.id}
                    style={[
                      styles.deviationItem,
                      index < group.items.length - 1 && styles.deviationItemBorder,
                      !deviation.is_active && styles.deviationItemInactive,
                    ]}
                  >
                    <View style={styles.deviationItemMain}>
                      <View style={styles.deviationItemInfo}>
                        <Text style={styles.deviationCode}>{deviation.code}</Text>
                        <Text style={styles.deviationLabel}>{deviation.label}</Text>
                        <View style={styles.deviationMeta}>
                          <View
                            style={[
                              styles.severityBadge,
                              { backgroundColor: getSeverityColor(deviation.default_severity) + '20' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.severityText,
                                { color: getSeverityColor(deviation.default_severity) },
                              ]}
                            >
                              {getSeverityLabel(deviation.default_severity)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.deviationItemActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleToggleActive(deviation)}
                        >
                          <Ionicons
                            name={deviation.is_active ? 'eye' : 'eye-off'}
                            size={20}
                            color={deviation.is_active ? Colors.success : Colors.text.tertiary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleOpenModal(deviation)}
                        >
                          <Ionicons name="pencil" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDelete(deviation)}
                        >
                          <Ionicons name="trash" size={20} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          ))}

          {deviationTypes.length === 0 && (
            <Card style={styles.emptyCard}>
              <Ionicons name="library-outline" size={64} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>Aucun type de déviation</Text>
              <Text style={styles.emptySubtext}>Commencez par créer votre première entrée</Text>
            </Card>
          )}
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={() => handleOpenModal()}>
          <Ionicons name="add" size={32} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Edit/Create Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDeviation ? 'Modifier' : 'Nouveau'} Type de Déviation
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Code */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Code *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.code}
                  onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                  placeholder="Ex: GMP-DOC-01"
                  placeholderTextColor={Colors.text.tertiary}
                  autoCapitalize="characters"
                />
              </View>

              {/* Label */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Libellé *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.label}
                  onChangeText={(text) => setFormData({ ...formData, label: text })}
                  placeholder="Ex: Documentation Missing"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>

              {/* Category */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Catégorie *</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        formData.category === category && styles.categoryOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, category })}
                    >
                      <Ionicons
                        name={getCategoryIcon(category)}
                        size={20}
                        color={formData.category === category ? Colors.surface : Colors.text.secondary}
                      />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          formData.category === category && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Severity */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sévérité par Défaut *</Text>
                <View style={styles.severityOptions}>
                  {SEVERITIES.map((severity) => (
                    <TouchableOpacity
                      key={severity.value}
                      style={[
                        styles.severityOption,
                        {
                          borderColor: severity.color,
                          backgroundColor:
                            formData.default_severity === severity.value
                              ? severity.color
                              : Colors.surface,
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, default_severity: severity.value })}
                    >
                      <Text
                        style={[
                          styles.severityOptionText,
                          {
                            color:
                              formData.default_severity === severity.value
                                ? Colors.surface
                                : severity.color,
                          },
                        ]}
                      >
                        {severity.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Active Status */}
              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={styles.activeToggle}
                  onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
                >
                  <View style={styles.activeToggleLeft}>
                    <Ionicons
                      name={formData.is_active ? 'checkmark-circle' : 'close-circle'}
                      size={24}
                      color={formData.is_active ? Colors.success : Colors.text.tertiary}
                    />
                    <View>
                      <Text style={styles.activeToggleLabel}>Type Actif</Text>
                      <Text style={styles.activeToggleSubtext}>
                        {formData.is_active ? 'Visible dans les formulaires' : 'Masqué'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.surface} />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingDeviation ? 'Mettre à Jour' : 'Créer'}
                  </Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  statValue: {
    ...Typography.h1,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  categorySection: {
    marginBottom: Spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    ...Typography.h3,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    minWidth: 32,
    alignItems: 'center',
  },
  categoryBadgeText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '700',
  },
  deviationListCard: {
    padding: 0,
  },
  deviationItem: {
    padding: Spacing.md,
  },
  deviationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  deviationItemInactive: {
    opacity: 0.5,
  },
  deviationItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  deviationItemInfo: {
    flex: 1,
  },
  deviationCode: {
    ...Typography.body,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  deviationLabel: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  deviationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  severityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  severityText: {
    ...Typography.small,
    fontWeight: '600',
  },
  deviationItemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    ...Typography.h3,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.h2,
  },
  modalContent: {
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  formInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Typography.body,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  categoryOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryOptionText: {
    ...Typography.small,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  categoryOptionTextSelected: {
    color: Colors.surface,
  },
  severityOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  severityOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
  },
  severityOptionText: {
    ...Typography.body,
    fontWeight: '600',
  },
  activeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  activeToggleLabel: {
    ...Typography.body,
    fontWeight: '600',
  },
  activeToggleSubtext: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
  modalSaveButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.surface,
  },
});
