import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

interface DebugAuthInfoProps {
  visible?: boolean;
}

/**
 * Debug component to display authentication state
 * Useful for troubleshooting on Expo Go
 */
export function DebugAuthInfo({ visible = __DEV__ }: DebugAuthInfoProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [expanded, setExpanded] = React.useState(false);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerText}>🔍 Debug Auth Info</Text>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.label}>État:</Text>
            <Text style={[styles.value, isAuthenticated ? styles.success : styles.error]}>
              {isAuthenticated ? 'Authentifié ✓' : 'Non authentifié ✗'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Chargement:</Text>
            <Text style={styles.value}>{isLoading ? 'Oui' : 'Non'}</Text>
          </View>

          {user ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{user.email}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Nom:</Text>
                <Text style={styles.value}>{user.name}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Rôle:</Text>
                <Text style={[styles.value, styles.roleValue]}>
                  {user.role}
                  {user.role === 'ADMIN' ? ' 👑' : ''}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>ID:</Text>
                <Text style={[styles.value, styles.small]}>{user.id}</Text>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Text style={styles.value}>Aucun utilisateur connecté</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Environnement:</Text>
            <Text style={styles.value}>Expo Go</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Mode:</Text>
            <Text style={styles.value}>{__DEV__ ? 'Development' : 'Production'}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.primary + '15',
  },
  headerText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.primary,
  },
  expandIcon: {
    ...Typography.body,
    color: Colors.primary,
  },
  content: {
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.secondary,
    flex: 1,
  },
  value: {
    ...Typography.caption,
    color: Colors.text.primary,
    flex: 2,
    textAlign: 'right',
  },
  small: {
    fontSize: 10,
  },
  roleValue: {
    fontWeight: '700',
    fontSize: 14,
  },
  success: {
    color: Colors.success,
  },
  error: {
    color: Colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
});
