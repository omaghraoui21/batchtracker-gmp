import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

/**
 * Component to test Supabase connection and permissions
 * Useful for debugging connectivity issues on Expo Go
 */
export function SupabaseConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    connection: 'success' | 'error' | 'pending';
    profiles: 'success' | 'error' | 'pending';
    rolePermissions: 'success' | 'error' | 'pending';
    message?: string;
  }>({
    connection: 'pending',
    profiles: 'pending',
    rolePermissions: 'pending',
  });

  const runTests = async () => {
    setTesting(true);
    const newResults: {
      connection: 'success' | 'error' | 'pending';
      profiles: 'success' | 'error' | 'pending';
      rolePermissions: 'success' | 'error' | 'pending';
      message: string;
    } = {
      connection: 'pending',
      profiles: 'pending',
      rolePermissions: 'pending',
      message: '',
    };

    try {
      // Test 1: Check Supabase connection
      console.log('[ConnectionTest] Testing Supabase connection...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        newResults.connection = 'error';
        newResults.message = `Connection error: ${sessionError.message}`;
      } else if (sessionData?.session) {
        newResults.connection = 'success';
        console.log('[ConnectionTest] ✓ Supabase connection successful');

        // Test 2: Query profiles table
        try {
          console.log('[ConnectionTest] Testing profiles table access...');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, name, role')
            .eq('id', sessionData.session.user.id)
            .single();

          if (profileError) {
            newResults.profiles = 'error';
            newResults.message = `Profile error: ${profileError.message}`;
            console.error('[ConnectionTest] ✗ Profile query failed:', profileError);
          } else if (profile) {
            newResults.profiles = 'success';
            console.log('[ConnectionTest] ✓ Profile loaded:', profile.email, 'Role:', profile.role);

            // Test 3: Query role_permissions table
            try {
              console.log('[ConnectionTest] Testing role_permissions table access...');
              const { data: permissions, error: permError } = await supabase
                .from('role_permissions')
                .select('*')
                .eq('role', profile.role)
                .limit(1);

              if (permError) {
                newResults.rolePermissions = 'error';
                newResults.message = `Permissions error: ${permError.message}`;
                console.error('[ConnectionTest] ✗ Permissions query failed:', permError);
              } else {
                newResults.rolePermissions = 'success';
                newResults.message = `All tests passed! User: ${profile.email}, Role: ${profile.role}`;
                console.log('[ConnectionTest] ✓ All tests passed');
              }
            } catch (e) {
              newResults.rolePermissions = 'error';
              newResults.message = `Permissions test failed: ${e}`;
            }
          }
        } catch (e) {
          newResults.profiles = 'error';
          newResults.message = `Profile test failed: ${e}`;
        }
      } else {
        newResults.connection = 'error';
        newResults.message = 'No active session';
      }
    } catch (error) {
      newResults.connection = 'error';
      newResults.message = `Fatal error: ${error}`;
      console.error('[ConnectionTest] Fatal error:', error);
    }

    setResults(newResults);
    setTesting(false);
  };

  const getStatusIcon = (status: 'success' | 'error' | 'pending') => {
    switch (status) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={24} color={Colors.success} />;
      case 'error':
        return <Ionicons name="close-circle" size={24} color={Colors.error} />;
      case 'pending':
        return <Ionicons name="ellipse-outline" size={24} color={Colors.text.tertiary} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔌 Test de Connexion Supabase</Text>
      </View>

      <View style={styles.tests}>
        <View style={styles.testRow}>
          {getStatusIcon(results.connection)}
          <Text style={styles.testLabel}>Connexion Supabase</Text>
        </View>

        <View style={styles.testRow}>
          {getStatusIcon(results.profiles)}
          <Text style={styles.testLabel}>Accès Table Profiles</Text>
        </View>

        <View style={styles.testRow}>
          {getStatusIcon(results.rolePermissions)}
          <Text style={styles.testLabel}>Accès Permissions</Text>
        </View>
      </View>

      {results.message && (
        <View style={styles.message}>
          <Text style={styles.messageText}>{results.message}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={runTests}
        disabled={testing}
        activeOpacity={0.7}
      >
        {testing ? (
          <ActivityIndicator color={Colors.surface} />
        ) : (
          <>
            <Ionicons name="play" size={20} color={Colors.surface} />
            <Text style={styles.buttonText}>Exécuter les Tests</Text>
          </>
        )}
      </TouchableOpacity>
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
    padding: Spacing.md,
    backgroundColor: Colors.primary + '15',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.primary,
  },
  tests: {
    padding: Spacing.md,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  testLabel: {
    ...Typography.body,
    marginLeft: Spacing.sm,
    color: Colors.text.primary,
  },
  message: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  messageText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    margin: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.surface,
  },
});
