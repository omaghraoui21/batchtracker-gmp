import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { generateeBMRHTML, lockBatch } from '@/lib/ebmrGenerator';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

export default function EBMRViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);

  const loadeBMR = async () => {
    try {
      setLoading(true);

      // Fetch batch info
      const { data: batchData } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .single();

      setBatch(batchData);

      // Generate eBMR HTML
      const generatedHtml = await generateeBMRHTML(id);
      setHtml(generatedHtml);

      // Record PDF generation
      await supabase.from('ebmr_pdf_history').insert({
        batch_id: id,
        generated_by: 'admin',
        notes: 'Visualisation eBMR',
      });
    } catch (error) {
      console.error('Error loading eBMR:', error);
      Alert.alert('Erreur', 'Impossible de générer le dossier de lot');
    } finally {
      setLoading(false);
    }
  };

  const checkBatchLock = async () => {
    try {
      const { data } = await supabase
        .from('batch_locks')
        .select('*')
        .eq('batch_id', id)
        .single();

      setIsLocked(data?.is_locked || false);
    } catch {
      // Lock doesn't exist yet
      setIsLocked(false);
    }
  };

  useEffect(() => {
    loadeBMR();
    checkBatchLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleLockBatch = () => {
    Alert.alert(
      'Verrouiller le Lot',
      'Le verrouillage rendra le lot et toutes ses données en lecture seule. Cette action est irréversible. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Verrouiller',
          style: 'destructive',
          onPress: async () => {
            try {
              await lockBatch(id, 'admin', 'PDF généré et validé pour libération');
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Succès', 'Lot verrouillé avec succès');
              setIsLocked(true);
            } catch (error) {
              console.error('Error locking batch:', error);
              Alert.alert('Erreur', 'Impossible de verrouiller le lot');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Génération du dossier de lot...</Text>
        <Text style={styles.loadingSubtext}>
          Analyse IA en cours et consolidation des données
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `eBMR - Lot ${batch?.batch_number || ''}`,
          headerBackTitle: 'Retour',
        }}
      />
      <View style={styles.container}>
        {/* Actions Bar */}
        <View style={styles.actionsBar}>
          <View style={styles.actionsLeft}>
            <Ionicons name="document-text" size={24} color={Colors.primary} />
            <View>
              <Text style={styles.actionTitle}>Dossier de Lot Électronique</Text>
              <Text style={styles.actionSubtitle}>Conforme 21 CFR Part 11</Text>
            </View>
          </View>
          <View style={styles.actionsRight}>
            {!isLocked ? (
              <TouchableOpacity style={styles.lockButton} onPress={handleLockBatch}>
                <Ionicons name="lock-closed" size={18} color={Colors.surface} />
                <Text style={styles.lockButtonText}>Verrouiller</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.lockedBadge}>
                <Ionicons name="lock-closed" size={16} color={Colors.error} />
                <Text style={styles.lockedText}>Verrouillé</Text>
              </View>
            )}
          </View>
        </View>

        {/* PDF Preview */}
        <WebView
          style={styles.webview}
          source={{ html }}
          scalesPageToFit
          showsVerticalScrollIndicator
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.h3,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  actionTitle: {
    ...Typography.body,
    fontWeight: '700',
  },
  actionSubtitle: {
    ...Typography.small,
    color: Colors.text.secondary,
  },
  actionsRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  lockButtonText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '700',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.error + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  lockedText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '700',
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
