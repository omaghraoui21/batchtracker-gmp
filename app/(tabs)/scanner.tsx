import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
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

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [manualBatchNumber, setManualBatchNumber] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchScanHistory();
  }, []);

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
      setScanHistory(data as ScanHistory[] || []);
    } catch (error) {
      console.error('Error fetching scan history:', error);
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!data) return;

    try {
      setScanning(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Parse QR code data
      // Expected format: BATCH:{batch_id} or STEP:{batch_id}:{step_instance_id}
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
      Alert.alert('Erreur', 'Impossible de traiter le code QR scanné');
    }
  };

  const handleBatchScan = async (batchId: string) => {
    try {
      setLoading(true);

      // Get current user from auth (mock for now)
      const currentUserId = 'user-123'; // In production, get from auth context

      // Verify batch exists and get ownership info
      const { data: batch, error } = await supabase
        .from('batches')
        .select('id, batch_number, product_name, current_owner_id, current_owner_name')
        .eq('id', batchId)
        .single();

      if (error || !batch) {
        Alert.alert('Erreur', 'Lot introuvable');
        return;
      }

      // Record scan in history
      await supabase.from('scan_history').insert({
        scan_type: 'batch',
        batch_id: batch.id,
        success: true,
        notes: `Scan du lot #${batch.batch_number}`,
      });

      await fetchScanHistory();

      // CONTEXTUAL SCANNER LOGIC: Check ownership
      const isOwner = batch.current_owner_id === currentUserId;

      if (!isOwner) {
        // RECEPTION MODE: User is not the owner - navigate to Batch Reception screen
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push(`/batch/receive/${batch.id}`);
      } else {
        // MANAGEMENT MODE: User is the owner - navigate to Batch Details (Deviations section)
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Votre Dossier',
          `Vous êtes le détenteur du lot #${batch.batch_number}\n${batch.product_name}`,
          [
            { text: 'OK' },
            {
              text: 'Gérer les Déviations',
              onPress: () => router.push(`/batch/${batch.id}?focus=deviations`),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error handling batch scan:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les informations du lot');
    } finally {
      setLoading(false);
    }
  };

  const handleStepScan = async (batchId: string, stepInstanceId: string) => {
    try {
      setLoading(true);

      // Verify step exists
      const { data: step, error } = await supabase
        .from('step_instances')
        .select(`
          *,
          batch:batches(id, batch_number, product_name),
          step_definition:step_definitions(name)
        `)
        .eq('id', stepInstanceId)
        .eq('batch_id', batchId)
        .single();

      if (error || !step) {
        Alert.alert('Erreur', 'Étape introuvable');
        return;
      }

      // Record scan in history
      await supabase.from('scan_history').insert({
        scan_type: 'step',
        batch_id: batchId,
        step_instance_id: stepInstanceId,
        success: true,
        notes: `Scan de l'étape ${step.step_definition?.name}`,
      });

      await fetchScanHistory();

      Alert.alert(
        'Étape Scannée',
        `Lot #${step.batch?.batch_number}\nÉtape: ${step.step_definition?.name}`,
        [
          { text: 'OK' },
          {
            text: 'Ouvrir le Lot',
            onPress: () => router.push(`/batch/${batchId}`),
          },
        ]
      );
    } catch (error) {
      console.error('Error handling step scan:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les informations de l\'étape');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchNumberScan = async (batchNumber: string) => {
    try {
      setLoading(true);

      // Search for batch by number
      const { data: batch, error } = await supabase
        .from('batches')
        .select('id, batch_number, product_name')
        .eq('batch_number', batchNumber)
        .single();

      if (error || !batch) {
        Alert.alert('Erreur', `Aucun lot trouvé avec le numéro: ${batchNumber}`);

        // Record failed scan
        await supabase.from('scan_history').insert({
          scan_type: 'batch',
          success: false,
          notes: `Échec: numéro de lot ${batchNumber} introuvable`,
        });

        await fetchScanHistory();
        return;
      }

      await handleBatchScan(batch.id);
    } catch (error) {
      console.error('Error handling batch number scan:', error);
      Alert.alert('Erreur', 'Impossible de rechercher le lot');
    } finally {
      setLoading(false);
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
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Permission Requise',
          'L\'accès à la caméra est nécessaire pour scanner les codes QR'
        );
        return;
      }
    }
    setScanning(true);
  };

  const formatScanTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString('fr-FR');
  };

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
            <TouchableOpacity
              style={styles.cancelScanButton}
              onPress={() => setScanning(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.cancelScanText}>Fermer le Scanner</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Zone de scan */}
      <Card style={styles.scanCard}>
        <View style={styles.scanIconContainer}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <Ionicons name="qr-code-outline" size={120} color={Colors.primary} />
          </View>
        </View>
        <Text style={styles.scanTitle}>Scanner un Code QR</Text>
        <Text style={styles.scanSubtitle}>
          Positionnez le code QR dans le cadre pour le scanner
        </Text>
      </Card>

      {/* Boutons d'action */}
      <View style={styles.actions}>
        <Button
          title="Scanner un Code QR"
          onPress={handleStartScanning}
          size="large"
          style={styles.scanButton}
          disabled={loading}
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
            <Ionicons name="scan-outline" size={48} color={Colors.text.tertiary} />
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
                    name={scan.success ? 'checkmark-circle' : 'close-circle'}
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
                    <Text style={styles.historyProduct}>{scan.batch.product_name}</Text>
                  )}
                  <Text style={styles.historyStatus}>
                    {scan.success ? 'Succès' : 'Échec'}
                  </Text>
                </View>
                <Text style={styles.historyTime}>{formatScanTime(scan.scanned_at)}</Text>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Instructions */}
      <Card variant="outlined" style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.infoTitle}>Comment scanner ?</Text>
        </View>
        <Text style={styles.infoText}>
          • Assurez-vous d&apos;avoir un bon éclairage{'\n'}
          • Tenez votre appareil stable{'\n'}
          • Centrez le code QR dans le cadre{'\n'}
          • Le scan sera automatique dès détection
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
                  !manualBatchNumber.trim() && styles.modalSubmitButtonDisabled,
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
});
