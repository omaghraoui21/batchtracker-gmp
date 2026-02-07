/**
 * User Management Screen
 *
 * Comprehensive user management interface for Admins to create, read, update,
 * and delete users with full RBAC enforcement and audit logging.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { UserListSkeleton } from '@/components/SkeletonLoader';
import { logUserCreation, logUserUpdate } from '@/lib/auditLog';
import * as Haptics from 'expo-haptics';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserFormData {
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
  department: string;
  phone: string;
  is_active: boolean;
}

export default function UsersManagementScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'OPERATOR',
    department: '',
    phone: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Access control: Only ADMIN can access this screen
  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      Alert.alert('Accès refusé', 'Vous devez avoir le rôle ADMIN pour accéder à cette section.', [
        { text: 'Retour', onPress: () => router.back() },
      ]);
    }
  }, [currentUser, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste des utilisateurs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof UserFormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email invalide';
    }

    if (!formData.department.trim()) {
      errors.department = 'Le département est requis';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkEmailUnique = async (email: string, excludeUserId?: string): Promise<boolean> => {
    try {
      let query = supabase.from('profiles').select('email').eq('email', email);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query;

      if (error && error.code !== 'PGRST116') throw error;

      return !data || data.length === 0;
    } catch (error) {
      console.error('Error checking email uniqueness:', error);
      return false;
    }
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    // Check email uniqueness
    const isUnique = await checkEmailUnique(formData.email);
    if (!isUnique) {
      Alert.alert('Erreur', 'Cet email est déjà utilisé');
      return;
    }

    try {
      setSubmitting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Generate a UUID for the new user
      const newUserId = crypto.randomUUID();

      // Create user profile
      const { data: newUser, error } = await supabase
        .from('profiles')
        .insert({
          id: newUserId,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          phone: formData.phone || null,
          is_active: formData.is_active,
        })
        .select()
        .single();

      if (error) throw error;

      // Log user creation for audit trail
      await logUserCreation(
        newUser.id,
        newUser.email,
        currentUser?.id || 'system',
        currentUser?.name || 'System',
        currentUser?.role || 'ADMIN',
        newUser.role
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Succès', `Utilisateur ${formData.name} créé avec succès`, [
        { text: 'OK', onPress: () => setShowCreateModal(false) },
      ]);

      // Refresh user list
      fetchUsers();

      // Reset form
      setFormData({
        name: '',
        email: '',
        role: 'OPERATOR',
        department: '',
        phone: '',
        is_active: true,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'utilisateur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !validateForm()) return;

    // Check email uniqueness (excluding current user)
    const isUnique = await checkEmailUnique(formData.email, editingUser.id);
    if (!isUnique) {
      Alert.alert('Erreur', 'Cet email est déjà utilisé');
      return;
    }

    try {
      setSubmitting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          phone: formData.phone || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Log user update for audit trail
      await logUserUpdate(
        editingUser.id,
        formData.email,
        currentUser?.id || 'system',
        currentUser?.name || 'System',
        currentUser?.role || 'ADMIN',
        {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
        }
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Succès', 'Utilisateur mis à jour avec succès');

      // Refresh user list
      fetchUsers();

      // Close modal
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'OPERATOR',
        department: '',
        phone: '',
        is_active: true,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'utilisateur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (user: Profile) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('profiles').delete().eq('id', user.id);

              if (error) throw error;

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Succès', 'Utilisateur supprimé avec succès');
              fetchUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'utilisateur');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role as 'ADMIN' | 'MANAGER' | 'OPERATOR',
      department: user.department || '',
      phone: user.phone || '',
      is_active: user.is_active ?? true,
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'OPERATOR',
      department: '',
      phone: '',
      is_active: true,
    });
    setFormErrors({});
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return Colors.error;
      case 'MANAGER':
        return Colors.primary;
      case 'OPERATOR':
        return Colors.success;
      default:
        return Colors.text.secondary;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur';
      case 'MANAGER':
        return 'Superviseur';
      case 'OPERATOR':
        return 'Opérateur';
      default:
        return role;
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentUser?.role !== 'ADMIN') {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestion des Utilisateurs',
          headerBackTitle: 'Retour',
        }}
      />
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={Colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un utilisateur..."
              placeholderTextColor={Colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* User List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{users.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{users.filter((u) => u.role === 'ADMIN').length}</Text>
              <Text style={styles.statLabel}>Admins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{users.filter((u) => u.is_active).length}</Text>
              <Text style={styles.statLabel}>Actifs</Text>
            </View>
          </View>

          {loading ? (
            <UserListSkeleton count={5} />
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={styles.userMeta}>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                        <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                          {getRoleLabel(user.role)}
                        </Text>
                      </View>
                      {user.department && (
                        <View style={styles.departmentBadge}>
                          <Ionicons name="business-outline" size={12} color={Colors.text.secondary} />
                          <Text style={styles.departmentText}>{user.department}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.userActions}>
                    {!user.is_active && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveText}>Inactif</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => openEditModal(user)} style={styles.actionButton}>
                      <Ionicons name="pencil" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteUser(user)} style={styles.actionButton}>
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>

        {/* Create User FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={Colors.surface} />
        </TouchableOpacity>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                  </Text>
                  <TouchableOpacity onPress={closeModal}>
                    <Ionicons name="close" size={24} color={Colors.text.primary} />
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Nom complet <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, formErrors.name && styles.inputError]}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Ex: Jean Dupont"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                  {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Email <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, formErrors.email && styles.inputError]}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder="Ex: jean.dupont@example.com"
                    placeholderTextColor={Colors.text.tertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Rôle <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.roleSelector}>
                    {(['ADMIN', 'MANAGER', 'OPERATOR'] as const).map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleSelectorButton,
                          formData.role === role && styles.roleSelectorButtonActive,
                          formData.role === role && { borderColor: getRoleColor(role) },
                        ]}
                        onPress={() => setFormData({ ...formData, role })}
                      >
                        <Text
                          style={[
                            styles.roleSelectorText,
                            formData.role === role && { color: getRoleColor(role) },
                          ]}
                        >
                          {getRoleLabel(role)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Département/Unité <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, formErrors.department && styles.inputError]}
                    value={formData.department}
                    onChangeText={(text) => setFormData({ ...formData, department: text })}
                    placeholder="Ex: Stérile, Pesée, QA"
                    placeholderTextColor={Colors.text.tertiary}
                  />
                  {formErrors.department && <Text style={styles.errorText}>{formErrors.department}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Téléphone</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    placeholder="Ex: +33 1 23 45 67 89"
                    placeholderTextColor={Colors.text.tertiary}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchContainer}>
                    <Text style={styles.label}>Statut actif</Text>
                    <TouchableOpacity
                      style={[styles.switch, formData.is_active && styles.switchActive]}
                      onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    >
                      <View
                        style={[styles.switchThumb, formData.is_active && styles.switchThumbActive]}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={closeModal}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={editingUser ? handleUpdateUser : handleCreateUser}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color={Colors.surface} />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {editingUser ? 'Mettre à jour' : 'Créer'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.xs,
    fontSize: 16,
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  userCard: {
    marginBottom: Spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userAvatarText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    ...Typography.small,
    fontWeight: '600',
    fontSize: 10,
  },
  departmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  departmentText: {
    ...Typography.small,
    color: Colors.text.secondary,
    fontSize: 10,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  inactiveBadge: {
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
  },
  inactiveText: {
    ...Typography.small,
    color: Colors.warning,
    fontWeight: '600',
    fontSize: 10,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxHeight: '90%',
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
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.small,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleSelectorButton: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  roleSelectorButtonActive: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
  },
  roleSelectorText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: Colors.success,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.primary,
  },
  submitButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '700',
  },
});
