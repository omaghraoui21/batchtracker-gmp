/**
 * Audit Trail Component
 *
 * Displays a chronological list of all actions performed on an entity
 * with full GMP compliance traceability.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { getAuditLog } from '@/lib/auditLog';

interface AuditEntry {
  id: string;
  action: string;
  module: string;
  description: string;
  user_name: string;
  user_role: string;
  timestamp: string;
  old_value?: string | null;
  new_value?: string | null;
}

interface AuditTrailProps {
  entityType: string;
  entityId: string;
  limit?: number;
}

export function AuditTrail({ entityType, entityId, limit = 10 }: AuditTrailProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchAuditLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      const data = await getAuditLog(entityType, entityId, 50);
      setEntries(data);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string): keyof typeof Ionicons.glyphMap => {
    switch (action) {
      case 'CREATE':
        return 'add-circle';
      case 'UPDATE':
        return 'create';
      case 'DELETE':
        return 'trash';
      case 'APPROVE':
        return 'checkmark-circle';
      case 'REJECT':
        return 'close-circle';
      case 'SIGN':
        return 'document-text';
      case 'ASSIGN':
        return 'person-add';
      default:
        return 'information-circle';
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'CREATE':
        return Colors.status.validated;
      case 'UPDATE':
        return Colors.status.inProgress;
      case 'DELETE':
        return Colors.status.alert;
      case 'APPROVE':
      case 'SIGN':
        return Colors.success;
      case 'REJECT':
        return Colors.error;
      case 'ASSIGN':
        return Colors.primary;
      default:
        return Colors.text.secondary;
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayedEntries = showAll ? entries : entries.slice(0, limit);

  if (loading) {
    return (
      <Card style={styles.container}>
        <Text style={styles.title}>{"Journal d'Audit"}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card style={styles.container}>
        <Text style={styles.title}>{"Journal d'Audit"}</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={Colors.text.tertiary} />
          <Text style={styles.emptyText}>Aucune entrée dans le journal</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{"Journal d'Audit"}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{entries.length}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Historique complet des actions effectuées</Text>

      <View style={styles.timeline}>
        {displayedEntries.map((entry, index) => (
          <View key={entry.id} style={styles.timelineItem}>
            {/* Timeline indicator */}
            <View style={styles.timelineIndicator}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: getActionColor(entry.action) },
                ]}
              >
                <Ionicons
                  name={getActionIcon(entry.action)}
                  size={16}
                  color={Colors.surface}
                />
              </View>
              {index < displayedEntries.length - 1 && (
                <View style={styles.timelineLine} />
              )}
            </View>

            {/* Timeline content */}
            <View style={styles.timelineContent}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryDescription}>{entry.description}</Text>
                <Text style={styles.entryTimestamp}>
                  {formatTimestamp(entry.timestamp)}
                </Text>
              </View>
              <View style={styles.entryMeta}>
                <View style={styles.userBadge}>
                  <Ionicons name="person" size={12} color={Colors.primary} />
                  <Text style={styles.userName}>{entry.user_name}</Text>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{entry.user_role}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Show More Button */}
      {entries.length > limit && (
        <TouchableOpacity
          style={styles.showMoreButton}
          onPress={() => setShowAll(!showAll)}
        >
          <Text style={styles.showMoreText}>
            {showAll ? 'Afficher moins' : `Afficher ${entries.length - limit} entrées supplémentaires`}
          </Text>
          <Ionicons
            name={showAll ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.primary}
          />
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.h3,
    fontSize: 18,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  countBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  countText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  timeline: {
    marginTop: Spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.xs,
  },
  entryHeader: {
    marginBottom: Spacing.xs,
  },
  entryDescription: {
    ...Typography.body,
    marginBottom: 4,
  },
  entryTimestamp: {
    ...Typography.small,
    color: Colors.text.tertiary,
    fontSize: 11,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  userName: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 10,
  },
  roleBadge: {
    backgroundColor: Colors.text.tertiary + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    ...Typography.small,
    color: Colors.text.secondary,
    fontWeight: '600',
    fontSize: 10,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  showMoreText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
});
