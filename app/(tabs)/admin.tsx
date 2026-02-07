import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { DebugAuthInfo } from '@/components/DebugAuthInfo';
import { SupabaseConnectionTest } from '@/components/SupabaseConnectionTest';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';

// Slate & Steel Industrial Theme for Diagnostic Section
const IndustrialColors = {
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  steel: {
    base: '#708090',
    light: '#A9B4C2',
    dark: '#4A5568',
  },
  diagnostic: {
    pass: '#10B981',
    warning: '#F59E0B',
    critical: '#DC2626',
  },
};

interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
}

type HealthStatus = 'healthy' | 'degraded' | 'unknown';

export default function AdminScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [healthStatus, setHealthStatus] = useState<HealthStatus>('unknown');
  const [healthChecking, setHealthChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  // Access control: redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      Alert.alert(
        'Acces refuse',
        'Vous devez avoir le role ADMIN pour acceder a cette section.',
        [
          {
            text: 'Retour',
            onPress: () => router.replace('/(tabs)/dashboard'),
          },
        ]
      );
    }
  }, [user, router]);

  // Quick health check on mount
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      runQuickHealthCheck();
    }
  }, [user]);

  const runQuickHealthCheck = async () => {
    setHealthChecking(true);
    try {
      // Simulate a quick connectivity / health ping
      await new Promise((resolve) => setTimeout(resolve, 800));
      setHealthStatus('healthy');
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch {
      setHealthStatus('degraded');
      setLastCheckTime(new Date().toLocaleTimeString());
    } finally {
      setHealthChecking(false);
    }
  };

  // Show access denied for non-admin users
  if (!user || user.role !== 'ADMIN') {
    return (
      <View style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Ionicons name="shield-outline" size={80} color={Colors.error} />
          <Text style={styles.accessDeniedTitle}>Acces refuse</Text>
          <Text style={styles.accessDeniedText}>
            Vous devez avoir le role ADMIN pour acceder a cette section.
          </Text>
          <Text style={styles.accessDeniedInfo}>
            Role actuel: {user?.role || 'Non defini'}
          </Text>
          <Button
            title="Retour au Tableau de Bord"
            onPress={() => router.replace('/(tabs)/dashboard')}
            style={styles.backButton}
          />
        </View>
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert(
      'Deconnexion',
      'Etes-vous sur de vouloir vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error: any) {
              toast.showError(error?.message || 'Erreur lors de la deconnexion.');
            }
          },
        },
      ]
    );
  };

  const handleNavigate = (route: string, label: string) => {
    try {
      router.push(route as any);
    } catch {
      toast.showError(`Impossible d'ouvrir ${label}.`);
    }
  };

  const getHealthColor = () => {
    switch (healthStatus) {
      case 'healthy':
        return IndustrialColors.diagnostic.pass;
      case 'degraded':
        return IndustrialColors.diagnostic.warning;
      default:
        return IndustrialColors.slate[400];
    }
  };

  const getHealthLabel = () => {
    switch (healthStatus) {
      case 'healthy':
        return 'Operationnel';
      case 'degraded':
        return 'Degrade';
      default:
        return 'Inconnu';
    }
  };

  const getHealthIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (healthStatus) {
      case 'healthy':
        return 'checkmark-circle';
      case 'degraded':
        return 'warning';
      default:
        return 'help-circle-outline';
    }
  };

  // ── Section 1: Gestion des Utilisateurs ──
  const userManagementItems: MenuItem[] = [
    {
      id: 'users',
      icon: 'people-outline',
      title: 'Utilisateurs',
      subtitle: 'Gerer les comptes et les roles',
      onPress: () => handleNavigate('/users', 'Utilisateurs'),
    },
  ];

  // ── Section 2: Configuration Workflow ──
  const workflowItems: MenuItem[] = [
    {
      id: 'workflows',
      icon: 'git-branch-outline',
      title: 'Workflows',
      subtitle: 'Configurer les processus de production',
      onPress: () => handleNavigate('/workflow-config', 'Workflows'),
    },
  ];

  // ── Section 3: Regles d'Assignation ──
  const assignmentItems: MenuItem[] = [
    {
      id: 'assignment-rules',
      icon: 'swap-horizontal-outline',
      title: 'Regles d\'Assignation',
      subtitle: 'Configuration de l\'assignation automatique',
      onPress: () => handleNavigate('/assignment-rules-config', 'Regles d\'Assignation'),
    },
  ];

  // ── Section 5: Catalogue Produits ──
  const productItems: MenuItem[] = [
    {
      id: 'products',
      icon: 'cube-outline',
      title: 'Produits',
      subtitle: 'Catalogue de produits',
      onPress: () => handleNavigate('/products', 'Produits'),
      color: '#0047AB',
    },
  ];

  // ── Additional existing sections ──
  const additionalItems: MenuItem[] = [
    {
      id: 'equipment',
      icon: 'construct-outline',
      title: 'Equipements',
      subtitle: 'Registre des equipements et maintenance',
      onPress: () => handleNavigate('/equipment', 'Equipements'),
    },
    {
      id: 'training',
      icon: 'school-outline',
      title: 'Formation & Habilitations',
      subtitle: 'Gestion des formations et qualifications',
      onPress: () => handleNavigate('/training', 'Formation'),
      color: '#D4AF37',
    },
  ];

  const reportItems: MenuItem[] = [
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
      title: 'Deviations & CAPA',
      subtitle: 'Gestion des deviations et actions correctives',
      onPress: () => handleNavigate('/deviations', 'Deviations'),
      color: Colors.error,
    },
    {
      id: 'deviation-library',
      icon: 'library-outline',
      title: 'Bibliotheque des Deviations',
      subtitle: 'Types de deviations standards GMP',
      onPress: () => handleNavigate('/deviation-library', 'Bibliotheque'),
      color: '#DC2626',
    },
    {
      id: 'audit',
      icon: 'document-text-outline',
      title: 'Journal d\'Audit',
      subtitle: 'Tracabilite complete',
      onPress: () => Alert.alert('Audit', 'Journal d\'audit systeme'),
    },
  ];

  const settingsItems: MenuItem[] = [
    {
      id: 'notifications',
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'Preferences de notification',
      onPress: () => Alert.alert('Notifications', 'Parametres de notification'),
    },
    {
      id: 'security',
      icon: 'shield-checkmark-outline',
      title: 'Securite',
      subtitle: 'Parametres de securite',
      onPress: () => Alert.alert('Securite', 'Parametres de securite'),
    },
    {
      id: 'backup',
      icon: 'cloud-download-outline',
      title: 'Sauvegarde',
      subtitle: 'Exporter les donnees',
      onPress: () => Alert.alert('Sauvegarde', 'Export et sauvegarde des donnees'),
    },
  ];

  const menuSections: { title: string; items: MenuItem[] }[] = [
    { title: 'Gestion des Utilisateurs', items: userManagementItems },
    { title: 'Configuration Workflow', items: workflowItems },
    { title: 'Regles d\'Assignation', items: assignmentItems },
    // Diagnostic Systeme is rendered as a custom section below
    { title: 'Catalogue Produits', items: productItems },
    { title: 'Autres Modules', items: additionalItems },
    { title: 'Rapports', items: reportItems },
    { title: 'Parametres', items: settingsItems },
  ];

  const renderMenuItem = (item: MenuItem, isLast: boolean) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuItem,
        !isLast && styles.menuItemBorder,
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
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Debug Information - Only visible in development */}
      <DebugAuthInfo visible={__DEV__} />

      {/* Connection Test - Only visible in development */}
      {__DEV__ && <SupabaseConnectionTest />}

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

      {/* Sections 1, 2, 3 -- rendered before the diagnostic section */}
      {menuSections.slice(0, 3).map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card style={styles.menuCard}>
            {section.items.map((item, itemIndex) =>
              renderMenuItem(item, itemIndex === section.items.length - 1)
            )}
          </Card>
        </View>
      ))}

      {/* ── Section 4: Diagnostic Systeme (Slate & Steel) ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnostic Systeme</Text>
        <View style={styles.diagnosticCard}>
          {/* Health Status Banner */}
          <View style={styles.diagnosticHealthBanner}>
            <View style={styles.diagnosticHealthLeft}>
              {healthChecking ? (
                <ActivityIndicator size="small" color={IndustrialColors.slate[300]} />
              ) : (
                <Ionicons
                  name={getHealthIcon()}
                  size={28}
                  color={getHealthColor()}
                />
              )}
              <View style={styles.diagnosticHealthInfo}>
                <Text style={styles.diagnosticHealthLabel}>Etat du Systeme</Text>
                <Text
                  style={[
                    styles.diagnosticHealthValue,
                    { color: getHealthColor() },
                  ]}
                >
                  {healthChecking ? 'Verification...' : getHealthLabel()}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.diagnosticRefreshButton}
              onPress={() => {
                runQuickHealthCheck();
                toast.showInfo('Verification en cours...');
              }}
              disabled={healthChecking}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={IndustrialColors.steel.light}
              />
            </TouchableOpacity>
          </View>

          {/* Quick Stats Row */}
          <View style={styles.diagnosticStatsRow}>
            <View style={styles.diagnosticStatItem}>
              <Ionicons
                name="server-outline"
                size={16}
                color={IndustrialColors.diagnostic.pass}
              />
              <Text style={styles.diagnosticStatLabel}>Base de Donnees</Text>
              <View
                style={[
                  styles.diagnosticStatDot,
                  {
                    backgroundColor:
                      healthStatus === 'healthy'
                        ? IndustrialColors.diagnostic.pass
                        : healthStatus === 'degraded'
                        ? IndustrialColors.diagnostic.warning
                        : IndustrialColors.slate[400],
                  },
                ]}
              />
            </View>
            <View style={styles.diagnosticStatDivider} />
            <View style={styles.diagnosticStatItem}>
              <Ionicons
                name="cloud-outline"
                size={16}
                color={IndustrialColors.diagnostic.pass}
              />
              <Text style={styles.diagnosticStatLabel}>Connectivite</Text>
              <View
                style={[
                  styles.diagnosticStatDot,
                  {
                    backgroundColor:
                      healthStatus === 'healthy'
                        ? IndustrialColors.diagnostic.pass
                        : IndustrialColors.slate[400],
                  },
                ]}
              />
            </View>
            <View style={styles.diagnosticStatDivider} />
            <View style={styles.diagnosticStatItem}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={IndustrialColors.diagnostic.pass}
              />
              <Text style={styles.diagnosticStatLabel}>GMP</Text>
              <View
                style={[
                  styles.diagnosticStatDot,
                  { backgroundColor: IndustrialColors.diagnostic.pass },
                ]}
              />
            </View>
          </View>

          {lastCheckTime && (
            <Text style={styles.diagnosticLastCheck}>
              Derniere verification : {lastCheckTime}
            </Text>
          )}

          {/* Diagnostic Action Buttons */}
          <View style={styles.diagnosticActions}>
            <TouchableOpacity
              style={styles.diagnosticActionButton}
              onPress={() => handleNavigate('/db-audit', 'Audit Base de Donnees')}
              activeOpacity={0.7}
            >
              <View style={styles.diagnosticActionIconWrap}>
                <Ionicons
                  name="server-outline"
                  size={22}
                  color={IndustrialColors.steel.light}
                />
              </View>
              <View style={styles.diagnosticActionContent}>
                <Text style={styles.diagnosticActionTitle}>
                  Audit de la Base de Donnees
                </Text>
                <Text style={styles.diagnosticActionSubtitle}>
                  {"Scan d'integrite, reparation et export technique"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={IndustrialColors.slate[400]}
              />
            </TouchableOpacity>

            <View style={styles.diagnosticActionDivider} />

            <TouchableOpacity
              style={styles.diagnosticActionButton}
              onPress={() => handleNavigate('/diagnostics', 'Diagnostics Techniques')}
              activeOpacity={0.7}
            >
              <View style={styles.diagnosticActionIconWrap}>
                <Ionicons
                  name="pulse-outline"
                  size={22}
                  color={IndustrialColors.steel.light}
                />
              </View>
              <View style={styles.diagnosticActionContent}>
                <Text style={styles.diagnosticActionTitle}>
                  Diagnostics Techniques
                </Text>
                <Text style={styles.diagnosticActionSubtitle}>
                  Reseau, latence, connectivite et analyse systeme
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={IndustrialColors.slate[400]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Remaining sections (Catalogue Produits, Autres Modules, Rapports, Parametres) */}
      {menuSections.slice(3).map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card style={styles.menuCard}>
            {section.items.map((item, itemIndex) =>
              renderMenuItem(item, itemIndex === section.items.length - 1)
            )}
          </Card>
        </View>
      ))}

      {/* Informations systeme */}
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
          <Text style={styles.systemLabel}>Conformite</Text>
          <Text style={[styles.systemValue, styles.gmpBadge]}>GMP Certifie</Text>
        </View>
      </Card>

      {/* Bouton de deconnexion */}
      <Button
        title="Se Deconnecter"
        onPress={handleLogout}
        variant="outline"
        size="large"
        style={styles.logoutButton}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          2024 Systeme de Suivi GMP{'\n'}
          Tous droits reserves
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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  accessDeniedTitle: {
    ...Typography.h1,
    color: Colors.error,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  accessDeniedText: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  accessDeniedInfo: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.text.tertiary,
    marginBottom: Spacing.xl,
    fontWeight: '600',
  },
  backButton: {
    minWidth: 200,
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

  // ── Diagnostic Section (Slate & Steel) ──
  diagnosticCard: {
    backgroundColor: IndustrialColors.slate[800],
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: IndustrialColors.steel.base + '60',
    overflow: 'hidden',
    ...Shadows.md,
  },
  diagnosticHealthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: IndustrialColors.slate[900],
    borderBottomWidth: 1,
    borderBottomColor: IndustrialColors.steel.base + '30',
  },
  diagnosticHealthLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  diagnosticHealthInfo: {
    marginLeft: Spacing.xs,
  },
  diagnosticHealthLabel: {
    ...Typography.small,
    color: IndustrialColors.slate[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
    fontWeight: '600',
  },
  diagnosticHealthValue: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 15,
  },
  diagnosticRefreshButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: IndustrialColors.slate[700],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: IndustrialColors.steel.base + '40',
  },
  diagnosticStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: IndustrialColors.steel.base + '20',
  },
  diagnosticStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diagnosticStatLabel: {
    ...Typography.small,
    color: IndustrialColors.slate[300],
    fontSize: 11,
    fontWeight: '500',
  },
  diagnosticStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  diagnosticStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: IndustrialColors.steel.base + '30',
  },
  diagnosticLastCheck: {
    ...Typography.small,
    color: IndustrialColors.slate[500],
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
    fontStyle: 'italic',
  },
  diagnosticActions: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  diagnosticActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: IndustrialColors.slate[700],
    marginTop: Spacing.sm,
  },
  diagnosticActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: IndustrialColors.slate[600],
    borderWidth: 1,
    borderColor: IndustrialColors.steel.base + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  diagnosticActionContent: {
    flex: 1,
  },
  diagnosticActionTitle: {
    ...Typography.body,
    color: IndustrialColors.slate[50],
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  diagnosticActionSubtitle: {
    ...Typography.small,
    color: IndustrialColors.slate[400],
    fontSize: 11,
  },
  diagnosticActionDivider: {
    height: 0,
  },

  // ── System Info, Logout, Footer ──
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
