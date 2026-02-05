import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
}

export default function AdminScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Gestion',
      items: [
        {
          id: 'users',
          icon: 'people-outline',
          title: 'Utilisateurs',
          subtitle: 'Gérer les comptes et les rôles',
          onPress: () => Alert.alert('Utilisateurs', 'Gestion des utilisateurs'),
        },
        {
          id: 'workflows',
          icon: 'git-branch-outline',
          title: 'Workflows',
          subtitle: 'Configurer les processus',
          onPress: () => Alert.alert('Workflows', 'Configuration des workflows'),
        },
        {
          id: 'products',
          icon: 'cube-outline',
          title: 'Produits',
          subtitle: 'Catalogue de produits',
          onPress: () => Alert.alert('Produits', 'Gestion du catalogue'),
        },
      ],
    },
    {
      title: 'Rapports',
      items: [
        {
          id: 'analytics',
          icon: 'stats-chart-outline',
          title: 'Analytiques',
          subtitle: 'Statistiques et KPIs',
          onPress: () => Alert.alert('Analytiques', 'Tableaux de bord analytiques'),
        },
        {
          id: 'deviations',
          icon: 'warning-outline',
          title: 'Déviations',
          subtitle: 'Historique des déviations',
          onPress: () => Alert.alert('Déviations', 'Rapport des déviations'),
        },
        {
          id: 'audit',
          icon: 'document-text-outline',
          title: 'Journal d\'Audit',
          subtitle: 'Traçabilité complète',
          onPress: () => Alert.alert('Audit', 'Journal d\'audit système'),
        },
      ],
    },
    {
      title: 'Paramètres',
      items: [
        {
          id: 'notifications',
          icon: 'notifications-outline',
          title: 'Notifications',
          subtitle: 'Préférences de notification',
          onPress: () => Alert.alert('Notifications', 'Paramètres de notification'),
        },
        {
          id: 'security',
          icon: 'shield-checkmark-outline',
          title: 'Sécurité',
          subtitle: 'Paramètres de sécurité',
          onPress: () => Alert.alert('Sécurité', 'Paramètres de sécurité'),
        },
        {
          id: 'backup',
          icon: 'cloud-download-outline',
          title: 'Sauvegarde',
          subtitle: 'Exporter les données',
          onPress: () => Alert.alert('Sauvegarde', 'Export et sauvegarde des données'),
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profil utilisateur */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
              <Text style={styles.roleText}>{user?.role}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>Modifier le profil</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </Card>

      {/* Sections de menu */}
      {menuSections.map((section, sectionIndex) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card style={styles.menuCard}>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  itemIndex < section.items.length - 1 && styles.menuItemBorder,
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: (item.color || Colors.primary) + '15' },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={item.color || Colors.primary}
                  />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      ))}

      {/* Informations système */}
      <Card variant="outlined" style={styles.systemCard}>
        <View style={styles.systemRow}>
          <Text style={styles.systemLabel}>Version</Text>
          <Text style={styles.systemValue}>1.0.0</Text>
        </View>
        <View style={styles.systemRow}>
          <Text style={styles.systemLabel}>Environnement</Text>
          <Text style={styles.systemValue}>Production</Text>
        </View>
        <View style={styles.systemRow}>
          <Text style={styles.systemLabel}>Conformité</Text>
          <Text style={[styles.systemValue, styles.gmpBadge]}>GMP Certifié ✓</Text>
        </View>
      </Card>

      {/* Bouton de déconnexion */}
      <Button
        title="Se Déconnecter"
        onPress={handleLogout}
        variant="outline"
        size="large"
        style={styles.logoutButton}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2024 Système de Suivi GMP{'\n'}
          Tous droits réservés
        </Text>
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
    paddingBottom: Spacing.xxl,
  },
  profileCard: {
    marginBottom: Spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    ...Typography.h2,
    color: Colors.surface,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...Typography.h3,
    marginBottom: 2,
  },
  profileEmail: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  roleText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  editProfileText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  systemCard: {
    marginBottom: Spacing.lg,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  systemLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  systemValue: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  gmpBadge: {
    color: Colors.success,
  },
  logoutButton: {
    marginBottom: Spacing.xl,
    borderColor: Colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    ...Typography.small,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
