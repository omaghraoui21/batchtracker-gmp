import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

interface Batch {
  id: string;
  number: string;
  product: string;
  status: 'production' | 'supervisor' | 'qa' | 'completed';
  stage: string;
  priority?: 'high' | 'normal';
}

export default function BatchesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [batches] = useState<Batch[]>([
    {
      id: '1',
      number: '#12345',
      product: 'Produit A',
      status: 'production',
      stage: 'Production',
    },
    {
      id: '2',
      number: '#12346',
      product: 'Produit B',
      status: 'supervisor',
      stage: 'Superviseur',
      priority: 'high',
    },
    {
      id: '3',
      number: '#12347',
      product: 'Produit C',
      status: 'qa',
      stage: 'QA',
    },
    {
      id: '4',
      number: '#12348',
      product: 'Produit D',
      status: 'completed',
      stage: 'Terminé',
    },
    {
      id: '5',
      number: '#12349',
      product: 'Produit E',
      status: 'production',
      stage: 'Production',
      priority: 'high',
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'production':
        return Colors.primary;
      case 'supervisor':
        return Colors.warning;
      case 'qa':
        return '#9C27B0';
      case 'completed':
        return Colors.success;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'production':
        return 'En production';
      case 'supervisor':
        return 'En attente';
      case 'qa':
        return 'Contrôle QA';
      case 'completed':
        return 'Terminé';
      default:
        return status;
    }
  };

  const filteredBatches = batches.filter(
    (batch) =>
      batch.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un lot..."
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Statistiques rapides */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>15</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Prioritaires</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>48</Text>
            <Text style={styles.statLabel}>Ce mois</Text>
          </View>
        </View>

        {/* Liste des lots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Tous les Lots ({filteredBatches.length})
          </Text>

          {filteredBatches.map((batch) => (
            <TouchableOpacity key={batch.id} activeOpacity={0.7}>
              <Card style={styles.batchCard}>
                <View style={styles.batchHeader}>
                  <View style={styles.batchTitleContainer}>
                    <Text style={styles.batchNumber}>Lot {batch.number}</Text>
                    {batch.priority === 'high' && (
                      <View style={styles.priorityBadge}>
                        <Ionicons name="flag" size={12} color={Colors.error} />
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(batch.status) },
                    ]}
                  />
                </View>

                <Text style={styles.batchProduct}>{batch.product}</Text>

                <View style={styles.batchFooter}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(batch.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(batch.status) },
                      ]}
                    >
                      {getStatusLabel(batch.status)}
                    </Text>
                  </View>
                  <Text style={styles.stageText}>Étape: {batch.stage}</Text>
                </View>

                <TouchableOpacity style={styles.detailButton}>
                  <Text style={styles.detailButtonText}>Voir les détails</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bouton flottant d'ajout */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color={Colors.surface} />
      </TouchableOpacity>
    </View>
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  batchCard: {
    marginBottom: Spacing.md,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  batchTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  batchNumber: {
    ...Typography.body,
    fontWeight: '700',
  },
  priorityBadge: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  batchProduct: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  batchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
  },
  stageText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  detailButtonText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: 4,
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
});
