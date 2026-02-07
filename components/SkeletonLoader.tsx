/**
 * Skeleton Loader Component
 *
 * Provides smooth loading placeholders for various content types
 * to improve perceived performance and user experience.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%' as const, height = 20, borderRadius = BorderRadius.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Batch Card Skeleton
 */
export function BatchCardSkeleton() {
  return (
    <View style={styles.batchCard}>
      <View style={styles.batchCardHeader}>
        <Skeleton width="60%" height={20} />
        <Skeleton width={12} height={12} borderRadius={BorderRadius.full} />
      </View>
      <Skeleton width="40%" height={14} style={{ marginBottom: Spacing.sm }} />
      <View style={styles.batchCardFooter}>
        <Skeleton width={80} height={24} borderRadius={BorderRadius.sm} />
        <Skeleton width="30%" height={12} />
      </View>
    </View>
  );
}

/**
 * User List Item Skeleton
 */
export function UserListItemSkeleton() {
  return (
    <View style={styles.userListItem}>
      <Skeleton width={48} height={48} borderRadius={BorderRadius.full} />
      <View style={styles.userListItemContent}>
        <Skeleton width="60%" height={16} style={{ marginBottom: 4 }} />
        <Skeleton width="40%" height={14} />
      </View>
      <Skeleton width={80} height={24} borderRadius={BorderRadius.sm} />
    </View>
  );
}

/**
 * Timeline Item Skeleton
 */
export function TimelineItemSkeleton() {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineIndicator}>
        <Skeleton width={32} height={32} borderRadius={BorderRadius.full} />
        <View style={styles.timelineLine} />
      </View>
      <View style={styles.timelineContent}>
        <Skeleton width="70%" height={18} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

/**
 * Stats Card Skeleton
 */
export function StatsCardSkeleton() {
  return (
    <View style={styles.statsCard}>
      <Skeleton width={40} height={32} style={{ marginBottom: Spacing.xs }} />
      <Skeleton width="60%" height={14} />
    </View>
  );
}

/**
 * Batch List Skeleton - renders multiple batch card skeletons
 */
export function BatchListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <BatchCardSkeleton key={index} />
      ))}
    </>
  );
}

/**
 * User List Skeleton - renders multiple user list item skeletons
 */
export function UserListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <UserListItemSkeleton key={index} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  batchCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  batchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  batchCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userListItemContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  statsCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});
