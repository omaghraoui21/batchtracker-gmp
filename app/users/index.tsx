/**
 * User Management Screen
 *
 * Comprehensive user management interface for Admins to create, read, update,
 * and delete users with full RBAC enforcement and audit logging.
 *
 * GMP Roles: ADMIN | SUPERUSER | PRODUCTION | SUPERVISOR | QA | VIEWER
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { useToast } from '@/components/Toast';
import { UserListSkeleton } from '@/components/SkeletonLoader';
import { logUserCreation, logUserUpdate } from '@/lib/auditLog';
import * as Haptics from 'expo-haptics';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * All GMP-compliant roles available in the system.
 */
const ALL_ROLES = ['ADMIN', 'SUPERUSER', 'PRODUCTION', 'SUPERVISOR', 'QA', 'VIEWER'] as const;
type UserRole = (typeof ALL_ROLES)[number];

/**
 * French labels for each GMP role.
 */
const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  SUPERUSER: 'Super Utilisateur',
  PRODUCTION: 'Operateur Production',
  SUPERVISOR: 'Superviseur',
  QA: 'Qualite (QA)',
  VIEWER: 'Observateur',
};

/**
 * Color mapping for each role (badge backgrounds and text).
 */
const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: Colors.error,
  SUPERUSER: '#8B5CF6',       // Purple for superuser
  PRODUCTION: Colors.success,
  SUPERVISOR: Colors.primary,
  QA: Colors.warning,
  VIEWER: Colors.text.secondary,
};

interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone: string;
  is_active: boolean;
}

const INITIAL_FORM_DATA: UserFormData = {
  name: '',
  email: '',
  role: 'VIEWER',
  department: '',
  phone: '',
  is_active: true,
};

/**
 * Generate a UUID with fallback for environments where crypto.randomUUID is unavailable.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: RFC4122 v4 UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate a phone number.
 * Accepts international formats like +33 1 23 45 67 89 or local numbers.
 * Returns an error message in French if invalid, or null if valid/empty.
 */
function validatePhone(phone: string): string | null {
  if (!phone.trim()) return null; // Phone is optional
  // Strip spaces, dashes, dots for validation
  const cleaned = phone.replace(/[\s\-().]/g, '');
  // Must be digits with optional leading +
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    return 'Numero de telephone invalide (7-15 chiffres, + optionnel)';
  }
  return null;
}

/**
 * Validate an email address.
 * Returns an error message in French if invalid, or null if valid.
 */
function validateEmail(email: string): string | null {
  if (!email.trim()) return 'L\'email est requis';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Format d\'email invalide';
  }
  return null;
}

export default function UsersManagementScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ ...INITIAL_FORM_DATA });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const fetchUsers = useCallback(async () => {
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
      toast.showError('Erreur', 'Impossible de charger la liste des utilisateurs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Access control: Only ADMIN can access this screen
  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      toast.showError(
        'Acces refuse',
        'Vous devez avoir le role ADMIN pour acceder a cette section.'
      );
      router.back();
    }
  }, [currentUser, router, toast]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof UserFormData, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Le nom est requis';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Le nom doit contenir au moins 2 caracteres';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Le nom ne peut pas depasser 100 caracteres';
    }

    // Email validation
    const emailError = validateEmail(formData.email);
    if (emailError) {
      errors.email = emailError;
    }

    // Department validation
    if (!formData.department.trim()) {
      errors.department = 'Le departement est requis';
    } else if (formData.department.trim().length > 100) {
      errors.department = 'Le departement ne peut pas depasser 100 caracteres';
    }

    // Phone validation
    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      errors.phone = phoneError;
    }

    // Role validation
    if (!ALL_ROLES.includes(formData.role)) {
      errors.role = 'Role invalide selectionne';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkEmailUnique = async (email: string, excludeUserId?: string): Promise<boolean> => {
    try {
      setCheckingEmail(true);
      let query = supabase.from('profiles').select('id, email').eq('email', email.trim().toLowerCase());

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query;

      if (error && error.code !== 'PGRST116') throw error;

      return !data || data.length === 0;
    } catch (error) {
      console.error('Error checking email uniqueness:', error);
      // On error, assume not unique to prevent duplicates
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleCreateUser = async () => {
    if (!validateForm()) {
      toast.showWarning('Formulaire incomplet', 'Veuillez corriger les erreurs du formulaire.');
      return;
    }

    try {
      setSubmitting(true);

      // Check email uniqueness
      const isUnique = await checkEmailUnique(formData.email);
      if (!isUnique) {
        setFormErrors((prev) => ({
          ...prev,
          email: 'Cet email est deja utilise par un autre utilisateur',
        }));
        toast.showError(
          'Email en double',
          `L'adresse "${formData.email.trim()}" est deja attribuee a un utilisateur existant.`
        );
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Generate a UUID for the new user
      const newUserId = generateUUID();

      // Create user profile
      const { data: newUser, error } = await supabase
        .from('profiles')
        .insert({
          id: newUserId,
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          department: formData.department.trim(),
          phone: formData.phone.trim() || null,
          is_active: formData.is_active,
        })
        .select()
        .single();

      if (error) throw error;

      // Log user creation for audit trail
      try {
        await logUserCreation(
          newUser.id,
          newUser.email,
          currentUser?.id || 'system',
          currentUser?.name || 'System',
          currentUser?.role || 'ADMIN',
          newUser.role
        );
      } catch (auditError) {
        console.error('Audit log error (non-blocking):', auditError);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.showSuccess(
        'Utilisateur cree',
        `${formData.name.trim()} (${ROLE_LABELS[formData.role]}) a ete ajoute avec succes.`
      );

      // Close modal and reset form
      setShowCreateModal(false);
      setFormData({ ...INITIAL_FORM_DATA });
      setFormErrors({});

      // Refresh user list
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Erreur de creation', 'Impossible de creer l\'utilisateur. Veuillez reessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !validateForm()) {
      toast.showWarning('Formulaire incomplet', 'Veuillez corriger les erreurs du formulaire.');
      return;
    }

    try {
      setSubmitting(true);

      // Check email uniqueness (excluding current user)
      const isUnique = await checkEmailUnique(formData.email, editingUser.id);
      if (!isUnique) {
        setFormErrors((prev) => ({
          ...prev,
          email: 'Cet email est deja utilise par un autre utilisateur',
        }));
        toast.showError(
          'Email en double',
          `L'adresse "${formData.email.trim()}" est deja attribuee a un autre utilisateur.`
        );
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          department: formData.department.trim(),
          phone: formData.phone.trim() || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Log user update for audit trail
      try {
        await logUserUpdate(
          editingUser.id,
          formData.email.trim().toLowerCase(),
          currentUser?.id || 'system',
          currentUser?.name || 'System',
          currentUser?.role || 'ADMIN',
          {
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            role: formData.role,
            department: formData.department.trim(),
          }
        );
      } catch (auditError) {
        console.error('Audit log error (non-blocking):', auditError);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.showSuccess(
        'Utilisateur mis a jour',
        `${formData.name.trim()} a ete modifie avec succes.`
      );

      // Close modal and reset form
      setEditingUser(null);
      setShowCreateModal(false);
      setFormData({ ...INITIAL_FORM_DATA });
      setFormErrors({});

      // Refresh user list
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Erreur de mise a jour', 'Impossible de mettre a jour l\'utilisateur.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (user: Profile) => {
    if (user.id === currentUser?.id) {
      toast.showWarning('Action interdite', 'Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }

    Alert.alert(
      'Confirmer la suppression',
      `Etes-vous sur de vouloir supprimer l'utilisateur ${user.name} ?\n\nCette action est irreversible.`,
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
              toast.showSuccess(
                'Utilisateur supprime',
                `${user.name} a ete supprime avec succes.`
              );
              fetchUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              toast.showError('Erreur', 'Impossible de supprimer l\'utilisateur.');
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
      role: (ALL_ROLES.includes(user.role as UserRole) ? user.role : 'VIEWER') as UserRole,
      department: user.department || '',
      phone: user.phone || '',
      is_active: user.is_active ?? true,
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingUser(null);
    setFormData({ ...INITIAL_FORM_DATA });
    setFormErrors({});
  };

  const getRoleColor = (role: string): string => {
    return ROLE_COLORS[role as UserRole] || Colors.text.secondary;
  };

  const getRoleLabel = (role: string): string => {
    return ROLE_LABELS[role as UserRole] || role;
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getRoleLabel(user.role).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentUser?.role !== 'ADMIN') {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gestion des Utilisateurs',
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
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyStateTitle}>
                {searchQuery ? 'Aucun resultat' : 'Aucun utilisateur'}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? `Aucun utilisateur ne correspond a "${searchQuery}"`
                  : 'Commencez par creer un utilisateur avec le bouton +'}
              </Text>
            </View>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={[styles.userAvatar, !user.is_active && styles.userAvatarInactive]}>
                    <Text style={styles.userAvatarText}>
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
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
          onPress={() => {
            setFormData({ ...INITIAL_FORM_DATA });
            setFormErrors({});
            setEditingUser(null);
            setShowCreateModal(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={Colors.surface} />
        </TouchableOpacity>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                  </Text>
                  <TouchableOpacity onPress={closeModal} disabled={submitting}>
                    <Ionicons name="close" size={24} color={Colors.text.primary} />
                  </TouchableOpacity>
                </View>

                {/* Submission overlay */}
                {submitting && (
                  <View style={styles.submittingOverlay}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.submittingText}>
                      {editingUser ? 'Mise a jour en cours...' : 'Creation en cours...'}
                    </Text>
                  </View>
                )}

                {/* Form Fields */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Nom complet <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, formErrors.name && styles.inputError]}
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData({ ...formData, name: text });
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder="Ex: Jean Dupont"
                    placeholderTextColor={Colors.text.tertiary}
                    editable={!submitting}
                    maxLength={100}
                  />
                  {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Email <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.emailInputContainer}>
                    <TextInput
                      style={[styles.input, styles.emailInput, formErrors.email && styles.inputError]}
                      value={formData.email}
                      onChangeText={(text) => {
                        setFormData({ ...formData, email: text });
                        if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      placeholder="Ex: jean.dupont@example.com"
                      placeholderTextColor={Colors.text.tertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!submitting}
                    />
                    {checkingEmail && (
                      <ActivityIndicator
                        size="small"
                        color={Colors.primary}
                        style={styles.emailSpinner}
                      />
                    )}
                  </View>
                  {formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Role <Text style={styles.required}>*</Text>
                  </Text>
                  {formErrors.role && <Text style={styles.errorText}>{formErrors.role}</Text>}
                  <View style={styles.roleSelector}>
                    {ALL_ROLES.map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleSelectorButton,
                          formData.role === role && styles.roleSelectorButtonActive,
                          formData.role === role && { borderColor: getRoleColor(role) },
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, role });
                          if (formErrors.role) setFormErrors((prev) => ({ ...prev, role: undefined }));
                        }}
                        disabled={submitting}
                      >
                        <Text
                          style={[
                            styles.roleSelectorText,
                            formData.role === role && { color: getRoleColor(role), fontWeight: '700' },
                          ]}
                          numberOfLines={2}
                        >
                          {ROLE_LABELS[role]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Departement/Unite <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, formErrors.department && styles.inputError]}
                    value={formData.department}
                    onChangeText={(text) => {
                      setFormData({ ...formData, department: text });
                      if (formErrors.department) setFormErrors((prev) => ({ ...prev, department: undefined }));
                    }}
                    placeholder="Ex: Sterile, Pesee, QA"
                    placeholderTextColor={Colors.text.tertiary}
                    editable={!submitting}
                    maxLength={100}
                  />
                  {formErrors.department && <Text style={styles.errorText}>{formErrors.department}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Telephone</Text>
                  <TextInput
                    style={[styles.input, formErrors.phone && styles.inputError]}
                    value={formData.phone}
                    onChangeText={(text) => {
                      setFormData({ ...formData, phone: text });
                      if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    placeholder="Ex: +33 1 23 45 67 89"
                    placeholderTextColor={Colors.text.tertiary}
                    keyboardType="phone-pad"
                    editable={!submitting}
                  />
                  {formErrors.phone && <Text style={styles.errorText}>{formErrors.phone}</Text>}
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.switchContainer}>
                    <Text style={styles.label}>Statut actif</Text>
                    <TouchableOpacity
                      style={[styles.switch, formData.is_active && styles.switchActive]}
                      onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      disabled={submitting}
                    >
                      <View
                        style={[styles.switchThumb, formData.is_active && styles.switchThumbActive]}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.switchHint}>
                    {formData.is_active
                      ? 'L\'utilisateur pourra se connecter'
                      : 'L\'utilisateur ne pourra pas se connecter'}
                  </Text>
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
                    style={[
                      styles.modalButton,
                      styles.submitButton,
                      submitting && styles.submitButtonDisabled,
                    ]}
                    onPress={editingUser ? handleUpdateUser : handleCreateUser}
                    disabled={submitting || checkingEmail}
                  >
                    {submitting ? (
                      <View style={styles.submitLoadingContainer}>
                        <ActivityIndicator color={Colors.surface} size="small" />
                        <Text style={[styles.submitButtonText, { marginLeft: Spacing.xs }]}>
                          {editingUser ? 'Mise a jour...' : 'Creation...'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {editingUser ? 'Mettre a jour' : 'Creer'}
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.sm,
  },
  emptyStateTitle: {
    ...Typography.h3,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  emptyStateText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
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
  userAvatarInactive: {
    backgroundColor: Colors.inactive,
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
    flexWrap: 'wrap',
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
  submittingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  submittingText: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: Spacing.sm,
    fontWeight: '600',
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
  emailInputContainer: {
    position: 'relative',
  },
  emailInput: {
    paddingRight: Spacing.xl + Spacing.md,
  },
  emailSpinner: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    marginTop: -10,
  },
  errorText: {
    ...Typography.small,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleSelectorButton: {
    width: '30%',
    flexGrow: 1,
    minWidth: 90,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  roleSelectorButtonActive: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
  },
  roleSelectorText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.secondary,
    textAlign: 'center',
    fontSize: 12,
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
  switchHint: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
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
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '700',
  },
  submitLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
