import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import * as Haptics from 'expo-haptics';
import { logProductModified, logProductArchived } from '@/lib/auditLog';

type Product = Database['public']['Tables']['products']['Row'];

// Blue Cobalt theme for professional industrial ERP aesthetic
const CobaltColors = {
  primary: '#0047AB', // Blue Cobalt
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

export default function ProductCatalogScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_code', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter((p) => p.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((p) => !p.is_active);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.product_code.toLowerCase().includes(query) ||
          p.product_name.toLowerCase().includes(query) ||
          p.technical_description?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = !product.is_active;
    const action = newStatus ? 'activer' : 'archiver';

    Alert.alert(
      `${newStatus ? 'Activer' : 'Archiver'} le produit`,
      `Voulez-vous ${action} le produit ${product.product_code}?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: newStatus ? 'Activer' : 'Archiver',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('products')
                .update({ is_active: newStatus })
                .eq('id', product.id);

              if (error) throw error;

              if (!newStatus) {
                // Log archiving
                await logProductArchived(
                  product.id,
                  product.product_code,
                  product.product_name,
                  'user-123',
                  'Admin User',
                  'ADMIN'
                );
              } else {
                // Log reactivation
                await logProductModified(
                  product.id,
                  product.product_code,
                  'user-123',
                  'Admin User',
                  'ADMIN',
                  { is_active: true }
                );
              }

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Succès', `Produit ${newStatus ? 'activé' : 'archivé'} avec succès`);
              fetchProducts();
            } catch (error) {
              console.error('Error updating product:', error);
              Alert.alert('Erreur', 'Impossible de modifier le statut du produit');
            }
          },
        },
      ]
    );
  };

  const _handleDeleteProduct = async (product: Product) => {
    Alert.alert(
      'Supprimer le produit',
      `Êtes-vous sûr de vouloir supprimer définitivement ${product.product_code}? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('products').delete().eq('id', product.id);

              if (error) throw error;

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Succès', 'Produit supprimé avec succès');
              fetchProducts();
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le produit');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CobaltColors.primary} />
        <Text style={styles.loadingText}>Chargement du catalogue...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Catalogue Produits',
          headerStyle: {
            backgroundColor: CobaltColors.primary,
          },
          headerTintColor: '#FFFFFF',
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
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 4 }}>
                Retour Admin
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Header Card with Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{products.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: CobaltColors.success }]}>
                {products.filter((p) => p.is_active).length}
              </Text>
              <Text style={styles.statLabel}>Actifs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: CobaltColors.text.tertiary }]}>
                {products.filter((p) => !p.is_active).length}
              </Text>
              <Text style={styles.statLabel}>Inactifs</Text>
            </View>
          </View>
        </Card>

        {/* Search and Filter */}
        <View style={styles.controlsContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={CobaltColors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par code ou nom..."
              placeholderTextColor={CobaltColors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={CobaltColors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterContainer}>
            {(['all', 'active', 'inactive'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  statusFilter === filter && styles.filterButtonActive,
                ]}
                onPress={() => setStatusFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    statusFilter === filter && styles.filterButtonTextActive,
                  ]}
                >
                  {filter === 'all' ? 'Tous' : filter === 'active' ? 'Actifs' : 'Inactifs'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Product List */}
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color={CobaltColors.text.tertiary} />
              <Text style={styles.emptyText}>Aucun produit trouvé</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Essayez une autre recherche'
                  : 'Ajoutez votre premier produit au catalogue'}
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                onPress={() => router.push(`/products/${product.id}`)}
                activeOpacity={0.7}
              >
                <Card style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <View style={styles.productHeaderLeft}>
                      <View style={styles.productCodeBadge}>
                        <Text style={styles.productCode}>{product.product_code}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          product.is_active
                            ? styles.statusBadgeActive
                            : styles.statusBadgeInactive,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor: product.is_active
                                ? CobaltColors.success
                                : CobaltColors.text.tertiary,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: product.is_active
                                ? CobaltColors.success
                                : CobaltColors.text.tertiary,
                            },
                          ]}
                        >
                          {product.is_active ? 'Actif' : 'Inactif'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.productActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/products/${product.id}`)}
                      >
                        <Ionicons name="create-outline" size={20} color={CobaltColors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleToggleStatus(product)}
                      >
                        <Ionicons
                          name={product.is_active ? 'archive-outline' : 'refresh-outline'}
                          size={20}
                          color={
                            product.is_active ? CobaltColors.warning : CobaltColors.success
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.productName}>{product.product_name}</Text>

                  {product.technical_description && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {product.technical_description}
                    </Text>
                  )}

                  <View style={styles.productFooter}>
                    <Text style={styles.productDate}>
                      Créé le {new Date(product.created_at!).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Add Product Button */}
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/products/new')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CobaltColors.background,
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
  statsCard: {
    margin: Spacing.lg,
    marginBottom: 0,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: CobaltColors.primary,
  },
  statLabel: {
    ...Typography.caption,
    color: CobaltColors.text.secondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: CobaltColors.border,
  },
  controlsContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CobaltColors.surface,
    borderWidth: 1,
    borderColor: CobaltColors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: CobaltColors.text.primary,
    marginLeft: Spacing.sm,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: CobaltColors.surface,
    borderWidth: 1,
    borderColor: CobaltColors.border,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: CobaltColors.primary,
    borderColor: CobaltColors.primary,
  },
  filterButtonText: {
    ...Typography.body,
    color: CobaltColors.text.secondary,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 100, // Space for FAB
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    ...Typography.h3,
    color: CobaltColors.text.secondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    ...Typography.caption,
    color: CobaltColors.text.tertiary,
    marginTop: Spacing.xs,
  },
  productCard: {
    marginBottom: Spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  productHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  productCodeBadge: {
    backgroundColor: CobaltColors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  productCode: {
    ...Typography.body,
    fontWeight: '700',
    color: CobaltColors.primary,
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  statusBadgeActive: {
    backgroundColor: CobaltColors.success + '15',
  },
  statusBadgeInactive: {
    backgroundColor: CobaltColors.text.tertiary + '15',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
    fontSize: 11,
  },
  productActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: CobaltColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    ...Typography.h3,
    color: CobaltColors.text.primary,
    marginBottom: Spacing.xs,
  },
  productDescription: {
    ...Typography.caption,
    color: CobaltColors.text.secondary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: CobaltColors.border,
  },
  productDate: {
    ...Typography.small,
    color: CobaltColors.text.tertiary,
    fontSize: 11,
  },
  fabContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: CobaltColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
