import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type SOP = Database['public']['Tables']['sops']['Row'];

export default function SOPsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [filteredSOPs, setFilteredSOPs] = useState<SOP[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchSOPs();
  }, []);

  useEffect(() => {
    filterSOPs();
  }, [searchQuery, selectedCategory, sops]);

  const fetchSOPs = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('sops')
        .select('*')
        .eq('status', 'active')
        .order('category', { ascending: true })
        .order('code', { ascending: true });

      if (error) throw error;

      setSOPs(data || []);
    } catch (error) {
      console.error('Error fetching SOPs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterSOPs = () => {
    let filtered = sops;

    if (selectedCategory) {
      filtered = filtered.filter((sop) => sop.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sop) =>
          sop.name.toLowerCase().includes(query) ||
          sop.code.toLowerCase().includes(query) ||
          (sop.description && sop.description.toLowerCase().includes(query))
      );
    }

    setFilteredSOPs(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSOPs();
  };

  const categories = Array.from(new Set(sops.map((sop) => sop.category).filter(Boolean)));

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'Production':
        return Colors.primary;
      case 'Qualité':
        return Colors.success;
      case 'Équipement':
        return Colors.warning;
      case 'Environnement':
        return '#00A86B';
      default:
        return Colors.text.tertiary;
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
          title: 'Catalogue SOPs',
          headerBackTitle: 'Retour',
        }}
      />
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un SOP..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}
            >
              Tous
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
                {
                  borderColor:
                    selectedCategory === category
                      ? getCategoryColor(category)
                      : Colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                  selectedCategory === category && { color: getCategoryColor(category) },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SOPs List */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {filteredSOPs.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>Aucun SOP trouvé</Text>
            </Card>
          ) : (
            filteredSOPs.map((sop) => (
              <TouchableOpacity
                key={sop.id}
                onPress={() => router.push(`/training/sop/${sop.id}`)}
              >
                <Card style={styles.sopCard}>
                  <View style={styles.sopHeader}>
                    <View style={styles.sopLeft}>
                      <View
                        style={[
                          styles.sopIcon,
                          { backgroundColor: getCategoryColor(sop.category) + '15' },
                        ]}
                      >
                        <Ionicons
                          name="document-text"
                          size={24}
                          color={getCategoryColor(sop.category)}
                        />
                      </View>
                      <View style={styles.sopInfo}>
                        <Text style={styles.sopCode}>{sop.code}</Text>
                        <Text style={styles.sopName}>{sop.name}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
                  </View>

                  {sop.description && (
                    <Text style={styles.sopDescription} numberOfLines={2}>
                      {sop.description}
                    </Text>
                  )}

                  <View style={styles.sopFooter}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor(sop.category) + '20' },
                      ]}
                    >
                      <Text
                        style={[styles.categoryBadgeText, { color: getCategoryColor(sop.category) }]}
                      >
                        {sop.category}
                      </Text>
                    </View>
                    <View style={styles.sopMeta}>
                      <Ionicons name="time-outline" size={14} color={Colors.text.secondary} />
                      <Text style={styles.sopMetaText}>
                        Validité: {sop.validity_months} mois
                      </Text>
                    </View>
                    <View style={styles.sopMeta}>
                      <Ionicons name="code-outline" size={14} color={Colors.text.secondary} />
                      <Text style={styles.sopMetaText}>v{sop.version}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    paddingVertical: Spacing.xs,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryChipActive: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
  },
  categoryChipText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  categoryChipTextActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  sopCard: {
    marginBottom: Spacing.sm,
  },
  sopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sopIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  sopInfo: {
    flex: 1,
  },
  sopCode: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  sopName: {
    ...Typography.body,
    fontWeight: '600',
  },
  sopDescription: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  sopFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  categoryBadgeText: {
    ...Typography.small,
    fontWeight: '700',
    fontSize: 11,
  },
  sopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sopMetaText: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
});
