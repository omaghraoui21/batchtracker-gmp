import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête utilisateur */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>{user?.role}</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Cartes KPI */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Indicateurs Clés</Text>

        <Card style={styles.kpiCard}>
          <View style={styles.kpiIcon}>
            <Ionicons name="time-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.kpiContent}>
            <Text style={styles.kpiLabel}>Latence Moyenne (Vérif.)</Text>
            <Text style={styles.kpiValue}>2.5h</Text>
          </View>
        </Card>

        <Card style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning-outline" size={24} color={Colors.error} />
          </View>
          <View style={styles.kpiContent}>
            <Text style={styles.kpiLabel}>Déviations Critiques</Text>
            <Text style={styles.warningValue}>3 Ouvertes</Text>
          </View>
        </Card>

        <Card style={styles.kpiCard}>
          <View style={styles.kpiIcon}>
            <Ionicons name="layers-outline" size={24} color={Colors.success} />
          </View>
          <View style={styles.kpiContent}>
            <Text style={styles.kpiLabel}>Lots en Cours</Text>
            <Text style={styles.kpiValue}>15 Actifs</Text>
          </View>
        </Card>
      </View>

      {/* Lots récents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lots Récents</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.batchCard}>
          <View style={styles.batchHeader}>
            <Text style={styles.batchNumber}>Lot #12345 - Produit A</Text>
            <View style={[styles.statusBadge, styles.statusProduction]}>
              <Text style={styles.statusText}>En cours</Text>
            </View>
          </View>
          <Text style={styles.batchStage}>(Production)</Text>
        </Card>

        <Card style={styles.batchCard}>
          <View style={styles.batchHeader}>
            <Text style={styles.batchNumber}>Lot #12346 - Produit B</Text>
            <View style={[styles.statusBadge, styles.statusWaiting]}>
              <Text style={styles.statusText}>En attente</Text>
            </View>
          </View>
          <Text style={styles.batchStage}>(Superviseur)</Text>
        </Card>

        <Card style={styles.batchCard}>
          <View style={styles.batchHeader}>
            <Text style={styles.batchNumber}>Lot #12347 - Produit C</Text>
            <View style={[styles.statusBadge, styles.statusProduction]}>
              <Text style={styles.statusText}>En cours</Text>
            </View>
          </View>
          <Text style={styles.batchStage}>(QA)</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  userName: {
    ...Typography.h2,
    marginTop: Spacing.xs,
  },
  userRole: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  warningIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  kpiContent: {
    flex: 1,
  },
  kpiLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  kpiValue: {
    ...Typography.h3,
    fontSize: 22,
  },
  warningValue: {
    ...Typography.h3,
    fontSize: 22,
    color: Colors.error,
  },
  batchCard: {
    marginBottom: Spacing.sm,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  batchNumber: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusProduction: {
    backgroundColor: Colors.success + '20',
  },
  statusWaiting: {
    backgroundColor: Colors.warning + '20',
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  batchStage: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
});
