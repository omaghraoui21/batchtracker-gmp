/**
 * RBAC Guard Component
 *
 * Provides role-based access control for screens and actions.
 * Wraps components to enforce permission checks before rendering.
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import type { UserRole } from '@/types/auth';

interface RBACGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * RBAC Guard Component
 * Only renders children if user has one of the allowed roles
 */
export function RBACGuard({ children, allowedRoles, fallback, redirectTo }: RBACGuardProps) {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={80} color={Colors.error} />
        <Text style={styles.title}>Non authentifié</Text>
        <Text style={styles.message}>
          Vous devez être connecté pour accéder à cette section.
        </Text>
        <Button
          title="Se connecter"
          onPress={() => router.replace('/login')}
          style={styles.button}
        />
      </View>
    );
  }

  if (!allowedRoles.includes(user.role as UserRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <View style={styles.container}>
        <Ionicons name="shield-outline" size={80} color={Colors.error} />
        <Text style={styles.title}>Accès refusé</Text>
        <Text style={styles.message}>
          {"Vous n'avez pas les permissions nécessaires pour accéder à cette section."}
        </Text>
        <Text style={styles.info}>
          Rôle requis: {allowedRoles.join(' ou ')}
        </Text>
        <Text style={styles.info}>
          Votre rôle: {user.role}
        </Text>
        <Button
          title="Retour"
          onPress={() => router.back()}
          style={styles.button}
        />
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check if user has required role
 */
export function useHasRole(requiredRoles: UserRole[]): boolean {
  const { user } = useAuth();

  if (!user) return false;

  return requiredRoles.includes(user.role as UserRole);
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  return useHasRole(['ADMIN']);
}

/**
 * Hook to check if user is manager or above
 */
export function useIsManager(): boolean {
  return useHasRole(['ADMIN']);
}

/**
 * Component to conditionally render based on role
 */
interface RoleBasedProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

export function RoleBased({ children, allowedRoles, fallback }: RoleBasedProps) {
  const hasRole = useHasRole(allowedRoles);

  if (!hasRole) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.error,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  info: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  button: {
    marginTop: Spacing.xl,
    minWidth: 200,
  },
});
