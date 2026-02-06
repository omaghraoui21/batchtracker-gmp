import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import type { Database } from '@/lib/database.types';

type Batch = Database['public']['Tables']['batches']['Row'];

export default function BatchLabelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<any>(null);

  useEffect(() => {
    fetchBatchDetails();
  }, [id]);

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setBatch(data);
    } catch (error) {
      console.error('Error fetching batch:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du lot');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyQRData = async () => {
    if (!batch?.qr_code_data) return;

    await Clipboard.setStringAsync(batch.qr_code_data);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copié', 'Code QR copié dans le presse-papier');
  };

  const handleShare = async () => {
    if (!batch) return;

    try {
      await Share.share({
        message: `Lot #${batch.batch_number}\nProduit: ${batch.product_name}\nCode QR: ${batch.qr_code_data}`,
        title: `Label - Lot #${batch.batch_number}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handlePrint = () => {
    // In a real implementation, this would connect to a thermal printer
    // For now, we'll show an alert
    Alert.alert(
      'Imprimer le Label',
      'Cette fonctionnalité se connectera à une imprimante d\'étiquettes (Zebra/Brother) pour imprimer le label physique.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Simuler l\'impression',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Succès', 'Label envoyé à l\'imprimante');
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!batch) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
        <Text style={styles.errorText}>Lot introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Label de Traçabilité',
          headerBackTitle: 'Retour',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Virtual Label Preview */}
        <Card style={styles.labelCard}>
          <View style={styles.labelHeader}>
            <Text style={styles.labelTitle}>LABEL DE TRAÇABILITÉ</Text>
            <Text style={styles.labelSubtitle}>GMP Compliant Batch Label</Text>
          </View>

          <View style={styles.labelDivider} />

          {/* QR Code */}
          <View style={styles.qrContainer}>
            {batch.qr_code_data ? (
              <QRCode
                value={batch.qr_code_data}
                size={200}
                backgroundColor={Colors.surface}
                color={Colors.text.primary}
                getRef={(ref) => (qrRef.current = ref)}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={120} color={Colors.text.tertiary} />
                <Text style={styles.qrPlaceholderText}>QR Code non généré</Text>
              </View>
            )}
          </View>

          <View style={styles.labelDivider} />

          {/* Batch Information */}
          <View style={styles.labelInfo}>
            <View style={styles.labelInfoRow}>
              <Text style={styles.labelInfoLabel}>Numéro de Lot:</Text>
              <Text style={styles.labelInfoValue}>{batch.batch_number}</Text>
            </View>

            <View style={styles.labelInfoRow}>
              <Text style={styles.labelInfoLabel}>Produit:</Text>
              <Text style={styles.labelInfoValue}>{batch.product_name}</Text>
            </View>

            {batch.manufacturing_date && (
              <View style={styles.labelInfoRow}>
                <Text style={styles.labelInfoLabel}>Date de Fabrication:</Text>
                <Text style={styles.labelInfoValue}>{formatDate(batch.manufacturing_date)}</Text>
              </View>
            )}

            {batch.expiry_date && (
              <View style={styles.labelInfoRow}>
                <Text style={styles.labelInfoLabel}>Date d&apos;Expiration:</Text>
                <Text style={styles.labelInfoValue}>{formatDate(batch.expiry_date)}</Text>
              </View>
            )}

            <View style={styles.labelInfoRow}>
              <Text style={styles.labelInfoLabel}>Date de Création:</Text>
              <Text style={styles.labelInfoValue}>{formatDate(batch.created_at)}</Text>
            </View>
          </View>

          {batch.qr_code_data && (
            <View style={styles.qrDataContainer}>
              <Text style={styles.qrDataLabel}>Code QR:</Text>
              <TouchableOpacity
                style={styles.qrDataBox}
                onPress={handleCopyQRData}
              >
                <Text style={styles.qrDataText} numberOfLines={1}>
                  {batch.qr_code_data}
                </Text>
                <Ionicons name="copy-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Imprimer le Label"
            onPress={handlePrint}
            icon={<Ionicons name="print-outline" size={20} color={Colors.surface} />}
            style={styles.actionButton}
          />

          <Button
            title="Partager"
            onPress={handleShare}
            variant="outline"
            icon={<Ionicons name="share-outline" size={20} color={Colors.primary} />}
            style={styles.actionButton}
          />
        </View>

        {/* Instructions */}
        <Card variant="outlined" style={styles.instructionsCard}>
          <View style={styles.instructionsHeader}>
            <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
            <Text style={styles.instructionsTitle}>Instructions d&apos;utilisation</Text>
          </View>

          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                <Text style={styles.instructionBold}>Imprimer:</Text> Utilisez une imprimante
                thermique (Zebra/Brother) pour générer le label physique
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                <Text style={styles.instructionBold}>Apposer:</Text> Collez le label sur le
                container du lot pour assurer la traçabilité
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                <Text style={styles.instructionBold}>Scanner:</Text> Utilisez l&apos;onglet &quot;Scanner&quot;
                pour scanner le QR code et accéder aux détails du lot
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>4</Text>
              </View>
              <Text style={styles.instructionText}>
                <Text style={styles.instructionBold}>Valider:</Text> Chaque étape du workflow
                peut être validée en scannant le label
              </Text>
            </View>
          </View>
        </Card>

        {/* Printer Compatibility */}
        <Card variant="outlined" style={styles.compatibilityCard}>
          <Text style={styles.compatibilityTitle}>Imprimantes Compatibles</Text>
          <View style={styles.printerList}>
            <View style={styles.printerItem}>
              <Ionicons name="print" size={16} color={Colors.success} />
              <Text style={styles.printerText}>Zebra ZD410 / ZD420</Text>
            </View>
            <View style={styles.printerItem}>
              <Ionicons name="print" size={16} color={Colors.success} />
              <Text style={styles.printerText}>Brother QL-820NWB</Text>
            </View>
            <View style={styles.printerItem}>
              <Ionicons name="print" size={16} color={Colors.success} />
              <Text style={styles.printerText}>Dymo LabelWriter 450</Text>
            </View>
          </View>
          <Text style={styles.compatibilityNote}>
            Format recommandé: 4&quot; x 2&quot; (102mm x 51mm)
          </Text>
        </Card>

        {/* Navigation to Batch */}
        <Button
          title="Voir les Détails du Lot"
          onPress={() => router.push(`/batch/${batch.id}`)}
          variant="outline"
          icon={<Ionicons name="document-text-outline" size={20} color={Colors.primary} />}
          style={styles.viewBatchButton}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  errorText: {
    ...Typography.h3,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  labelCard: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  labelHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  labelTitle: {
    ...Typography.h3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  labelSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  labelDivider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  qrPlaceholder: {
    alignItems: 'center',
  },
  qrPlaceholderText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  labelInfo: {
    width: '100%',
    gap: Spacing.sm,
  },
  labelInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelInfoLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  labelInfoValue: {
    ...Typography.caption,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  qrDataContainer: {
    width: '100%',
    marginTop: Spacing.md,
  },
  qrDataLabel: {
    ...Typography.small,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  qrDataBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrDataText: {
    ...Typography.small,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.text.primary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    width: '100%',
  },
  instructionsCard: {
    marginBottom: Spacing.lg,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  instructionsTitle: {
    ...Typography.body,
    fontWeight: '700',
  },
  instructionsList: {
    gap: Spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    ...Typography.small,
    color: Colors.surface,
    fontWeight: '700',
  },
  instructionText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  instructionBold: {
    fontWeight: '700',
    color: Colors.text.primary,
  },
  compatibilityCard: {
    marginBottom: Spacing.lg,
  },
  compatibilityTitle: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  printerList: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  printerText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  compatibilityNote: {
    ...Typography.small,
    color: Colors.primary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  viewBatchButton: {
    width: '100%',
  },
});
