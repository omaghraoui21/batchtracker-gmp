import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import {
  runComprehensiveDiagnostics,
  analyzeDiagnostics,
  type NetworkDiagnostics,
  type DiagnosticResult,
} from '@/utils/networkDiagnostics';
import { debugLogger } from '@/lib/debugLogger';

export default function DiagnosticsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnostics | null>(null);
  const [analysis, setAnalysis] = useState<{
    status: 'healthy' | 'degraded' | 'failed';
    summary: string;
    recommendations: string[];
  } | null>(null);
  const [showRawErrors, setShowRawErrors] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [lastLoginData, setLastLoginData] = useState(debugLogger.getLastLoginAttempt());

  useEffect(() => {
    const unsubscribe = debugLogger.addListener(() => {
      setLastLoginData(debugLogger.getLastLoginAttempt());
    });
    return unsubscribe;
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await runComprehensiveDiagnostics();
      setDiagnostics(results);

      const analysisResults = analyzeDiagnostics(results);
      setAnalysis(analysisResults);
    } catch (error) {
      debugLogger.error('DiagnosticsUI', 'Error running diagnostics', error);
    } finally {
      setLoading(false);
    }
  };

  const copyTechnicalLogs = async () => {
    try {
      const fullReport = debugLogger.exportFullReport();

      // Append diagnostics results if available
      let reportWithDiagnostics = fullReport;
      if (diagnostics) {
        reportWithDiagnostics += '\n\n── RÉSULTATS DIAGNOSTICS ──\n';
        reportWithDiagnostics += JSON.stringify(diagnostics, null, 2);
      }
      if (analysis) {
        reportWithDiagnostics += '\n\n── ANALYSE ──\n';
        reportWithDiagnostics += JSON.stringify(analysis, null, 2);
      }

      await Clipboard.setStringAsync(reportWithDiagnostics);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 3000);

      Alert.alert(
        '✅ Logs copiés',
        'Le rapport technique complet a été copié dans le presse-papiers.\n\nVous pouvez le coller dans un email ou un message pour le support technique.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', `Impossible de copier: ${error.message}`);
    }
  };

  const renderDiagnosticItem = (title: string, result: DiagnosticResult, key: string) => {
    const statusColor = result.success ? Colors.success : Colors.error;
    const statusIcon = result.success ? '✅' : '❌';

    return (
      <View style={styles.diagnosticItem} key={key}>
        <View style={styles.diagnosticHeader}>
          <Text style={styles.diagnosticTitle}>
            {statusIcon} {title}
          </Text>
          {result.latency !== undefined && (
            <View style={[
              styles.latencyBadgeContainer,
              { backgroundColor: result.latency > 3000 ? Colors.error + '15' : Colors.primary + '15' },
            ]}>
              <Text style={[
                styles.latencyBadge,
                { color: result.latency > 3000 ? Colors.error : Colors.primary },
              ]}>
                {result.latency}ms
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.diagnosticMessage, { color: statusColor }]}>
          {result.message}
        </Text>
        {result.details && (
          <TouchableOpacity
            style={styles.detailsToggle}
            onPress={() => {}} // Always shown for deep debug
          >
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsText}>
                {JSON.stringify(result.details, null, 2)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {showRawErrors && result.rawError && (
          <View style={styles.rawErrorContainer}>
            <Text style={styles.rawErrorLabel}>Erreur brute:</Text>
            <Text style={styles.rawErrorText}>{result.rawError}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderLastLoginAttempt = () => {
    if (!lastLoginData) return null;

    return (
      <View style={styles.loginAttemptCard}>
        <Text style={styles.sectionTitle}>Dernière Tentative de Connexion</Text>
        <View style={styles.loginAttemptMeta}>
          <Text style={styles.loginAttemptMetaText}>
            {lastLoginData.timestamp}
          </Text>
          <View style={[
            styles.loginResultBadge,
            {
              backgroundColor: lastLoginData.finalResult === 'success'
                ? Colors.success + '15'
                : Colors.error + '15',
            },
          ]}>
            <Text style={[
              styles.loginResultText,
              {
                color: lastLoginData.finalResult === 'success'
                  ? Colors.success
                  : Colors.error,
              },
            ]}>
              {lastLoginData.finalResult === 'success' ? '✅ Succès' : '❌ Échec'}
            </Text>
          </View>
        </View>
        <Text style={styles.loginAttemptEmail}>
          Email: {lastLoginData.email}
        </Text>
        <Text style={styles.loginAttemptDuration}>
          Durée totale: {lastLoginData.totalDuration}ms
        </Text>

        {lastLoginData.steps.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepIcon}>
                {step.status === 'success' ? '✅' : step.status === 'error' ? '❌' : '⏭️'}
              </Text>
              <Text style={styles.stepName}>{step.step}</Text>
              {step.duration !== undefined && (
                <Text style={styles.stepDuration}>{step.duration}ms</Text>
              )}
            </View>
            {step.rawError && (
              <View style={styles.stepErrorContainer}>
                <Text style={styles.stepErrorLabel}>Erreur:</Text>
                <Text style={styles.stepErrorText}>
                  {typeof step.rawError === 'string'
                    ? step.rawError
                    : JSON.stringify(step.rawError, null, 2)}
                </Text>
              </View>
            )}
            {step.rawResponse && (
              <View style={styles.stepResponseContainer}>
                <Text style={styles.stepResponseLabel}>Réponse:</Text>
                <Text style={styles.stepResponseText}>
                  {JSON.stringify(step.rawResponse, null, 2)}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderFallbackTests = () => {
    if (!diagnostics?.fallbackConnectivity?.details?.tests) return null;

    const tests = diagnostics.fallbackConnectivity.details.tests as {
      name: string;
      ok: boolean;
      status?: number;
      latency?: number;
      error?: string;
    }[];

    return (
      <View style={styles.fallbackTestsContainer}>
        {tests.map((test, index) => (
          <View key={index} style={styles.fallbackTestRow}>
            <Text style={styles.fallbackTestIcon}>
              {test.ok ? '✅' : '❌'}
            </Text>
            <View style={styles.fallbackTestInfo}>
              <Text style={styles.fallbackTestName}>{test.name}</Text>
              {test.ok ? (
                <Text style={styles.fallbackTestSuccess}>
                  HTTP {test.status} - {test.latency}ms
                </Text>
              ) : (
                <Text style={styles.fallbackTestError} numberOfLines={2}>
                  {test.error}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderDnsIpv6Checks = () => {
    if (!diagnostics?.dnsIpv6Check?.details?.checks) return null;

    const checks = diagnostics.dnsIpv6Check.details.checks as {
      name: string;
      result: string;
      warning?: boolean;
    }[];

    return (
      <View style={styles.dnsChecksContainer}>
        {checks.map((check, index) => (
          <View key={index} style={styles.dnsCheckRow}>
            <Text style={[
              styles.dnsCheckName,
              check.warning && { color: Colors.warning },
            ]}>
              {check.warning ? '⚠️' : '•'} {check.name}
            </Text>
            <Text style={[
              styles.dnsCheckResult,
              check.warning && { color: Colors.warning },
            ]} numberOfLines={2}>
              {check.result}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderConfigAudit = () => {
    if (!diagnostics?.configAudit?.details?.checks) return null;

    const checks = diagnostics.configAudit.details.checks as {
      name: string;
      status: 'ok' | 'warning' | 'error';
      detail: string;
    }[];

    return (
      <View style={styles.configChecksContainer}>
        {checks.map((check, index) => (
          <View key={index} style={styles.configCheckRow}>
            <Text style={styles.configCheckIcon}>
              {check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'}
            </Text>
            <View style={styles.configCheckInfo}>
              <Text style={styles.configCheckName}>{check.name}</Text>
              <Text style={styles.configCheckDetail} numberOfLines={3}>
                {check.detail}
              </Text>
            </View>
          </View>
        ))}
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

  const getStatusLabel = () => {
    if (!analysis) return '';
    switch (analysis.status) {
      case 'healthy':
        return 'OPÉRATIONNEL';
      case 'degraded':
        return 'DÉGRADÉ';
      case 'failed':
        return 'EN PANNE';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/admin')}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          <Text style={styles.backButtonText}>Retour Système</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.breadcrumbContainer}>
            <Text style={styles.breadcrumb}>Admin</Text>
            <Ionicons name="chevron-forward" size={12} color={Colors.text.tertiary} style={styles.breadcrumbSeparator} />
            <Text style={styles.breadcrumb}>Système</Text>
            <Ionicons name="chevron-forward" size={12} color={Colors.text.tertiary} style={styles.breadcrumbSeparator} />
            <Text style={styles.breadcrumbActive}>Diagnostic</Text>
          </View>
          <Text style={styles.headerTitle}>Diagnostic Avancé</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>DEEP DEBUG</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔬 Mode Débogage Avancé</Text>
          <Text style={styles.infoText}>
            Diagnostic complet avec capture d&apos;erreurs brutes, tests de connectivité
            alternatifs et investigation DNS/IPv6. Utilisez &quot;Copier les logs&quot; pour
            partager le rapport avec le support technique.
          </Text>
        </View>

        {/* Last Login Attempt */}
        {renderLastLoginAttempt()}

        {/* Main diagnostic results */}
        {!diagnostics ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔍</Text>
            <Text style={styles.emptyStateText}>
              Appuyez sur &quot;Lancer le diagnostic&quot; pour analyser votre connexion
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Card */}
            {analysis && (
              <View style={[styles.summaryCard, { borderColor: getStatusColor() }]}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>État Global</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>
                      {getStatusLabel()}
                    </Text>
                  </View>
                </View>
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
                        {rec}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Core Tests */}
            <View style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>Tests de Base</Text>
              {renderDiagnosticItem('Informations Réseau', diagnostics.networkInfo, 'network')}
              {renderDiagnosticItem('Résolution DNS', diagnostics.dnsResolution, 'dns')}
              {renderDiagnosticItem('Accessibilité API', diagnostics.apiReachability, 'api')}
              {renderDiagnosticItem('Service d\'Authentification', diagnostics.authService, 'auth')}
              {renderDiagnosticItem('Service Base de Données', diagnostics.databaseService, 'db')}
            </View>

            {/* Fallback Connectivity */}
            <View style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>Test de Connectivité Alternative</Text>
              <Text style={styles.sectionSubtitle}>
                Vérifie si le problème est spécifique à Supabase ou général
              </Text>
              {renderDiagnosticItem('Connectivité Alternative', diagnostics.fallbackConnectivity, 'fallback')}
              {renderFallbackTests()}
            </View>

            {/* DNS/IPv6 Investigation */}
            <View style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>Investigation DNS/IPv6</Text>
              <Text style={styles.sectionSubtitle}>
                Détecte les problèmes de résolution DNS et IPv6
              </Text>
              {renderDiagnosticItem('DNS & IPv6', diagnostics.dnsIpv6Check, 'ipv6')}
              {renderDnsIpv6Checks()}
            </View>

            {/* Config Audit */}
            <View style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>Audit Configuration Client</Text>
              <Text style={styles.sectionSubtitle}>
                Vérifie AsyncStorage, URL polyfill et paramètres Supabase
              </Text>
              {renderDiagnosticItem('Configuration', diagnostics.configAudit, 'config')}
              {renderConfigAudit()}
            </View>

            {/* Raw Error Toggle */}
            <TouchableOpacity
              style={styles.rawErrorToggle}
              onPress={() => setShowRawErrors(!showRawErrors)}
            >
              <Text style={styles.rawErrorToggleText}>
                {showRawErrors ? '🔽 Masquer les erreurs brutes' : '▶️ Afficher les erreurs brutes'}
              </Text>
            </TouchableOpacity>

            {/* Troubleshooting Guide */}
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
                <Text style={styles.troubleshootingLabel}>DNS:</Text>
                <Text style={styles.troubleshootingText}>
                  Essayez de changer vos DNS vers 8.8.8.8 ou 1.1.1.1
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <Text style={styles.troubleshootingLabel}>IPv6:</Text>
                <Text style={styles.troubleshootingText}>
                  Si IPv6 est détecté, essayez de le désactiver dans les paramètres réseau
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <Text style={styles.troubleshootingLabel}>Firewall:</Text>
                <Text style={styles.troubleshootingText}>
                  Assurez-vous que les connexions HTTPS vers *.supabase.co ne sont pas bloquées
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <Text style={styles.troubleshootingLabel}>
                  Réseau d&apos;entreprise:
                </Text>
                <Text style={styles.troubleshootingText}>
                  Contactez votre service IT pour autoriser l&apos;accès à Supabase
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer with action buttons */}
      <View style={styles.footer}>
        <View style={styles.footerButtonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              loading && styles.buttonDisabled,
              { flex: 1 },
            ]}
            onPress={runDiagnostics}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {diagnostics ? '🔄 Relancer' : '▶️ Lancer le diagnostic'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.copyButton,
              copiedFeedback && styles.copiedButton,
              { flex: 1 },
            ]}
            onPress={copyTechnicalLogs}
          >
            <Text style={[
              styles.copyButtonText,
              copiedFeedback && styles.copiedButtonText,
            ]}>
              {copiedFeedback ? '✅ Copié!' : '📋 Copier les logs'}
            </Text>
          </TouchableOpacity>
        </View>
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
    minHeight: 64,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  breadcrumb: {
    ...Typography.small,
    color: Colors.text.tertiary,
    fontSize: 11,
  },
  breadcrumbActive: {
    ...Typography.small,
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  breadcrumbSeparator: {
    marginHorizontal: 4,
  },
  headerTitle: {
    ...Typography.h3,
    fontSize: 18,
    fontWeight: '700',
  },
  headerBadge: {
    backgroundColor: Colors.error + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  headerBadgeText: {
    ...Typography.small,
    color: Colors.error,
    fontWeight: '700',
    fontSize: 10,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  infoCard: {
    backgroundColor: Colors.secondary + '08',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.secondary + '20',
    marginBottom: Spacing.md,
  },
  infoTitle: {
    ...Typography.h3,
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: Spacing.xs,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  emptyState: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },

  // Summary card
  summaryCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryTitle: {
    ...Typography.h3,
    fontSize: 18,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeText: {
    ...Typography.small,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    color: Colors.text.primary,
  },
  recommendationItem: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
    lineHeight: 20,
  },

  // Results
  resultsContainer: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 17,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    ...Typography.small,
    color: Colors.text.tertiary,
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
    fontSize: 15,
  },
  latencyBadgeContainer: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  latencyBadge: {
    ...Typography.small,
    fontWeight: '700',
  },
  diagnosticMessage: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  detailsToggle: {},
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
    fontSize: 11,
  },

  // Raw error display
  rawErrorContainer: {
    backgroundColor: Colors.error + '08',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.error + '20',
  },
  rawErrorLabel: {
    ...Typography.small,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  rawErrorText: {
    ...Typography.small,
    fontFamily: 'monospace',
    color: Colors.text.secondary,
    fontSize: 11,
  },
  rawErrorToggle: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  rawErrorToggleText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Login Attempt Card
  loginAttemptCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  loginAttemptMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  loginAttemptMetaText: {
    ...Typography.small,
    color: Colors.text.tertiary,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  loginResultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  loginResultText: {
    ...Typography.small,
    fontWeight: '700',
  },
  loginAttemptEmail: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  loginAttemptDuration: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },

  // Steps
  stepContainer: {
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stepIcon: {
    fontSize: 14,
  },
  stepName: {
    ...Typography.caption,
    fontWeight: '600',
    flex: 1,
    color: Colors.text.primary,
  },
  stepDuration: {
    ...Typography.small,
    fontFamily: 'monospace',
    color: Colors.text.tertiary,
    fontSize: 11,
  },
  stepErrorContainer: {
    backgroundColor: Colors.error + '08',
    padding: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs,
    marginLeft: Spacing.lg,
  },
  stepErrorLabel: {
    ...Typography.small,
    fontWeight: '700',
    color: Colors.error,
    fontSize: 11,
  },
  stepErrorText: {
    ...Typography.small,
    fontFamily: 'monospace',
    color: Colors.text.secondary,
    fontSize: 10,
  },
  stepResponseContainer: {
    backgroundColor: Colors.success + '08',
    padding: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs,
    marginLeft: Spacing.lg,
  },
  stepResponseLabel: {
    ...Typography.small,
    fontWeight: '700',
    color: Colors.success,
    fontSize: 11,
  },
  stepResponseText: {
    ...Typography.small,
    fontFamily: 'monospace',
    color: Colors.text.secondary,
    fontSize: 10,
  },

  // Fallback tests
  fallbackTestsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  fallbackTestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fallbackTestIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  fallbackTestInfo: {
    flex: 1,
  },
  fallbackTestName: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  fallbackTestSuccess: {
    ...Typography.small,
    color: Colors.success,
  },
  fallbackTestError: {
    ...Typography.small,
    color: Colors.error,
    fontFamily: 'monospace',
    fontSize: 11,
  },

  // DNS/IPv6 checks
  dnsChecksContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dnsCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '50',
  },
  dnsCheckName: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.text.secondary,
    flex: 0.4,
  },
  dnsCheckResult: {
    ...Typography.small,
    fontFamily: 'monospace',
    color: Colors.text.primary,
    flex: 0.6,
    textAlign: 'right',
    fontSize: 11,
  },

  // Config audit
  configChecksContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  configCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  configCheckIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  configCheckInfo: {
    flex: 1,
  },
  configCheckName: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  configCheckDetail: {
    ...Typography.small,
    color: Colors.text.tertiary,
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 2,
  },

  // Troubleshooting
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
    fontSize: 17,
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

  // Footer
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerButtonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  copyButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  copiedButton: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '10',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '700',
    fontSize: 15,
  },
  copyButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  copiedButtonText: {
    color: Colors.success,
  },
});
