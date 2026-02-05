import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

interface ScanHistory {
  id: string;
  type: string;
  label: string;
  status: 'success' | 'error';
  timestamp: string;
}

export default function ScannerScreen() {
  const [scanHistory] = useState<ScanHistory[]>([
    {
      id: '1',
      type: 'batch',
      label: 'Lot #12345',
      status: 'success',
      timestamp: 'Il y a 2 minutes',
    },
    {
      id: '2',
      type: 'stage',
      label: 'Étape Production',
      status: 'success',
      timestamp: 'Il y a 5 minutes',
    },
    {
      id: '3',
      type: 'stage',
      label: 'Étape Production',
      status: 'success',
      timestamp: 'Il y a 8 minutes',
    },
  ]);

  const handleScanQR = () => {
    Alert.alert(
      'Scanner QR',
      'La caméra s\'ouvrira ici pour scanner un code QR',
      [{ text: 'OK' }]
    );
    // TODO: Implémenter le scanner QR avec expo-camera ou expo-barcode-scanner
  };

  const handleManualEntry = () => {
    Alert.alert(
      'Saisie Manuelle',
      'Un formulaire pour saisir manuellement un numéro de lot',
      [{ text: 'OK' }]
    );
  };

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
          onPress={handleScanQR}
          size="large"
          style={styles.scanButton}
        />
        <Button
          title="Saisie Manuelle"
          onPress={handleManualEntry}
          variant="outline"
          size="large"
        />
      </View>

      {/* Historique des scans */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historique des Scans</Text>

        {scanHistory.map((scan) => (
          <Card key={scan.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View
                style={[
                  styles.historyIcon,
                  scan.status === 'success'
                    ? styles.successIcon
                    : styles.errorIcon,
                ]}
              >
                <Ionicons
                  name={
                    scan.status === 'success'
                      ? 'checkmark-circle'
                      : 'close-circle'
                  }
                  size={20}
                  color={scan.status === 'success' ? Colors.success : Colors.error}
                />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyLabel}>Scan: {scan.label}</Text>
                <Text style={styles.historyStatus}>
                  {scan.status === 'success' ? '(Succès)' : '(Échec)'}
                </Text>
              </View>
              <Text style={styles.historyTime}>{scan.timestamp}</Text>
            </View>
          </Card>
        ))}
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
          • Attendez la confirmation de scan
        </Text>
      </Card>
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
  scanCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  scanIconContainer: {
    marginBottom: Spacing.lg,
  },
  scanFrame: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
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
});
