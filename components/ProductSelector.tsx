import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductSelectorProps {
  selectedProductId: string | null;
  onSelectProduct: (product: Product) => void;
  error?: string | null;
  disabled?: boolean;
}

const CobaltColors = {
  primary: '#0047AB',
  primaryLight: '#2E6FD8',
  success: '#10B981',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
};

export function ProductSelector({
  selectedProductId,
  onSelectProduct,
  error,
  disabled = false,
}: ProductSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (modalVisible) {
      fetchProducts();
    }
  }, [modalVisible]);

  useEffect(() => {
    if (selectedProductId && products.length > 0) {
      const product = products.find((p) => p.id === selectedProductId);
      setSelectedProduct(product || null);
    }
  }, [selectedProductId, products]);

  useEffect(() => {
    filterProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true) // Only show active products
        .order('product_code', { ascending: true });

      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.product_code.toLowerCase().includes(query) ||
        p.product_name.toLowerCase().includes(query)
    );
    setFilteredProducts(filtered);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    onSelectProduct(product);
    setModalVisible(false);
    setSearchQuery('');
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => handleSelectProduct(item)}
      activeOpacity={0.7}
    >
      <View style={styles.productItemLeft}>
        <View style={styles.productCodeBadge}>
          <Text style={styles.productCodeText}>{item.product_code}</Text>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.product_name}</Text>
          {item.technical_description && (
            <Text style={styles.productDescription} numberOfLines={1}>
              {item.technical_description}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={CobaltColors.text.tertiary} />
    </TouchableOpacity>
  );

  return (
    <>
      {/* Selector Button */}
      <TouchableOpacity
        style={[
          styles.selectorButton,
          error && styles.selectorButtonError,
          disabled && styles.selectorButtonDisabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <View style={styles.selectorButtonContent}>
          {selectedProduct ? (
            <View style={styles.selectedProductContainer}>
              <View style={styles.selectedProductBadge}>
                <Text style={styles.selectedProductCode}>{selectedProduct.product_code}</Text>
              </View>
              <View style={styles.selectedProductInfo}>
                <Text style={styles.selectedProductName}>{selectedProduct.product_name}</Text>
                {selectedProduct.technical_description && (
                  <Text style={styles.selectedProductDescription} numberOfLines={1}>
                    {selectedProduct.technical_description}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.selectorPlaceholder}>Sélectionner un produit</Text>
          )}
        </View>
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? CobaltColors.text.tertiary : CobaltColors.primary}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Sélectionner un Produit</Text>
              <Text style={styles.modalSubtitle}>Catalogue des références actives</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={CobaltColors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={CobaltColors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par code ou nom..."
              placeholderTextColor={CobaltColors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={CobaltColors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Product List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={CobaltColors.primary} />
              <Text style={styles.loadingText}>Chargement des produits...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color={CobaltColors.text.tertiary} />
              <Text style={styles.emptyText}>Aucun produit trouvé</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Essayez une autre recherche'
                  : 'Aucun produit actif disponible'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CobaltColors.surface,
    borderWidth: 1,
    borderColor: CobaltColors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minHeight: 56,
  },
  selectorButtonError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  selectorButtonDisabled: {
    backgroundColor: CobaltColors.background,
    opacity: 0.5,
  },
  selectorButtonContent: {
    flex: 1,
  },
  selectorPlaceholder: {
    ...Typography.body,
    color: CobaltColors.text.tertiary,
  },
  selectedProductContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectedProductBadge: {
    backgroundColor: CobaltColors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  selectedProductCode: {
    ...Typography.body,
    fontWeight: '700',
    color: CobaltColors.primary,
    fontSize: 13,
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    ...Typography.body,
    fontWeight: '600',
    color: CobaltColors.text.primary,
  },
  selectedProductDescription: {
    ...Typography.small,
    color: CobaltColors.text.secondary,
    marginTop: 2,
  },
  errorText: {
    ...Typography.small,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: CobaltColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: CobaltColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: CobaltColors.border,
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    ...Typography.h2,
    color: CobaltColors.text.primary,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: CobaltColors.text.secondary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: CobaltColors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
    margin: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: CobaltColors.text.primary,
    marginLeft: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: CobaltColors.text.secondary,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
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
    textAlign: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CobaltColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: CobaltColors.border,
  },
  productItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  productCodeBadge: {
    backgroundColor: CobaltColors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
  },
  productCodeText: {
    ...Typography.body,
    fontWeight: '700',
    color: CobaltColors.primary,
    fontSize: 13,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...Typography.body,
    fontWeight: '600',
    color: CobaltColors.text.primary,
  },
  productDescription: {
    ...Typography.small,
    color: CobaltColors.text.secondary,
    marginTop: 2,
  },
});
