import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

export interface TimelineStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  role?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  slaDeadline?: string | null;
  isOverdue?: boolean;
}

interface TimelineProps {
  steps: TimelineStep[];
}

export function Timeline({ steps }: TimelineProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Colors.success;
      case 'in_progress':
        return Colors.primary;
      case 'pending':
        return Colors.text.tertiary;
      case 'blocked':
        return Colors.error;
      default:
        return Colors.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'in_progress':
        return 'En cours';
      case 'pending':
        return 'En attente';
      case 'blocked':
        return 'Bloquée';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <View key={step.id}>
          <View style={styles.timelineItem}>
            {/* Step indicator */}
            <View style={styles.timelineIndicator}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: getStatusColor(step.status),
                    borderColor: getStatusColor(step.status),
                  },
                ]}
              >
                {step.status === 'completed' && (
                  <Ionicons name="checkmark" size={16} color={Colors.surface} />
                )}
                {step.status === 'in_progress' && (
                  <View style={styles.pulsingDot} />
                )}
              </View>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.timelineLine,
                    {
                      backgroundColor:
                        step.status === 'completed'
                          ? Colors.success
                          : Colors.border,
                    },
                  ]}
                />
              )}
            </View>

            {/* Step content */}
            <View style={styles.timelineContent}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepName}>{step.name}</Text>
                {step.isOverdue && (
                  <View style={styles.slaWarning}>
                    <Ionicons name="time-outline" size={14} color={Colors.error} />
                    <Text style={styles.slaWarningText}>Hors SLA</Text>
                  </View>
                )}
              </View>

              <View style={styles.stepDetails}>
                {step.role && (
                  <View style={styles.stepDetailRow}>
                    <Ionicons name="person-outline" size={14} color={Colors.text.secondary} />
                    <Text style={styles.stepDetailText}>{step.role}</Text>
                  </View>
                )}

                {step.startedAt && (
                  <View style={styles.stepDetailRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.text.secondary} />
                    <Text style={styles.stepDetailText}>
                      Démarrée: {formatDate(step.startedAt)}
                    </Text>
                  </View>
                )}

                {step.completedAt && (
                  <View style={styles.stepDetailRow}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
                    <Text style={styles.stepDetailText}>
                      Terminée: {formatDate(step.completedAt)}
                    </Text>
                  </View>
                )}

                {step.slaDeadline && (
                  <View style={styles.stepDetailRow}>
                    <Ionicons
                      name="alarm-outline"
                      size={14}
                      color={step.isOverdue ? Colors.error : Colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.stepDetailText,
                        step.isOverdue && { color: Colors.error },
                      ]}
                    >
                      SLA: {formatDate(step.slaDeadline)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.stepStatusBadge, { backgroundColor: getStatusColor(step.status) + '15' }]}>
                <Text style={[styles.stepStatusText, { color: getStatusColor(step.status) }]}>
                  {getStatusLabel(step.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    zIndex: 1,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    position: 'absolute',
    top: 32,
    bottom: -16,
    left: 15,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stepName: {
    ...Typography.body,
    fontWeight: '700',
  },
  slaWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.error + '15',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  slaWarningText: {
    ...Typography.small,
    color: Colors.error,
    fontWeight: '600',
    fontSize: 11,
  },
  stepDetails: {
    marginBottom: Spacing.sm,
    gap: 4,
  },
  stepDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stepDetailText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  stepStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  stepStatusText: {
    ...Typography.small,
    fontWeight: '600',
    fontSize: 11,
  },
});
