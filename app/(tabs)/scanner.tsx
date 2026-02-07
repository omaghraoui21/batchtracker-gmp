import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import * as Haptics from 'expo-haptics';

interface ScanHistory {
  id: string;
  scan_type: string;
  batch_id?: string;
  step_instance_id?: string;
  scanned_at: string;
  success: boolean;
  notes?: string;
  batch?: {
    batch_number: string;
    product_name: string;
  };
}

/** Prevent rapid duplicate scans within this window (ms) */
const SCAN_DEBOUNCE_MS = 2000;

export default function ScannerScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [manualBatchNumber, setManualBatchNumber] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Skeleton pulse animation
  const skeletonAnim = useRef(new Animated.Value(0.3)).current;

  // Debounce ref to prevent duplicate scans
  const lastScanRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    fetchScanHistory();
  }, []);

  // Skeleton pulse animation loop
  useEffect(() => {
    if (!lookupLoading) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [lookupLoading, skeletonAnim]);

  const fetchScanHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('scan_history')
        .select(`
          *,
          batch:batches(batch_number, product_name)
        `)
        .order('scanned_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setScanHistory((data as unknown as ScanHistory[]) || []);
    } catch (error) {
      console.error('Error fetching scan history:', error);
    }
  };

  /**
   * Log a scan event to the audit_trail table for traceability.
   */
  const logAuditEvent = useCallback(
    async (action: string, details: Record<string, unknown>) => {
      try {
        await supabase.from('audit_trail').insert({
          action,
          user_id: user?.id ?? null,
          user_name: user?.name ?? 'Inconnu',
          details: JSON.stringify(details),
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        // Audit logging is best-effort; never block user flow
        console.error('Audit trail logging failed:', err);
      }
    },
    [user]
  );

  /**
   * Central barcode handler with debounce protection.
   */
  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!data) return;

      // Debounce: ignore if same code was scanned within the debounce window
      const now = Date.now();
      if (
        data === lastScanRef.current &&
        now - lastScanTimeRef.current < SCAN_DEBOUNCE_MS
      ) {
        return;
      }
      lastScanRef.current = data;
      lastScanTimeRef.current = now;

      try {
        setScanning(false);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );

        // Parse QR code data
        // Expected formats: BATCH:{batch_id} or STEP:{batch_id}:{step_instance_id}
        const parts = data.split(':');

        if (parts[0] === 'BATCH' && parts[1]) {
          await handleBatchScan(parts[1]);
        } else if (parts[0] === 'STEP' && parts[1] && parts[2]) {
          await handleStepScan(parts[1], parts[2]);
        } else {
          // Try to parse as batch number directly
          await handleBatchNumberScan(data);
        }
      } catch (error) {
        console.error('Error processing scan:', error);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
        showError(
          'Erreur de scan',
          'Impossible de traiter le code QR scanné'
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  /**
   * Smart Contextual Scan: determines ownership and routes accordingly.
   */
  const handleBatchScan = async (batchId: string) => {
    if (!user) {
      showError(
        'Non authentifié',
        'Veuillez vous connecter pour scanner un lot'
      );
      return;
    }

    try {
      setLoading(true);
      setLookupLoading(true);

      // Verify batch exists and get ownership info
      const { data: batch, error } = await supabase
        .from('batches')
        .select(
          'id, batch_number, product_name, current_owner_id, current_owner_name, status'
        )
        .eq('id', batchId)
        .single();

      if (error || !batch) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
        showError('Lot introuvable', `Aucun lot correspondant à cet identifiant`);

        // Record failed scan
        await supabase.from('scan_history').insert({
          scan_type: 'batch',
          batch_id: batchId,
          success: false,
          notes: `Échec: lot ID ${batchId} introuvable`,
        });

        await logAuditEvent('scan_batch_not_found', {
          batch_id: batchId,
          scanner_id: user.id,
        });

        return;
      }

      // Record successful scan in history
      await supabase.from('scan_history').insert({
        scan_type: 'batch',
        batch_id: batch.id,
        success: true,
        notes: `Scan du lot #${batch.batch_number}`,
      });

      await fetchScanHistory();

      // --- SMART CONTEXTUAL ROUTING ---
      const isCurrentOwner = batch.current_owner_id === user.id;

      await logAuditEvent('scan_batch', {
        batch_id: batch.id,
        batch_number: batch.batch_number,
        scanner_id: user.id,
        scanner_name: user.name,
        is_owner: isCurrentOwner,
        current_owner_id: batch.current_owner_id,
        routed_to: isCurrentOwner ? 'batch_detail' : 'batch_receive',
      });

      if (isCurrentOwner) {
        // OWNER MODE: navigate directly to batch detail page
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        showSuccess(
          'Votre dossier de lot',
          `Lot #${batch.batch_number} — ${batch.product_name}`
        );
        router.push(`/batch/${batch.id}`);
      } else {
        // RECEPTION MODE: navigate to the receive flow
        // Check if batch already has a different owner (prevent multiple simultaneous owners)
        if (batch.current_owner_id && batch.current_owner_name) {
          showInfo(
            'Réception en cours',
            `Lot #${batch.batch_number} — détenu par ${batch.current_owner_name}`
          );
        } else {
          showInfo(
            'Réception de lot',
            `Lot #${batch.batch_number} — ${batch.product_name}`
          );
        }

        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        router.push(`/batch/receive/${batch.id}`);
      }
    } catch (error) {
      console.error('Error handling batch scan:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(
        'Erreur',
        'Impossible de récupérer les informations du lot'
      );
    } finally {
      setLoading(false);
      setLookupLoading(false);
    }
  };

  const handleStepScan = async (batchId: string, stepInstanceId: string) => {
    if (!user) {
      showError(
        'Non authentifié',
        'Veuillez vous connecter pour scanner une étape'
      );
      return;
    }

    try {
      setLoading(true);
      setLookupLoading(true);

      // Verify step exists
      const { data: step, error } = await supabase
        .from('step_instances')
        .select(
          `
          *,
          batch:batches(id, batch_number, product_name, current_owner_id),
          step_definition:step_definitions(name)
        `
        )
        .eq('id', stepInstanceId)
        .eq('batch_id', batchId)
        .single();

      // Cast to expected shape since Supabase types don't define foreign key relations
      const typedStep = step as unknown as {
        id: string;
        batch_id: string;
        step_definition_id: string;
        status: string;
        step_definition: { name: string } | null;
        batch: { id: string; batch_number: string; product_name: string; current_owner_id: string | null } | null;
      } | null;

      if (error || !typedStep) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
        showError('Étape introuvable', 'Cette étape n\'existe pas ou a été supprimée');

        await supabase.from('scan_history').insert({
          scan_type: 'step',
          batch_id: batchId,
          step_instance_id: stepInstanceId,
          success: false,
          notes: `Échec: étape ${stepInstanceId} introuvable`,
        });

        await logAuditEvent('scan_step_not_found', {
          batch_id: batchId,
          step_instance_id: stepInstanceId,
          scanner_id: user.id,
        });

        return;
      }

      // Record scan in history
      await supabase.from('scan_history').insert({
        scan_type: 'step',
        batch_id: batchId,
        step_instance_id: stepInstanceId,
        success: true,
        notes: `Scan de l'étape ${typedStep.step_definition?.name}`,
      });

      await fetchScanHistory();

      await logAuditEvent('scan_step', {
        batch_id: batchId,
        step_instance_id: stepInstanceId,
        step_name: typedStep.step_definition?.name,
        scanner_id: user.id,
        scanner_name: user.name,
      });

      // Apply same contextual logic: owner goes to batch detail, others to receive
      const batchData = typedStep.batch;

      const isOwner = batchData?.current_owner_id === user.id;

      if (isOwner) {
        showSuccess(
          'Étape scannée',
          `${typedStep.step_definition?.name} — Lot #${batchData?.batch_number}`
        );
        router.push(`/batch/${batchId}`);
      } else {
        showInfo(
          'Étape scannée',
          `${typedStep.step_definition?.name} — Lot #${batchData?.batch_number}`
        );
        router.push(`/batch/receive/${batchId}`);
      }
    } catch (error) {
      console.error('Error handling step scan:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError(
        'Erreur',
        "Impossible de récupérer les informations de l'étape"
      );
    } finally {
      setLoading(false);
      setLookupLoading(false);
    }
  };

  const handleBatchNumberScan = async (batchNumber: string) => {
    if (!user) {
      showError(
        'Non authentifié',
        'Veuillez vous connecter pour scanner un lot'
      );
      return;
    }

    try {
      setLoading(true);
      setLookupLoading(true);

      // Search for batch by number
      const { data: batch, error } = await supabase
        .from('batches')
        .select('id, batch_number, product_name')
        .eq('batch_number', batchNumber)
        .single();

      if (error || !batch) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
        showWarning(
          'Lot introuvable',
          `Aucun lot trouvé avec le numéro : ${batchNumber}`
        );

        // Record failed scan
        await supabase.from('scan_history').insert({
          scan_type: 'batch',
          success: false,
          notes: `Échec: numéro de lot ${batchNumber} introuvable`,
        });

        await logAuditEvent('scan_batch_number_not_found', {
          batch_number: batchNumber,
          scanner_id: user.id,
        });

        await fetchScanHistory();
        return;
      }

      // Delegate to the main batch scan handler
      await handleBatchScan(batch.id);
    } catch (error) {
      console.error('Error handling batch number scan:', error);
      showError('Erreur', 'Impossible de rechercher le lot');
    } finally {
      setLoading(false);
      setLookupLoading(false);
    }
  };

  const handleManualEntry = () => {
    setManualEntryVisible(true);
  };

  const handleManualSubmit = async () => {
    if (!manualBatchNumber.trim()) return;

    setManualEntryVisible(false);
    await handleBatchNumberScan(manualBatchNumber.trim());
    setManualBatchNumber('');
  };

  const handleStartScanning = async () => {
    if (!user) {
      showError(
        'Non authentifié',
        'Veuillez vous connecter avant de scanner'
      );
      return;
    }

    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        showWarning(
          'Permission requise',
          "L'accès à la caméra est nécessaire pour scanner les codes QR"
        );
        return;
      }
    }

    // Reset debounce on new scan session
    lastScanRef.current = null;
    lastScanTimeRef.current = 0;
    setScanning(true);
  };

  const formatScanTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString('fr-FR');
  };

  // --- SKELETON LOADING OVERLAY ---
  const renderLookupSkeleton = () => {
    if (!lookupLoading) return null;

    return (
      <View style={styles.skeletonOverlay}>
        <View style={styles.skeletonCard}>
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={styles.skeletonSpinner}
          />
          <Text style={styles.skeletonTitle}>Recherche du lot...</Text>
          <View style={styles.skeletonLines}>
            <Animated.View
              style={[styles.skeletonLine, styles.skeletonLineLong, { opacity: skeletonAnim }]}
            />
            <Animated.View
              style={[styles.skeletonLine, styles.skeletonLineMedium, { opacity: skeletonAnim }]}
            />
            <Animated.View
              style={[styles.skeletonLine, styles.skeletonLineShort, { opacity: skeletonAnim }]}
            />
          </View>
        </View>
      </View>
    );
  };

  // --- CAMERA VIEW ---
  if (scanning) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.scanInstruction}>
              Positionnez le code QR dans le cadre
            </Text>
            {user && (
              <Text style={styles.scanUserInfo}>
                Connect\u00e9 : {user.name}
              </Text>
            )}
            <TouchableOpacity
              style={styles.cancelScanButton}
              onPress={() => setScanning(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.cancelScanText}>Fermer le Scanner</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
        {renderLookupSkeleton()}
      </View>
    );
  }

  // --- MAIN SCREEN ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Lookup skeleton overlay on main screen */}
      {renderLookupSkeleton()}

      {/* Zone de scan */}
      <Card style={styles.scanCard}>
        <View style={styles.scanIconContainer}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <Ionicons
              name="qr-code-outline"
              size={120}
              color={Colors.primary}
            />
          </View>
        </View>
        <Text style={styles.scanTitle}>Scanner un Code QR</Text>
        <Text style={styles.scanSubtitle}>
          Scannez un lot pour le consulter ou initier sa réception
        </Text>
        {user && (
          <View style={styles.userBadge}>
            <Ionicons name="person-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.userBadgeText}>{user.name}</Text>
          </View>
        )}
      </Card>

      {/* Boutons d'action */}
      <View style={styles.actions}>
        <Button
          title="Scanner un Code QR"
          onPress={handleStartScanning}
          size="large"
          style={styles.scanButton}
          disabled={loading}
          loading={loading}
        />
        <Button
          title="Saisie Manuelle"
          onPress={handleManualEntry}
          variant="outline"
          size="large"
          disabled={loading}
        />
      </View>

      {/* Historique des scans */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historique des Scans</Text>

        {scanHistory.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons
              name="scan-outline"
              size={48}
              color={Colors.text.tertiary}
            />
            <Text style={styles.emptyText}>Aucun scan récent</Text>
          </Card>
        ) : (
          scanHistory.map((scan) => (
            <Card key={scan.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View
                  style={[
                    styles.historyIcon,
                    scan.success ? styles.successIcon : styles.errorIcon,
                  ]}
                >
                  <Ionicons
                    name={
                      scan.success ? 'checkmark-circle' : 'close-circle'
                    }
                    size={20}
                    color={scan.success ? Colors.success : Colors.error}
                  />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyLabel}>
                    {scan.scan_type === 'batch' ? 'Lot' : 'Étape'}:{' '}
                    {scan.batch?.batch_number || 'N/A'}
                  </Text>
                  {scan.batch?.product_name && (
                    <Text style={styles.historyProduct}>
                      {scan.batch.product_name}
                    </Text>
                  )}
                  <Text style={styles.historyStatus}>
                    {scan.success ? 'Succès' : 'Échec'}
                  </Text>
                </View>
                <Text style={styles.historyTime}>
                  {formatScanTime(scan.scanned_at)}
                </Text>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Instructions */}
      <Card variant="outlined" style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons
            name="information-circle-outline"
            size={24}
            color={Colors.primary}
          />
          <Text style={styles.infoTitle}>Comment scanner ?</Text>
        </View>
        <Text style={styles.infoText}>
          {'\u2022'} Si vous êtes le détenteur du lot, vous accédez directement
          à sa fiche{'\n'}
          {'\u2022'} Sinon, le flux de réception s&apos;ouvre automatiquement
          {'\n'}
          {'\u2022'} Assurez-vous d&apos;avoir un bon éclairage{'\n'}
          {'\u2022'} Tenez votre appareil stable{'\n'}
          {'\u2022'} Centrez le code QR dans le cadre{'\n'}
          {'\u2022'} Le scan sera automatique dès détection
        </Text>
      </Card>

      {/* Manual Entry Modal */}
      <Modal
        visible={manualEntryVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setManualEntryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Saisie Manuelle</Text>
            <Text style={styles.modalSubtitle}>
              Entrez le numéro de lot ou scannez le code QR
            </Text>

            <TextInput
              style={styles.modalInput}
              value={manualBatchNumber}
              onChangeText={setManualBatchNumber}
              placeholder="Ex: LOT-2024-001"
              placeholderTextColor={Colors.text.tertiary}
              autoCapitalize="characters"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setManualEntryVisible(false);
                  setManualBatchNumber('');
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalSubmitButton,
                  !manualBatchNumber.trim() &&
                    styles.modalSubmitButtonDisabled,
                ]}
                onPress={handleManualSubmit}
                disabled={!manualBatchNumber.trim()}
              >
                <Text style={styles.modalSubmitText}>Rechercher</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.surface,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanInstruction: {
    ...Typography.body,
    color: Colors.surface,
    textAlign: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  scanUserInfo: {
    ...Typography.caption,
    color: Colors.surface,
    textAlign: 'center',
    marginTop: Spacing.sm,
    opacity: 0.8,
  },
  cancelScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    minHeight: 48,
    minWidth: 200,
  },
  cancelScanText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.primary,
    fontSize: 16,
  },
  scanCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  scanIconContainer: {
    marginBottom: Spacing.lg,
  },
  scanTitle: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  scanSubtitle: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.text.secondary,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  userBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  actions: {
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  scanButton: {
    marginBottom: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  historyCard: {
    marginBottom: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  successIcon: {
    backgroundColor: Colors.success + '20',
  },
  errorIcon: {
    backgroundColor: Colors.error + '20',
  },
  historyContent: {
    flex: 1,
  },
  historyLabel: {
    ...Typography.body,
    fontWeight: '600',
  },
  historyProduct: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  historyStatus: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  historyTime: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  infoCard: {
    marginBottom: Spacing.xl,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    ...Typography.body,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalSubmitButton: {
    backgroundColor: Colors.primary,
  },
  modalSubmitButtonDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.surface,
  },
  // Skeleton loading styles
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  skeletonSpinner: {
    marginBottom: Spacing.md,
  },
  skeletonTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  skeletonLines: {
    width: '100%',
    gap: Spacing.sm,
  },
  skeletonLine: {
    height: 12,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.border,
  },
  skeletonLineLong: {
    width: '100%',
  },
  skeletonLineMedium: {
    width: '75%',
  },
  skeletonLineShort: {
    width: '50%',
  },
});
