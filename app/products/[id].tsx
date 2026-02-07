import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { logProductAdded, logProductModified } from '@/lib/auditLog';

type Product = {
  id: string;
  product_code: string;
  product_name: string;
  technical_description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
};

// Blue Cobalt theme
const CobaltColors = {
  primary: '#0047AB',
  primaryLight: '#2E6FD8',
  primaryDark: '#003080',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
};

export default function ProductEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    technical_description: '',
    is_active: true,
  });

  const [errors, setErrors] = useState({
    product_code: '',
    product_name: '',
  });

  useEffect(() => {
    if (!isNew) {
      fetchProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        product_code: data.product_code,
        product_name: data.product_name,
        technical_description: data.technical_description || '',
        is_active: data.is_active ?? true,
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Erreur', 'Impossible de charger le produit');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      product_code: '',
      product_name: '',
    };

    if (!formData.product_code.trim()) {
      newErrors.product_code = 'Le code produit est requis';
    }

    if (!formData.product_name.trim()) {
      newErrors.product_name = 'Le nom du produit est requis';
    }

    setErrors(newErrors);
    return !newErrors.product_code && !newErrors.product_name;
  };

  const checkProductCodeUnique = async (): Promise<boolean> => {
    try {
      let query = supabase
        .from('products')
        .select('id')
        .eq('product_code', formData.product_code);

      // Exclude current product if editing
      if (!isNew) {
        query = query.neq('id', id);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is what we want
        throw error;
      }

      if (data) {
        setErrors((prev) => ({
          ...prev,
          product_code: 'Ce code produit existe déjà',
        }));
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking product code:', error);
      return true; // Allow save if check fails
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Validation Échouée',
        'Veuillez remplir tous les champs obligatoires avant de continuer.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check uniqueness
    const isUnique = await checkProductCodeUnique();
    if (!isUnique) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Code Produit Existant',
        `Le code produit "${formData.product_code}" existe déjà dans le catalogue. Veuillez utiliser un code unique.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const mockUserId = 'user-123';
      const mockUserName = 'Admin User';

      if (isNew) {
        // Create new product
        const { data, error } = await supabase
          .from('products')
          .insert({
            product_code: formData.product_code.trim(),
            product_name: formData.product_name.trim(),
            technical_description: formData.technical_description?.trim() || null,
            is_active: formData.is_active,
            created_by: mockUserId,
          })
          .select()
          .single();

        if (error) {
          console.error('Supabase insert error:', error);

          // Handle specific error types
          if (error.code === '23505') {
            // Unique constraint violation
            throw new Error('DUPLICATE_PRODUCT_CODE');
          }

          throw error;
        }

        // Log creation
        try {
          await logProductAdded(
            data.id,
            data.product_code,
            data.product_name,
            mockUserId,
            mockUserName,
            'ADMIN'
          );
        } catch (auditError) {
          console.warn('Audit logging failed (non-critical):', auditError);
          // Continue - audit failure shouldn't block product creation
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Succès',
          `Le produit ${data.product_code} a été ajouté au catalogue avec succès.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            product_code: formData.product_code.trim(),
            product_name: formData.product_name.trim(),
            technical_description: formData.technical_description?.trim() || null,
            is_active: formData.is_active,
          })
          .eq('id', id);

        if (error) {
          console.error('Supabase update error:', error);

          // Handle specific error types
          if (error.code === '23505') {
            throw new Error('DUPLICATE_PRODUCT_CODE');
          }

          throw error;
        }

        // Log modification
        try {
          await logProductModified(
            id,
            formData.product_code,
            mockUserId,
            mockUserName,
            'ADMIN',
            formData
          );
        } catch (auditError) {
          console.warn('Audit logging failed (non-critical):', auditError);
          // Continue - audit failure shouldn't block product update
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Succès',
          `Le produit ${formData.product_code} a été modifié avec succès.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error('Error saving product:', error);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Provide specific error messages
      let errorMessage = 'Une erreur technique est survenue lors de la sauvegarde.';
      let errorTitle = 'Erreur de Sauvegarde';

      if (error.message === 'DUPLICATE_PRODUCT_CODE') {
        errorTitle = 'Code Produit Existant';
        errorMessage = `Le code produit "${formData.product_code}" existe déjà. Veuillez utiliser un code unique.`;
      } else if (error.code === '23502') {
        errorTitle = 'Données Manquantes';
        errorMessage = 'Certains champs obligatoires sont manquants. Veuillez vérifier le formulaire.';
      } else if (error.code === '23503') {
        errorTitle = 'Référence Invalide';
        errorMessage = 'Une référence associée est invalide. Veuillez contacter le support.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorTitle = 'Problème de Connexion';
        errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion Internet.';
      }

      Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CobaltColors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'Nouveau Produit' : 'Modifier Produit',
          headerStyle: {
            backgroundColor: CobaltColors.primary,
          },
          headerTintColor: '#FFFFFF',
          headerBackTitle: 'Retour',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
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
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 4 }}>
                Catalogue
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.formCard}>
          <View style={styles.formHeader}>
            <Ionicons name="cube" size={32} color={CobaltColors.primary} />
            <Text style={styles.formTitle}>
              {isNew ? 'Ajouter un Produit' : 'Modifier le Produit'}
            </Text>
            <Text style={styles.formSubtitle}>
              Définissez les informations du référentiel produit
            </Text>
          </View>

          {/* Product Code */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Code Produit / SKU <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.hint}>Ex: P500-FR-01, MED-2024-001</Text>
            <TextInput
              style={[styles.input, errors.product_code && styles.inputError]}
              value={formData.product_code}
              onChangeText={(text) => {
                setFormData({ ...formData, product_code: text.toUpperCase() });
                setErrors({ ...errors, product_code: '' });
              }}
              placeholder="P500-FR-01"
              placeholderTextColor={CobaltColors.text.tertiary}
              autoCapitalize="characters"
              editable={!saving}
            />
            {errors.product_code && <Text style={styles.errorText}>{errors.product_code}</Text>}
          </View>

          {/* Product Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Nom du Produit <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.hint}>Nom commercial du produit</Text>
            <TextInput
              style={[styles.input, errors.product_name && styles.inputError]}
              value={formData.product_name}
              onChangeText={(text) => {
                setFormData({ ...formData, product_name: text });
                setErrors({ ...errors, product_name: '' });
              }}
              placeholder="Ex: Paracetamol 500mg"
              placeholderTextColor={CobaltColors.text.tertiary}
              editable={!saving}
            />
            {errors.product_name && <Text style={styles.errorText}>{errors.product_name}</Text>}
          </View>

          {/* Technical Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description Technique</Text>
            <Text style={styles.hint}>Dosage, forme galénique, caractéristiques</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.technical_description}
              onChangeText={(text) =>
                setFormData({ ...formData, technical_description: text })
              }
              placeholder="Ex: Comprimé pelliculé, 500mg de paracétamol, boîte de 30"
              placeholderTextColor={CobaltColors.text.tertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!saving}
            />
          </View>

          {/* Active Status */}
          <View style={styles.formGroup}>
            <View style={styles.switchContainer}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Produit Actif</Text>
                <Text style={styles.hint}>
                  {formData.is_active
                    ? 'Disponible pour les nouveaux lots'
                    : 'Archivé, non disponible pour les nouveaux lots'}
                </Text>
              </View>
              <Switch
                value={formData.is_active}
                onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                trackColor={{ false: CobaltColors.text.tertiary, true: CobaltColors.primary }}
                thumbColor="#FFFFFF"
                disabled={saving}
              />
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={CobaltColors.primary} />
            <Text style={styles.infoText}>
              Seuls les produits actifs pourront être sélectionnés lors de la création de
              nouveaux lots de fabrication.
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Annuler"
            variant="outline"
            onPress={() => router.back()}
            disabled={saving}
            style={styles.button}
          />
          <Button
            title={isNew ? 'Ajouter' : 'Enregistrer'}
            onPress={handleSave}
            loading={saving}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CobaltColors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CobaltColors.background,
  },
  loadingText: {
    ...Typography.body,
    color: CobaltColors.text.secondary,
    marginTop: Spacing.md,
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  formTitle: {
    ...Typography.h2,
    color: CobaltColors.text.primary,
    marginTop: Spacing.sm,
  },
  formSubtitle: {
    ...Typography.caption,
    color: CobaltColors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    color: CobaltColors.text.primary,
    marginBottom: Spacing.xs,
  },
  required: {
    color: CobaltColors.error,
  },
  hint: {
    ...Typography.small,
    color: CobaltColors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: CobaltColors.surface,
    borderWidth: 1,
    borderColor: CobaltColors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Typography.body,
    color: CobaltColors.text.primary,
  },
  inputError: {
    borderColor: CobaltColors.error,
    borderWidth: 2,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  errorText: {
    ...Typography.small,
    color: CobaltColors.error,
    marginTop: Spacing.xs,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CobaltColors.surface,
    borderWidth: 1,
    borderColor: CobaltColors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: CobaltColors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  infoText: {
    ...Typography.caption,
    color: CobaltColors.primary,
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
  },
});
