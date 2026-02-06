import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, type AuthError } from '@/context/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { runDiagnostics, testAuthentication } from '@/utils/supabaseTest';
import { ConnectionStatus } from '@/components/ConnectionStatus';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError({
        type: 'credentials',
        message: 'Veuillez remplir tous les champs',
        canRetry: false,
      });
      return;
    }

    setLoading(true);
    setError(null);

    console.log('[Login] Starting login for:', email);

    try {
      await login(email.trim().toLowerCase(), password);
      console.log('[Login] Login successful, navigating to dashboard');
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      console.error('[Login] Login failed:', error);

      const authError = error as AuthError;
      setError(authError);

      // Show alert with appropriate actions
      const alertButtons: any[] = [{ text: 'OK', style: 'default' }];

      // Add retry button if the error can be retried
      if (authError.canRetry) {
        alertButtons.unshift({
          text: 'Réessayer',
          onPress: handleLogin,
        });
      }

      // Add diagnostics button for network errors
      if (authError.type === 'network') {
        alertButtons.unshift({
          text: '🔍 Diagnostics',
          onPress: () => router.push('/diagnostics'),
        });
      }

      Alert.alert(
        authError.type === 'network'
          ? '🔌 Problème de connexion'
          : authError.type === 'credentials'
          ? '🔐 Erreur d\'identification'
          : '❌ Erreur',
        authError.message,
        alertButtons
      );
    } finally {
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setEmail('omaghraoui@gmail.com');
    setPassword('pilote');
    setError(null);
  };

  const runConnectionDiagnostics = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Login] Running diagnostics...');
      const results = await runDiagnostics(email || undefined, password || undefined);

      let message = '🔍 Résultats du diagnostic:\n\n';

      // Environment check
      message += `✅ Variables d'env: ${results.environment.success ? 'OK' : '❌ ERREUR'}\n`;
      message += `${results.environment.message}\n\n`;

      // Connection check
      message += `${results.connection.success ? '✅' : '❌'} Connexion: ${results.connection.message}\n\n`;

      // Authentication check (if credentials provided)
      if (results.authentication) {
        message += `${results.authentication.success ? '✅' : '❌'} Auth: ${results.authentication.message}\n`;
        if (results.authentication.details) {
          message += `Détails: ${JSON.stringify(results.authentication.details, null, 2)}\n`;
        }
      }

      Alert.alert('Diagnostic Supabase', message, [{ text: 'OK' }]);
    } catch (error) {
      console.error('[Login] Diagnostic error:', error);
      Alert.alert('Erreur', 'Échec du diagnostic: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const testAdminLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Login] Testing admin login...');
      const result = await testAuthentication('omaghraoui@gmail.com', 'pilote');

      if (result.success) {
        Alert.alert(
          '✅ Test réussi',
          `Authentification admin réussie!\n\nEmail: ${result.details?.email}\nRôle: ${result.details?.role}`,
          [
            {
              text: 'Remplir les champs',
              onPress: fillAdminCredentials,
            },
            { text: 'OK' },
          ]
        );
      } else {
        Alert.alert('❌ Test échoué', `${result.message}\n\nDétails: ${JSON.stringify(result.details, null, 2)}`);
      }
    } catch (error) {
      console.error('[Login] Test error:', error);
      Alert.alert('Erreur', 'Échec du test: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>GMP</Text>
          </View>
          <Text style={styles.title}>Suivi de Lots GMP</Text>
          <Text style={styles.subtitle}>
            Système de gestion de la qualité pharmaceutique
          </Text>
        </View>

        <View style={styles.form}>
          {__DEV__ && <ConnectionStatus />}

          {error && (
            <View style={styles.errorContainer}>
              <View style={styles.errorHeader}>
                <Text style={styles.errorIcon}>
                  {error.type === 'network'
                    ? '🔌'
                    : error.type === 'credentials'
                    ? '🔐'
                    : '❌'}
                </Text>
                <Text style={styles.errorTitle}>
                  {error.type === 'network'
                    ? 'Problème de connexion'
                    : error.type === 'credentials'
                    ? 'Erreur d\'identification'
                    : 'Erreur'}
                </Text>
              </View>
              <Text style={styles.errorText}>{error.message}</Text>
              {error.type === 'network' && (
                <TouchableOpacity
                  style={styles.diagnosticsButton}
                  onPress={() => router.push('/diagnostics')}
                >
                  <Text style={styles.diagnosticsButtonText}>
                    🔍 Lancer le diagnostic réseau
                  </Text>
                </TouchableOpacity>
              )}
              {error.canRetry && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Input
            label="Email"
            placeholder="votre.email@pharma.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            secureTextEntry
            autoComplete="password"
          />

          <Button
            title="Se connecter"
            onPress={handleLogin}
            loading={loading}
            size="large"
            style={styles.loginButton}
          />

          {__DEV__ && (
            <>
              <TouchableOpacity
                onPress={fillAdminCredentials}
                style={styles.debugButton}
                disabled={loading}
              >
                <Text style={styles.debugButtonText}>
                  🔧 Remplir identifiants admin
                </Text>
              </TouchableOpacity>

              <View style={styles.debugRow}>
                <TouchableOpacity
                  onPress={testAdminLogin}
                  style={[styles.debugButton, styles.debugButtonSmall]}
                  disabled={loading}
                >
                  <Text style={styles.debugButtonText}>🧪 Tester admin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={runConnectionDiagnostics}
                  style={[styles.debugButton, styles.debugButtonSmall]}
                  disabled={loading}
                >
                  <Text style={styles.debugButtonText}>🔍 Diagnostic</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={styles.infoText}>
            🔒 Connexion sécurisée conforme aux normes GMP
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Besoin d&apos;aide ? Contactez l&apos;administrateur système
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.surface,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.text.secondary,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  errorContainer: {
    backgroundColor: Colors.error + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    marginBottom: Spacing.md,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  errorIcon: {
    fontSize: 24,
    marginRight: Spacing.xs,
  },
  errorTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.error,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  diagnosticsButton: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  diagnosticsButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  retryButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: Spacing.md,
  },
  debugButton: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  debugRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  debugButtonSmall: {
    flex: 1,
    marginTop: 0,
  },
  debugButtonText: {
    ...Typography.small,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  infoText: {
    ...Typography.small,
    textAlign: 'center',
    marginTop: Spacing.md,
    color: Colors.text.secondary,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...Typography.small,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});
