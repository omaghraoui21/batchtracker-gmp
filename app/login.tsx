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
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { runDiagnostics, testAuthentication } from '@/utils/supabaseTest';
import { ConnectionStatus } from '@/components/ConnectionStatus';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError(null);

    console.log('[Login] Starting login for:', email);

    try {
      await login(email.trim().toLowerCase(), password);
      console.log('[Login] Login successful, navigating to dashboard');
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error('[Login] Login failed:', errorMessage);
      setError(errorMessage);
      Alert.alert('Erreur de connexion', errorMessage, [
        { text: 'OK', style: 'default' },
      ]);
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
              <Text style={styles.errorText}>❌ {error}</Text>
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
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
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
