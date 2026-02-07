import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { useAuth } from '@/context/AuthContext';

type SOP = Database['public']['Tables']['sops']['Row'];
type OperatorQualification = Database['public']['Tables']['operator_qualifications']['Row'] & {
  sop: SOP | null;
};

export default function TrainingIndexScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myQualifications, setMyQualifications] = useState<OperatorQualification[]>([]);
  const [expiringCount, setExpiringCount] = useState(0);

  useEffect(() => {
    fetchMyQualifications();
  }, []);

  const fetchMyQualifications = async () => {
    try {
      setLoading(true);

      // Mock current user ID - in production use real user ID
      const mockUserId = 'user-1';

      // Fetch operator qualifications with SOPs
      const { data: qualifications, error } = await supabase
        .from('operator_qualifications')
        .select(`
          *,
          sop:sops(*)
        `)
        .eq('operator_id', mockUserId)
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      setMyQualifications((qualifications as unknown as OperatorQualification[]) || []);

      // Count expiring qualifications (within 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiring = qualifications?.filter((q) => {
        if (!q.expiry_date) return false;
        const expiryDate = new Date(q.expiry_date);
        return expiryDate > now && expiryDate <= thirtyDaysFromNow;
      }) || [];
      setExpiringCount(expiring.length);
    } catch (error) {
      console.error('Error fetching qualifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyQualifications();
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'qualified':
        return Colors.success;
      case 'expired':
        return Colors.error;
      case 'pending_renewal':
        return Colors.warning;
      default:
        return Colors.text.tertiary;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'qualified':
        return 'Qualifié';
      case 'expired':
        return 'Expiré';
      case 'pending_renewal':
        return 'Renouvellement';
      case 'not_trained':
        return 'Non formé';
      default:
        return 'Inconnu';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
          title: 'Formation & Habilitations',
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
          headerRight: () => (
            user?.role === 'ADMIN' && (
              <TouchableOpacity
                onPress={() => router.push('/training/matrix')}
                style={styles.headerButton}
              >
                <Ionicons name="grid-outline" size={24} color={Colors.primary} />
              </TouchableOpacity>
            )
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Professional Badge */}
        <Card style={styles.badgeCard}>
          <View style={styles.badgeHeader}>
            <View style={styles.badgeAvatar}>
              <Text style={styles.badgeAvatarText}>
                {user?.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.badgeInfo}>
              <Text style={styles.badgeName}>{user?.name}</Text>
              <Text style={styles.badgeRole}>{user?.role}</Text>
              <View style={styles.badgeCertifications}>
                <Ionicons name="shield-checkmark" size={16} color="#D4AF37" />
                <Text style={styles.badgeCertText}>
                  {myQualifications.filter((q) => q.qualification_status === 'qualified').length} Habilitations actives
                </Text>
              </View>
            </View>
          </View>
          {expiringCount > 0 && (
            <View style={styles.expiringAlert}>
              <Ionicons name="warning" size={20} color={Colors.warning} />
              <Text style={styles.expiringAlertText}>
                {expiringCount} habilitation(s) expirent dans les 30 prochains jours
              </Text>
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions Rapides</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/training/sops')}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons name="document-text-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.actionTitle}>Catalogue SOPs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/training/quiz')}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.success + '15' }]}>
                <Ionicons name="school-outline" size={28} color={Colors.success} />
              </View>
              <Text style={styles.actionTitle}>Quiz Formation</Text>
            </TouchableOpacity>

            {user?.role === 'ADMIN' && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/training/matrix')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#D4AF37' + '15' }]}>
                  <Ionicons name="grid" size={28} color="#D4AF37" />
                </View>
                <Text style={styles.actionTitle}>Matrice Formation</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* My Qualifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes Habilitations</Text>
          {myQualifications.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="information-circle-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>Aucune habilitation enregistrée</Text>
            </Card>
          ) : (
            myQualifications.map((qualification) => {
              const daysUntilExpiry = getDaysUntilExpiry(qualification.expiry_date);
              const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
              const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

              return (
                <TouchableOpacity
                  key={qualification.id}
                  onPress={() => router.push(`/training/sop/${qualification.sop_id}`)}
                >
                  <Card style={isExpiringSoon ? StyleSheet.flatten([styles.qualificationCard, styles.qualificationCardWarning]) : styles.qualificationCard}>
                    <View style={styles.qualificationHeader}>
                      <View style={styles.qualificationLeft}>
                        <View
                          style={[
                            styles.qualificationIcon,
                            { backgroundColor: getStatusColor(qualification.qualification_status) + '15' },
                          ]}
                        >
                          <Ionicons
                            name="shield-checkmark"
                            size={20}
                            color={getStatusColor(qualification.qualification_status)}
                          />
                        </View>
                        <View style={styles.qualificationInfo}>
                          <Text style={styles.qualificationTitle}>{qualification.sop?.name}</Text>
                          <Text style={styles.qualificationCode}>{qualification.sop?.code}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(qualification.qualification_status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(qualification.qualification_status) },
                          ]}
                        >
                          {getStatusLabel(qualification.qualification_status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.qualificationDetails}>
                      <View style={styles.qualificationRow}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.text.secondary} />
                        <Text style={styles.qualificationDetailText}>
                          Formation: {formatDate(qualification.last_training_date)}
                        </Text>
                      </View>
                      <View style={styles.qualificationRow}>
                        <Ionicons
                          name={isExpired ? 'close-circle' : 'time-outline'}
                          size={14}
                          color={isExpired ? Colors.error : Colors.text.secondary}
                        />
                        <Text
                          style={[
                            styles.qualificationDetailText,
                            isExpired && { color: Colors.error, fontWeight: '600' },
                          ]}
                        >
                          Expire: {formatDate(qualification.expiry_date)}
                          {daysUntilExpiry !== null &&
                            daysUntilExpiry > 0 &&
                            ` (${daysUntilExpiry} jours)`}
                        </Text>
                      </View>
                    </View>

                    {isExpiringSoon && !isExpired && (
                      <View style={styles.renewalBanner}>
                        <Ionicons name="warning" size={16} color={Colors.warning} />
                        <Text style={styles.renewalBannerText}>
                          Renouvellement requis prochainement
                        </Text>
                      </View>
                    )}

                    {isExpired && (
                      <View style={styles.expiredBanner}>
                        <Ionicons name="alert-circle" size={16} color={Colors.error} />
                        <Text style={styles.expiredBannerText}>
                          Habilitation expirée - Formation requise
                        </Text>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  headerButton: {
    marginRight: Spacing.md,
  },
  badgeCard: {
    marginBottom: Spacing.xl,
    backgroundColor: '#1E3A8A',
    borderRadius: BorderRadius.lg,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  badgeAvatar: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 3,
    borderColor: '#D4AF37',
  },
  badgeAvatarText: {
    ...Typography.h2,
    color: Colors.primary,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    ...Typography.h3,
    color: Colors.surface,
    marginBottom: 4,
  },
  badgeRole: {
    ...Typography.body,
    color: '#93C5FD',
    marginBottom: Spacing.xs,
  },
  badgeCertifications: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badgeCertText: {
    ...Typography.caption,
    color: '#D4AF37',
    fontWeight: '600',
  },
  expiringAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surface + '20',
  },
  expiringAlertText: {
    ...Typography.caption,
    color: Colors.surface,
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionTitle: {
    ...Typography.caption,
    fontWeight: '600',
    textAlign: 'center',
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
  qualificationCard: {
    marginBottom: Spacing.sm,
  },
  qualificationCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  qualificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  qualificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  qualificationIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  qualificationInfo: {
    flex: 1,
  },
  qualificationTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  qualificationCode: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '700',
    fontSize: 11,
  },
  qualificationDetails: {
    gap: 4,
  },
  qualificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  qualificationDetailText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  renewalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '10',
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  renewalBannerText: {
    ...Typography.small,
    color: Colors.warning,
    fontWeight: '600',
    flex: 1,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  expiredBannerText: {
    ...Typography.small,
    color: Colors.error,
    fontWeight: '700',
    flex: 1,
  },
});
