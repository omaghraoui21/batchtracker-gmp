/**
 * Phase 13: Navigation Optimization - Unified Navigation Header Component
 * Provides consistent, high-visibility back buttons for all deep screens
 * with wide touch targets for production environments (glove-friendly)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@/constants/theme';

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  backLabel?: string;
  backRoute?: string; // If specified, navigate to this route instead of router.back()
  breadcrumbs?: string[]; // e.g., ['Admin', 'Produits', 'Modifier']
  onBack?: () => void; // Custom back handler
  rightAction?: React.ReactNode;
  style?: any;
}

export function NavigationHeader({
  title,
  subtitle,
  backLabel = 'Retour',
  backRoute,
  breadcrumbs,
  onBack,
  rightAction,
  style,
}: NavigationHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backRoute) {
      router.push(backRoute);
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      <View style={styles.content}>
        {/* Back Button - Wide touch target for gloved hands */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.backButtonContent}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
            <Text style={styles.backButtonText}>{backLabel}</Text>
          </View>
        </TouchableOpacity>

        {/* Title and Breadcrumbs */}
        <View style={styles.titleContainer}>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <View style={styles.breadcrumbsContainer}>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <Text style={styles.breadcrumbText}>{crumb}</Text>
                  {index < breadcrumbs.length - 1 && (
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color={Colors.text.tertiary}
                      style={styles.breadcrumbSeparator}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Action */}
        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 60,
  },
  backButton: {
    // Wide touch target - minimum 48x48 for accessibility and gloved hands
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  breadcrumbsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  breadcrumbText: {
    ...Typography.small,
    color: Colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  breadcrumbSeparator: {
    marginHorizontal: 4,
  },
  title: {
    ...Typography.h3,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  rightAction: {
    marginLeft: Spacing.sm,
  },
});
