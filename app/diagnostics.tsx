import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import {
  runComprehensiveDiagnostics,
  analyzeDiagnostics,
  type NetworkDiagnostics,
  type DiagnosticResult,
} from '@/utils/networkDiagnostics';

export default function DiagnosticsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnostics | null>(null);
  const [analysis, setAnalysis] = useState<{
    status: 'healthy' | 'degraded' | 'failed';
    summary: string;
    recommendations: string[];
  } | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await runComprehensiveDiagnostics();
      setDiagnostics(results);

      const analysisResults = analyzeDiagnostics(results);
      setAnalysis(analysisResults);
    } catch (error) {
      console.error('[Diagnostics] Error running diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDiagnosticItem = (title: string, result: DiagnosticResult) => {
    const statusColor = result.success ? Colors.success : Colors.error;
    const statusIcon = result.success ? '✅' : '❌';

    return (
      <View style={styles.diagnosticItem}>
        <View style={styles.diagnosticHeader}>
          <Text style={styles.diagnosticTitle}>
            {statusIcon} {title}
          </Text>
          {result.latency && (
            <Text style={styles.latencyBadge}>{result.latency}ms</Text>
          )}
        </View>
        <Text style={[styles.diagnosticMessage, { color: statusColor }]}>
          {result.message}
        </Text>
        {result.details && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsText}>
              {JSON.stringify(result.details, null, 2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const getStatusColor = () => {
    if (!analysis) return Colors.text.secondary;
    switch (analysis.status) {
      case 'healthy':
        return Colors.success;
      case 'degraded':
        return Colors.warning;
      case 'failed':
        return Colors.error;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diagnostics Réseau</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔍 Diagnostic de Connectivité</Text>
          <Text style={styles.infoText}>
            Cet outil vérifie la connexion entre votre appareil et les services
            Supabase. Utilisez-le pour identifier les problèmes de réseau.
          </Text>
        </View>

        {!diagnostics ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Appuyez sur &quot;Lancer le diagnostic&quot; pour analyser votre connexion
            </Text>
          </View>
        ) : (
          <>
            {analysis && (
              <View
                style={[
                  styles.summaryCard,
                  { borderColor: getStatusColor() },
                ]}
              >
                <Text style={styles.summaryTitle}>Résumé</Text>
                <Text style={[styles.summaryText, { color: getStatusColor() }]}>
                  {analysis.summary}
                </Text>

                {analysis.recommendations.length > 0 && (
                  <View style={styles.recommendationsContainer}>
                    <Text style={styles.recommendationsTitle}>
                      📋 Recommandations:
                    </Text>
                    {analysis.recommendations.map((rec, index) => (
                      <Text key={index} style={styles.recommendationItem}>
                        • {rec}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>Détails des Tests</Text>

              {renderDiagnosticItem(
                'Informations Réseau',
                diagnostics.networkInfo
              )}
              {renderDiagnosticItem(
                'Résolution DNS',
                diagnostics.dnsResolution
              )}
              {renderDiagnosticItem(
                'Accessibilité API',
                diagnostics.apiReachability
              )}
              {renderDiagnosticItem(
                'Service d\'Authentification',
                diagnostics.authService
              )}
              {renderDiagnosticItem(
                'Service Base de Données',
                diagnostics.databaseService
              )}
            </View>

            <View style={styles.troubleshootingCard}>
              <Text style={styles.troubleshootingTitle}>
                🛠️ Guide de Dépannage
              </Text>
              <View style={styles.troubleshootingItem}>
                <Text style={styles.troubleshootingLabel}>WiFi/Données:</Text>
                <Text style={styles.troubleshootingText}>
                  Vérifiez que vous êtes connecté à Internet
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <Text style={styles.troubleshootingLabel}>VPN:</Text>
                <Text style={styles.troubleshootingText}>
                  Désactivez votre VPN si vous en utilisez un
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <Text style={styles.troubleshootingLabel}>Firewall:</Text>
                <Text style={styles.troubleshootingText}>
                  Assurez-vous que les connexions HTTPS ne sont pas bloquées
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <Text style={styles.troubleshootingLabel}>
                  Réseau d&apos;entreprise:
                </Text>
                <Text style={styles.troubleshootingText}>
                  Contactez votre service IT si vous êtes sur un réseau
                  d&apos;entreprise
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={runDiagnostics}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {diagnostics ? '🔄 Relancer le diagnostic' : '▶️ Lancer le diagnostic'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
    marginRight: 60, // Balance the back button
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: Spacing.md,
  },
  infoTitle: {
    ...Typography.h3,
    fontSize: 18,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  infoText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    ...Typography.h3,
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  summaryText: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  recommendationsContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  recommendationsTitle: {
    ...Typography.small,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  recommendationItem: {
    ...Typography.small,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  resultsContainer: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 18,
    marginBottom: Spacing.sm,
  },
  diagnosticItem: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  diagnosticHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  diagnosticTitle: {
    ...Typography.body,
    fontWeight: '700',
    flex: 1,
  },
  latencyBadge: {
    ...Typography.small,
    backgroundColor: Colors.primary + '15',
    color: Colors.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    fontWeight: '600',
  },
  diagnosticMessage: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  detailsContainer: {
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  detailsText: {
    ...Typography.small,
    fontFamily: 'monospace',
    color: Colors.text.tertiary,
  },
  troubleshootingCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  troubleshootingTitle: {
    ...Typography.h3,
    fontSize: 18,
    marginBottom: Spacing.sm,
  },
  troubleshootingItem: {
    marginBottom: Spacing.sm,
  },
  troubleshootingLabel: {
    ...Typography.small,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  troubleshootingText: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '700',
  },
});
