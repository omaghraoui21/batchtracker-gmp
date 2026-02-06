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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useAuth, type AuthError } from '@/context/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { runDiagnostics, testAuthentication } from '@/utils/supabaseTest';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { debugLogger } from '@/lib/debugLogger';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [showRawError, setShowRawError] = useState(false);
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
    setShowRawError(false);

    debugLogger.info('LoginScreen', 'Starting login', { email });

    try {
      await login(email.trim().toLowerCase(), password);
      debugLogger.info('LoginScreen', 'Login successful, navigating to dashboard');
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      debugLogger.error('LoginScreen', 'Login failed', {
        type: err.type,
        message: err.message,
        rawErrorJson: err.rawErrorJson,
      });

      const authError = err as AuthError;
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

      // Add diagnostics button for all errors
      alertButtons.unshift({
        text: '🔬 Diagnostic Avancé',
        onPress: () => router.push('/diagnostics'),
      });

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

  const copyRawError = async () => {
    if (!error?.rawErrorJson) return;
    try {
      const lastAttempt = debugLogger.getLastLoginAttempt();
      let copyText = `=== Erreur Login GMP ===\n`;
      copyText += `Date: ${new Date().toISOString()}\n`;
      copyText += `Type: ${error.type}\n`;
      copyText += `Message: ${error.message}\n\n`;
      copyText += `=== Erreur Brute ===\n${error.rawErrorJson}\n`;

      if (lastAttempt) {
        copyText += `\n=== Dernière Tentative ===\n`;
        copyText += JSON.stringify(lastAttempt, null, 2);
      }

      await Clipboard.setStringAsync(copyText);
      Alert.alert('✅ Copié', 'L\'erreur a été copiée dans le presse-papiers.');
    } catch {
      Alert.alert('Erreur', 'Impossible de copier dans le presse-papiers.');
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
      debugLogger.info('LoginScreen', 'Running diagnostics');
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

      Alert.alert('Diagnostic Supabase', message, [
        { text: '🔬 Diagnostic Avancé', onPress: () => router.push('/diagnostics') },
        { text: 'OK' },
      ]);
    } catch (err) {
      debugLogger.error('LoginScreen', 'Diagnostic error', err);
      Alert.alert('Erreur', 'Échec du diagnostic: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const testAdminLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      debugLogger.info('LoginScreen', 'Testing admin login');
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
    } catch (err) {
      debugLogger.error('LoginScreen', 'Test error', err);
      Alert.alert('Erreur', 'Échec du test: ' + (err as Error).message);
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

              {/* Raw Error Section */}
              {error.rawErrorJson && (
                <TouchableOpacity
                  onPress={() => setShowRawError(!showRawError)}
                  style={styles.rawErrorToggle}
                >
                  <Text style={styles.rawErrorToggleText}>
                    {showRawError ? '▼ Masquer détails techniques' : '▶ Voir détails techniques'}
                  </Text>
                </TouchableOpacity>
              )}

              {showRawError && error.rawErrorJson && (
                <View style={styles.rawErrorBox}>
                  <Text style={styles.rawErrorText} selectable>
                    {error.rawErrorJson}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyRawButton}
                    onPress={copyRawError}
                  >
                    <Text style={styles.copyRawButtonText}>📋 Copier l&apos;erreur</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.errorActions}>
                <TouchableOpacity
                  style={styles.diagnosticsButton}
                  onPress={() => router.push('/diagnostics')}
                >
                  <Text style={styles.diagnosticsButtonText}>
                    🔬 Diagnostic Avancé
                  </Text>
                </TouchableOpacity>
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
          <TouchableOpacity
            onPress={() => router.push('/diagnostics')}
            style={styles.footerDiagLink}
          >
            <Text style={styles.footerDiagLinkText}>
              Problèmes de connexion ? → Diagnostic réseau
            </Text>
          </TouchableOpacity>
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
    backgroundColor: Colors.error + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error + '40',
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
    ...Typography.caption,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },

  // Raw error display
  rawErrorToggle: {
    paddingVertical: Spacing.xs,
  },
  rawErrorToggleText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },
  rawErrorBox: {
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rawErrorText: {
    ...Typography.small,
    fontFamily: 'monospace',
    color: Colors.text.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  copyRawButton: {
    marginTop: Spacing.sm,
    padding: Spacing.xs,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  copyRawButtonText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Error action buttons
  errorActions: {
    gap: Spacing.xs,
  },
  diagnosticsButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  diagnosticsButtonText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '600',
  },
  retryButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  retryButtonText: {
    ...Typography.caption,
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
  footerDiagLink: {
    marginTop: Spacing.sm,
    padding: Spacing.xs,
  },
  footerDiagLinkText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
