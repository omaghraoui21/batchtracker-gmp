/**
 * Phase 12: DB Audit & Repair - Admin Diagnostic Dashboard
 * Industrial-style diagnostic interface for database integrity and GMP compliance
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  runDatabaseAudit,
  runSafeModeRepair,
  exportTechnicalReport,
} from '@/lib/dbAudit';
import type {
  IntegrityReport,
  RepairReport,
  DiagnosticStatus,
  ManualChecklistItem,
} from '@/types/dbAudit';

// Phase 12: Slate & Steel Industrial Theme
const IndustrialColors = {
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  steel: {
    base: '#708090',
    light: '#A9B4C2',
    dark: '#4A5568',
  },
  diagnostic: {
    pass: '#10B981', // Emerald Green
    warning: '#F59E0B', // Amber
    critical: '#DC2626', // Alert Red
  },
};

export default function DBAuditScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const [repairReport, setRepairReport] = useState<RepairReport | null>(null);
  const [consoleLog, setConsoleLog] = useState<string[]>([]);
  const [progressAnim] = useState(new Animated.Value(0));
  const [manualChecklist, setManualChecklist] = useState<ManualChecklistItem[]>([
    {
      id: '1',
      category: 'user',
      description: 'Create User',
      testProcedure: 'Navigate to Users > Add New User and create a test user',
      status: 'pending',
    },
    {
      id: '2',
      category: 'batch',
      description: 'Create Batch',
      testProcedure: 'Navigate to Batches > New Batch and create a test batch',
      status: 'pending',
    },
    {
      id: '3',
      category: 'batch',
      description: 'Finalize Lot',
      testProcedure: 'Complete all workflow steps and finalize a batch',
      status: 'pending',
    },
    {
      id: '4',
      category: 'batch',
      description: 'Scan QR Code',
      testProcedure: 'Use Scanner tab to scan a batch QR code',
      status: 'pending',
    },
    {
      id: '5',
      category: 'workflow',
      description: 'Assignment Rule',
      testProcedure: 'Create batch and verify automatic assignment works',
      status: 'pending',
    },
  ]);

  // Access control
  React.useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      Alert.alert('Accès refusé', 'Diagnostic DB réservé aux administrateurs.', [
        { text: 'Retour', onPress: () => router.back() },
      ]);
    }
  }, [user, router]);

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const addConsoleLog = (message: string) => {
    setConsoleLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startProgressAnimation = () => {
    progressAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopProgressAnimation = () => {
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
  };

  const handleScanIntegrity = async () => {
    setScanning(true);
    setConsoleLog([]);
    setRepairReport(null);
    startProgressAnimation();

    addConsoleLog('🔍 Initializing database integrity scan...');
    addConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      addConsoleLog('▸ Scanning Users table...');
      await new Promise((r) => setTimeout(r, 500));
      addConsoleLog('▸ Scanning Batches table...');
      await new Promise((r) => setTimeout(r, 500));
      addConsoleLog('▸ Scanning Audit Events table...');
      await new Promise((r) => setTimeout(r, 500));
      addConsoleLog('▸ Scanning Workflow tables...');
      await new Promise((r) => setTimeout(r, 500));

      const report = await runDatabaseAudit();
      setIntegrityReport(report);

      addConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addConsoleLog(`✓ Scan complete: ${report.summary.totalChecks} checks performed`);
      addConsoleLog(
        `  • Pass: ${report.summary.passedChecks} | Warning: ${report.summary.warningChecks} | Critical: ${report.summary.criticalChecks}`
      );
      addConsoleLog(`Overall Status: ${report.overallStatus.toUpperCase()}`);
    } catch (error: any) {
      addConsoleLog(`✗ ERROR: ${error.message}`);
      Alert.alert('Scan Error', error.message);
    } finally {
      setScanning(false);
      stopProgressAnimation();
    }
  };

  const handleSafeModeRepair = async () => {
    if (!integrityReport) return;

    Alert.alert(
      'Safe-Mode Repair',
      'Cette opération va corriger automatiquement les problèmes détectés sans supprimer de données. Continuer?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réparer',
          onPress: async () => {
            setRepairing(true);
            setConsoleLog([]);
            startProgressAnimation();

            addConsoleLog('🔧 Starting safe-mode repair...');
            addConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            try {
              const repair = await runSafeModeRepair(integrityReport);
              setRepairReport(repair);

              addConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              addConsoleLog(`✓ Repair complete: ${repair.appliedActions} actions applied`);
              if (repair.failedActions > 0) {
                addConsoleLog(`⚠ ${repair.failedActions} actions failed`);
              }
              addConsoleLog('Before → After:');
              addConsoleLog(
                `  Critical: ${repair.beforeSummary.criticalChecks} → ${repair.afterSummary.criticalChecks}`
              );
              addConsoleLog(
                `  Warning: ${repair.beforeSummary.warningChecks} → ${repair.afterSummary.warningChecks}`
              );

              // Re-scan after repair
              await handleScanIntegrity();
            } catch (error: any) {
              addConsoleLog(`✗ REPAIR ERROR: ${error.message}`);
              Alert.alert('Repair Error', error.message);
            } finally {
              setRepairing(false);
              stopProgressAnimation();
            }
          },
        },
      ]
    );
  };

  const handleExportReport = async () => {
    if (!integrityReport) return;

    try {
      const jsonReport = exportTechnicalReport(integrityReport, repairReport || undefined);
      await Clipboard.setStringAsync(jsonReport);
      Alert.alert('✓ Exported', 'Technical report copied to clipboard as JSON.');
    } catch (error: any) {
      Alert.alert('Export Error', error.message);
    }
  };

  const toggleChecklistItem = (id: string) => {
    setManualChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          let newStatus: 'pending' | 'pass' | 'fail' = 'pending';
          if (item.status === 'pending') newStatus = 'pass';
          else if (item.status === 'pass') newStatus = 'fail';
          else newStatus = 'pending';

          return {
            ...item,
            status: newStatus,
            testedBy: newStatus !== 'pending' ? user?.name : undefined,
            testedAt: newStatus !== 'pending' ? new Date().toISOString() : undefined,
          };
        }
        return item;
      })
    );
  };

  const getStatusColor = (status: DiagnosticStatus) => {
    switch (status) {
      case 'pass':
        return IndustrialColors.diagnostic.pass;
      case 'warning':
        return IndustrialColors.diagnostic.warning;
      case 'critical':
        return IndustrialColors.diagnostic.critical;
    }
  };

  const getStatusLabel = (status: DiagnosticStatus) => {
    switch (status) {
      case 'pass':
        return 'PASS';
      case 'warning':
        return 'WARNING';
      case 'critical':
        return 'CRITICAL';
    }
  };

  const getStatusIcon = (status: DiagnosticStatus) => {
    switch (status) {
      case 'pass':
        return '✓';
      case 'warning':
        return '⚠';
      case 'critical':
        return '✗';
    }
  };

  const pulseScale = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={IndustrialColors.slate[50]} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>DB AUDIT & REPAIR</Text>
          <Text style={styles.headerSubtitle}>System Diagnostics</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>GMP</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.scanButton, scanning && styles.buttonDisabled]}
            onPress={handleScanIntegrity}
            disabled={scanning || repairing}
          >
            {scanning ? (
              <ActivityIndicator color={IndustrialColors.slate[50]} size="small" />
            ) : (
              <Ionicons name="scan-outline" size={20} color={IndustrialColors.slate[50]} />
            )}
            <Text style={styles.actionButtonText}>Scan Integrity</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.repairButton,
              (!integrityReport || repairing) && styles.buttonDisabled,
            ]}
            onPress={handleSafeModeRepair}
            disabled={!integrityReport || repairing || scanning}
          >
            {repairing ? (
              <ActivityIndicator color={IndustrialColors.slate[50]} size="small" />
            ) : (
              <Ionicons name="construct-outline" size={20} color={IndustrialColors.slate[50]} />
            )}
            <Text style={styles.actionButtonText}>Safe Repair</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.exportButton,
              !integrityReport && styles.buttonDisabled,
            ]}
            onPress={handleExportReport}
            disabled={!integrityReport}
          >
            <Ionicons
              name="download-outline"
              size={20}
              color={IndustrialColors.slate[50]}
            />
            <Text style={styles.actionButtonText}>Export JSON</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Indicator */}
        {(scanning || repairing) && (
          <Animated.View
            style={[styles.progressBar, { transform: [{ scaleX: pulseScale }] }]}
          >
            <View style={styles.progressFill} />
          </Animated.View>
        )}

        {/* Technical Console */}
        <View style={styles.consoleCard}>
          <View style={styles.consoleHeader}>
            <Ionicons name="terminal-outline" size={18} color={IndustrialColors.steel.light} />
            <Text style={styles.consoleTitle}>Technical Console</Text>
          </View>
          <ScrollView style={styles.consoleContent} nestedScrollEnabled>
            {consoleLog.length === 0 ? (
              <Text style={styles.consoleEmpty}>Awaiting scan...</Text>
            ) : (
              consoleLog.map((log, index) => (
                <Text key={index} style={styles.consoleText}>
                  {log}
                </Text>
              ))
            )}
          </ScrollView>
        </View>

        {/* Integrity Report Summary */}
        {integrityReport && (
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>Integrity Report</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(integrityReport.overallStatus) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: getStatusColor(integrityReport.overallStatus) },
                  ]}
                >
                  {getStatusLabel(integrityReport.overallStatus)}
                </Text>
              </View>
            </View>

            {/* Statistics Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{integrityReport.summary.totalChecks}</Text>
                <Text style={styles.statLabel}>Total Checks</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: IndustrialColors.diagnostic.pass }]}>
                  {integrityReport.summary.passedChecks}
                </Text>
                <Text style={styles.statLabel}>Pass</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: IndustrialColors.diagnostic.warning }]}>
                  {integrityReport.summary.warningChecks}
                </Text>
                <Text style={styles.statLabel}>Warning</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: IndustrialColors.diagnostic.critical }]}>
                  {integrityReport.summary.criticalChecks}
                </Text>
                <Text style={styles.statLabel}>Critical</Text>
              </View>
            </View>

            {/* Detailed Checks */}
            <View style={styles.checksSection}>
              <Text style={styles.checksSectionTitle}>Detailed Checks</Text>
              {integrityReport.checks.map((check, index) => (
                <View key={index} style={styles.checkItem}>
                  <View style={styles.checkHeader}>
                    <Text
                      style={[
                        styles.checkIcon,
                        { color: getStatusColor(check.status) },
                      ]}
                    >
                      {getStatusIcon(check.status)}
                    </Text>
                    <View style={styles.checkInfo}>
                      <Text style={styles.checkCategory}>{check.category}</Text>
                      <Text style={styles.checkName}>{check.checkName}</Text>
                    </View>
                  </View>
                  <Text style={styles.checkMessage}>{check.message}</Text>
                  {check.details && check.details.count !== undefined && check.details.count > 0 && (
                    <View style={styles.checkDetails}>
                      <Text style={styles.checkDetailsText}>
                        Count: {check.details.count}
                      </Text>
                      {check.details.examples && check.details.examples.length > 0 && (
                        <Text style={styles.checkDetailsText}>
                          Examples: {check.details.examples.join(', ')}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Manual Validation Checklist */}
        <View style={styles.checklistCard}>
          <View style={styles.checklistHeader}>
            <Ionicons name="clipboard-outline" size={20} color={IndustrialColors.steel.light} />
            <Text style={styles.checklistTitle}>Manual Validation Checklist</Text>
          </View>
          <Text style={styles.checklistSubtitle}>
            Tap items to cycle: Pending → Pass → Fail
          </Text>
          {manualChecklist.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem(item.id)}
            >
              <View style={styles.checklistItemHeader}>
                <Text
                  style={[
                    styles.checklistItemIcon,
                    {
                      color:
                        item.status === 'pass'
                          ? IndustrialColors.diagnostic.pass
                          : item.status === 'fail'
                          ? IndustrialColors.diagnostic.critical
                          : IndustrialColors.slate[400],
                    },
                  ]}
                >
                  {item.status === 'pass'
                    ? '✓'
                    : item.status === 'fail'
                    ? '✗'
                    : '○'}
                </Text>
                <View style={styles.checklistItemInfo}>
                  <Text style={styles.checklistItemTitle}>{item.description}</Text>
                  <Text style={styles.checklistItemProcedure}>{item.testProcedure}</Text>
                  {item.testedBy && (
                    <Text style={styles.checklistItemMeta}>
                      Tested by {item.testedBy} at{' '}
                      {new Date(item.testedAt!).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Phase 12: DB Audit & Repair System{'\n'}
            GMP Compliance & Data Integrity Assurance
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IndustrialColors.slate[900],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: IndustrialColors.slate[800],
    borderBottomWidth: 2,
    borderBottomColor: IndustrialColors.steel.base + '40',
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
    fontSize: 18,
    fontWeight: '800',
    color: IndustrialColors.slate[50],
    letterSpacing: 1,
  },
  headerSubtitle: {
    ...Typography.small,
    color: IndustrialColors.steel.light,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerBadge: {
    backgroundColor: IndustrialColors.diagnostic.pass + '30',
    borderWidth: 1,
    borderColor: IndustrialColors.diagnostic.pass,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  headerBadgeText: {
    ...Typography.small,
    fontSize: 10,
    fontWeight: '800',
    color: IndustrialColors.diagnostic.pass,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    ...Shadows.md,
  },
  scanButton: {
    backgroundColor: IndustrialColors.diagnostic.pass,
  },
  repairButton: {
    backgroundColor: IndustrialColors.diagnostic.warning,
  },
  exportButton: {
    backgroundColor: IndustrialColors.steel.base,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    ...Typography.caption,
    color: IndustrialColors.slate[50],
    fontWeight: '700',
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: IndustrialColors.slate[700],
    borderRadius: 2,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    flex: 1,
    backgroundColor: IndustrialColors.diagnostic.pass,
  },
  consoleCard: {
    backgroundColor: IndustrialColors.slate[800],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: IndustrialColors.steel.base + '40',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: IndustrialColors.slate[700],
    gap: Spacing.xs,
  },
  consoleTitle: {
    ...Typography.caption,
    color: IndustrialColors.steel.light,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consoleContent: {
    maxHeight: 200,
    padding: Spacing.md,
  },
  consoleEmpty: {
    ...Typography.small,
    color: IndustrialColors.slate[500],
    fontFamily: 'monospace',
    fontStyle: 'italic',
  },
  consoleText: {
    ...Typography.small,
    color: IndustrialColors.slate[300],
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 18,
  },
  reportCard: {
    backgroundColor: IndustrialColors.slate[800],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: IndustrialColors.steel.base + '40',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  reportTitle: {
    ...Typography.h3,
    fontSize: 16,
    fontWeight: '700',
    color: IndustrialColors.slate[50],
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeText: {
    ...Typography.small,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: IndustrialColors.slate[700],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    fontSize: 24,
    fontWeight: '800',
    color: IndustrialColors.slate[50],
  },
  statLabel: {
    ...Typography.small,
    fontSize: 10,
    color: IndustrialColors.slate[400],
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  checksSection: {
    marginTop: Spacing.sm,
  },
  checksSectionTitle: {
    ...Typography.caption,
    color: IndustrialColors.steel.light,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  checkItem: {
    backgroundColor: IndustrialColors.slate[700],
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: IndustrialColors.steel.base,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  checkIcon: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: Spacing.sm,
  },
  checkInfo: {
    flex: 1,
  },
  checkCategory: {
    ...Typography.small,
    fontSize: 10,
    color: IndustrialColors.slate[400],
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  checkName: {
    ...Typography.caption,
    color: IndustrialColors.slate[200],
    fontWeight: '600',
  },
  checkMessage: {
    ...Typography.small,
    color: IndustrialColors.slate[300],
    marginBottom: Spacing.xs,
  },
  checkDetails: {
    backgroundColor: IndustrialColors.slate[800],
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs,
  },
  checkDetailsText: {
    ...Typography.small,
    fontSize: 10,
    color: IndustrialColors.slate[400],
    fontFamily: 'monospace',
  },
  checklistCard: {
    backgroundColor: IndustrialColors.slate[800],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: IndustrialColors.steel.base + '40',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  checklistTitle: {
    ...Typography.h3,
    fontSize: 16,
    fontWeight: '700',
    color: IndustrialColors.slate[50],
  },
  checklistSubtitle: {
    ...Typography.small,
    color: IndustrialColors.slate[400],
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  checklistItem: {
    backgroundColor: IndustrialColors.slate[700],
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  checklistItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checklistItemIcon: {
    fontSize: 20,
    fontWeight: '800',
    marginRight: Spacing.sm,
  },
  checklistItemInfo: {
    flex: 1,
  },
  checklistItemTitle: {
    ...Typography.caption,
    color: IndustrialColors.slate[200],
    fontWeight: '600',
    marginBottom: 4,
  },
  checklistItemProcedure: {
    ...Typography.small,
    fontSize: 11,
    color: IndustrialColors.slate[400],
    lineHeight: 16,
  },
  checklistItemMeta: {
    ...Typography.small,
    fontSize: 10,
    color: IndustrialColors.steel.light,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    ...Typography.small,
    fontSize: 11,
    color: IndustrialColors.slate[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});
