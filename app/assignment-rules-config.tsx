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
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { testAssignmentRule, type AssignmentRuleType } from '@/lib/assignmentEngine';

type AssignmentRule = Database['public']['Tables']['assignment_rules']['Row'];
type StepDefinition = Database['public']['Tables']['step_definitions']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface RuleFormData {
  stepDefinitionId: string;
  ruleType: AssignmentRuleType;
  fixedUserId: string | null;
  eligibleUserIds: string[];
  priority: number;
}

export default function AssignmentRulesConfigScreen() {
  const [loading, setLoading] = useState(true);
  const [stepDefinitions, setStepDefinitions] = useState<StepDefinition[]>([]);
  const [assignmentRules, setAssignmentRules] = useState<AssignmentRule[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedStep, setSelectedStep] = useState<StepDefinition | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [testingRule, setTestingRule] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [formData, setFormData] = useState<RuleFormData>({
    stepDefinitionId: '',
    ruleType: 'fixed_user',
    fixedUserId: null,
    eligibleUserIds: [],
    priority: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch step definitions
      const { data: steps, error: stepsError } = await supabase
        .from('step_definitions')
        .select('*')
        .order('order_index');

      if (stepsError) throw stepsError;
      setStepDefinitions(steps || []);

      // Fetch assignment rules
      const { data: rules, error: rulesError } = await supabase
        .from('assignment_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (rulesError) throw rulesError;
      setAssignmentRules(rules || []);

      // Fetch active profiles
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (usersError) throw usersError;
      setProfiles(users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = (step: StepDefinition) => {
    setSelectedStep(step);
    setFormData({
      stepDefinitionId: step.id,
      ruleType: 'fixed_user',
      fixedUserId: null,
      eligibleUserIds: [],
      priority: 0,
    });
    setTestResult(null);
    setModalVisible(true);
  };

  const handleSaveRule = async () => {
    if (formData.ruleType === 'fixed_user' && !formData.fixedUserId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un utilisateur fixe');
      return;
    }

    if (
      (formData.ruleType === 'round_robin' || formData.ruleType === 'least_active') &&
      formData.eligibleUserIds.length === 0
    ) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un utilisateur éligible');
      return;
    }

    try {
      setLoading(true);

      const ruleData: Database['public']['Tables']['assignment_rules']['Insert'] = {
        step_definition_id: formData.stepDefinitionId,
        rule_type: formData.ruleType,
        fixed_user_id: formData.ruleType === 'fixed_user' ? formData.fixedUserId : null,
        eligible_user_ids:
          formData.ruleType !== 'fixed_user' ? formData.eligibleUserIds : null,
        priority: formData.priority,
        is_active: true,
      };

      const { error } = await supabase.from('assignment_rules').insert(ruleData);

      if (error) throw error;

      Alert.alert('Succès', 'Règle d\'assignation créée avec succès');
      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error saving rule:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la règle');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cette règle?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('assignment_rules')
                .delete()
                .eq('id', ruleId);

              if (error) throw error;

              Alert.alert('Succès', 'Règle supprimée');
              fetchData();
            } catch (error) {
              console.error('Error deleting rule:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la règle');
            }
          },
        },
      ]
    );
  };

  const handleTestRule = async () => {
    try {
      setTestingRule(true);
      setTestResult(null);

      const result = await testAssignmentRule(
        formData.stepDefinitionId,
        formData.ruleType,
        formData.fixedUserId || undefined,
        formData.eligibleUserIds.length > 0 ? formData.eligibleUserIds : undefined
      );

      if (result.success && result.assignedUserName) {
        setTestResult(`✅ Assigné à: ${result.assignedUserName}`);
      } else {
        setTestResult(`❌ Échec: ${result.error || result.reason}`);
      }
    } catch (error) {
      setTestResult(`❌ Erreur: ${error}`);
    } finally {
      setTestingRule(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setFormData((prev) => {
      const isSelected = prev.eligibleUserIds.includes(userId);
      return {
        ...prev,
        eligibleUserIds: isSelected
          ? prev.eligibleUserIds.filter((id) => id !== userId)
          : [...prev.eligibleUserIds, userId],
      };
    });
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed_user':
        return 'Utilisateur Fixe';
      case 'round_robin':
        return 'Rotation (Round Robin)';
      case 'least_active':
        return 'Moins Actif';
      default:
        return type;
    }
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'fixed_user':
        return 'person';
      case 'round_robin':
        return 'sync';
      case 'least_active':
        return 'analytics';
      default:
        return 'help';
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
          title: 'Configuration des Assignations',
          headerBackTitle: 'Retour',
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Règles d&apos;Assignation Automatique</Text>
          <Text style={styles.headerSubtitle}>
            Configurez les règles pour assigner automatiquement les lots aux opérateurs
          </Text>
        </View>

        <ScrollView style={styles.content}>
          {stepDefinitions.map((step) => {
            const stepRules = assignmentRules.filter(
              (rule) => rule.step_definition_id === step.id && rule.is_active
            );

            return (
              <Card key={step.id} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepName}>{step.name}</Text>
                    <Text style={styles.stepRole}>Rôle: {step.required_role}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addRuleButton}
                    onPress={() => handleAddRule(step)}
                  >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                    <Text style={styles.addRuleButtonText}>Ajouter</Text>
                  </TouchableOpacity>
                </View>

                {stepRules.length > 0 ? (
                  <View style={styles.rulesContainer}>
                    {stepRules.map((rule) => {
                      const assignedUser = profiles.find((p) => p.id === rule.fixed_user_id);
                      const eligibleUsers = profiles.filter((p) =>
                        rule.eligible_user_ids?.includes(p.id)
                      );

                      return (
                        <View key={rule.id} style={styles.ruleItem}>
                          <View style={styles.ruleIconContainer}>
                            <Ionicons
                              name={getRuleTypeIcon(rule.rule_type) as any}
                              size={24}
                              color={Colors.primary}
                            />
                          </View>
                          <View style={styles.ruleContent}>
                            <Text style={styles.ruleType}>{getRuleTypeLabel(rule.rule_type)}</Text>
                            {rule.rule_type === 'fixed_user' && assignedUser && (
                              <Text style={styles.ruleDetails}>→ {assignedUser.name}</Text>
                            )}
                            {rule.rule_type !== 'fixed_user' && eligibleUsers.length > 0 && (
                              <Text style={styles.ruleDetails}>
                                {eligibleUsers.length} utilisateur{eligibleUsers.length > 1 ? 's' : ''}
                              </Text>
                            )}
                            <Text style={styles.rulePriority}>Priorité: {rule.priority}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteRuleButton}
                            onPress={() => handleDeleteRule(rule.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noRulesText}>Aucune règle configurée</Text>
                )}
              </Card>
            );
          })}
        </ScrollView>

        {/* Add/Edit Rule Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Ajouter une Règle d&apos;Assignation
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Rule Type Selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Type de Règle</Text>
                  <View style={styles.ruleTypeOptions}>
                    {(['fixed_user', 'round_robin', 'least_active'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.ruleTypeOption,
                          formData.ruleType === type && styles.ruleTypeOptionActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, ruleType: type, fixedUserId: null, eligibleUserIds: [] })
                        }
                      >
                        <Ionicons
                          name={getRuleTypeIcon(type) as any}
                          size={24}
                          color={formData.ruleType === type ? Colors.primary : Colors.text.tertiary}
                        />
                        <Text
                          style={[
                            styles.ruleTypeOptionText,
                            formData.ruleType === type && styles.ruleTypeOptionTextActive,
                          ]}
                        >
                          {getRuleTypeLabel(type)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Fixed User Selection */}
                {formData.ruleType === 'fixed_user' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Utilisateur Fixe</Text>
                    <View style={styles.usersList}>
                      {profiles.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          style={[
                            styles.userOption,
                            formData.fixedUserId === user.id && styles.userOptionSelected,
                          ]}
                          onPress={() => setFormData({ ...formData, fixedUserId: user.id })}
                        >
                          <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <Text style={styles.userRole}>{user.role}</Text>
                          </View>
                          {formData.fixedUserId === user.id && (
                            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Eligible Users Selection */}
                {(formData.ruleType === 'round_robin' || formData.ruleType === 'least_active') && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Utilisateurs Éligibles</Text>
                    <View style={styles.usersList}>
                      {profiles.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          style={[
                            styles.userOption,
                            formData.eligibleUserIds.includes(user.id) && styles.userOptionSelected,
                          ]}
                          onPress={() => toggleUserSelection(user.id)}
                        >
                          <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <Text style={styles.userRole}>{user.role}</Text>
                          </View>
                          {formData.eligibleUserIds.includes(user.id) && (
                            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Priority */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Priorité (0-100)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.priority.toString()}
                    onChangeText={(text) => setFormData({ ...formData, priority: parseInt(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                  <Text style={styles.helperText}>Plus la priorité est élevée, plus la règle sera prioritaire</Text>
                </View>

                {/* Test Rule Button */}
                <Button
                  title="Tester la Règle"
                  onPress={handleTestRule}
                  variant="outline"
                  loading={testingRule}
                  icon={<Ionicons name="flask-outline" size={20} color={Colors.primary} />}
                  style={styles.testButton}
                />

                {testResult && (
                  <View style={styles.testResultContainer}>
                    <Text style={styles.testResultText}>{testResult}</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="Annuler"
                  onPress={() => setModalVisible(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Enregistrer"
                  onPress={handleSaveRule}
                  style={styles.modalButton}
                  loading={loading}
                />
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
  stepCard: {
    marginBottom: Spacing.md,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepRole: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  addRuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.sm,
  },
  addRuleButtonText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },
  rulesContainer: {
    gap: Spacing.sm,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ruleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  ruleContent: {
    flex: 1,
  },
  ruleType: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  ruleDetails: {
    ...Typography.small,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  rulePriority: {
    ...Typography.small,
    color: Colors.text.tertiary,
    fontSize: 11,
  },
  deleteRuleButton: {
    padding: Spacing.xs,
  },
  noRulesText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    width: '90%',
    maxHeight: '80%',
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
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  ruleTypeOptions: {
    gap: Spacing.sm,
  },
  ruleTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ruleTypeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  ruleTypeOptionText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  ruleTypeOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  usersList: {
    gap: Spacing.xs,
    maxHeight: 200,
  },
  userOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  userRole: {
    ...Typography.small,
    color: Colors.text.secondary,
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
  helperText: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  testButton: {
    marginBottom: Spacing.md,
  },
  testResultContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  testResultText: {
    ...Typography.body,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
});
