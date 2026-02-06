import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { Card } from './Card';

interface AIRiskPredictionProps {
  batchData: {
    batchNumber: string;
    productName: string;
    currentStep: string;
    elapsedTime: number;
    previousDeviations: number;
    stepHistory: { step: string; duration: number }[];
  };
  onPredictionComplete?: (prediction: string, riskLevel: 'low' | 'medium' | 'high') => void;
}

export function AIRiskPrediction({ batchData, onPredictionComplete }: AIRiskPredictionProps) {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | null>(null);
  const { generateText, isLoading } = useTextGeneration();

  const analyzeBatchRisk = async () => {
    try {
      const stepHistoryText = batchData.stepHistory
        .map((s) => `${s.step}: ${s.duration.toFixed(1)}h`)
        .join(', ');

      const prompt = `Tu es un expert en analyse de risques pour la production pharmaceutique GMP. Analyse le lot suivant et détermine son niveau de risque de déviation critique:

Lot: #${batchData.batchNumber}
Produit: ${batchData.productName}
Étape actuelle: ${batchData.currentStep}
Temps écoulé: ${batchData.elapsedTime.toFixed(1)}h
Déviations précédentes: ${batchData.previousDeviations}
Historique des étapes: ${stepHistoryText || 'Aucun'}

Compare ce lot avec des patterns typiques de lots qui ont eu des déviations critiques par le passé.

Réponds UNIQUEMENT dans ce format:
NIVEAU_RISQUE: [FAIBLE/MOYEN/ÉLEVÉ]
ANALYSE: [2-3 phrases concises expliquant le niveau de risque et les facteurs clés]
RECOMMANDATION: [1 action concrète à prendre]`;

      const response = await generateText(prompt);

      if (response) {
        // Parse the response
        const riskMatch = response.match(/NIVEAU_RISQUE:\s*(FAIBLE|MOYEN|ÉLEVÉ)/i);
        const analysisMatch = response.match(/ANALYSE:\s*(.+?)(?=RECOMMANDATION:|$)/s);
        const recommendationMatch = response.match(/RECOMMANDATION:\s*(.+)$/s);

        let detectedRiskLevel: 'low' | 'medium' | 'high' = 'low';
        if (riskMatch) {
          const level = riskMatch[1].toUpperCase();
          detectedRiskLevel = level === 'ÉLEVÉ' ? 'high' : level === 'MOYEN' ? 'medium' : 'low';
        }

        const analysisText = analysisMatch ? analysisMatch[1].trim() : '';
        const recommendationText = recommendationMatch ? recommendationMatch[1].trim() : '';

        const fullPrediction = `${analysisText}\n\n📋 Recommandation: ${recommendationText}`;

        setPrediction(fullPrediction);
        setRiskLevel(detectedRiskLevel);

        if (onPredictionComplete) {
          onPredictionComplete(fullPrediction, detectedRiskLevel);
        }
      }
    } catch (error) {
      console.error('Error analyzing batch risk:', error);
      setPrediction("❌ Erreur lors de l'analyse de risque. Veuillez réessayer.");
      setRiskLevel(null);
    }
  };

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'high':
        return Colors.error;
      case 'medium':
        return Colors.warning;
      case 'low':
        return Colors.success;
      default:
        return Colors.text.secondary;
    }
  };

  const getRiskLabel = () => {
    switch (riskLevel) {
      case 'high':
        return 'Risque Élevé';
      case 'medium':
        return 'Risque Moyen';
      case 'low':
        return 'Risque Faible';
      default:
        return 'Non évalué';
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'high':
        return 'alert-circle';
      case 'medium':
        return 'warning';
      case 'low':
        return 'checkmark-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="analytics-outline" size={24} color={Colors.primary} />
        <Text style={styles.title}>Prédiction de Risque IA</Text>
      </View>

      {!prediction && !isLoading && (
        <TouchableOpacity style={styles.analyzeButton} onPress={analyzeBatchRisk}>
          <Ionicons name="sparkles-outline" size={20} color={Colors.surface} />
          <Text style={styles.analyzeButtonText}>Analyser le Risque</Text>
        </TouchableOpacity>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Analyse en cours...</Text>
          <Text style={styles.loadingSubtext}>L&apos;IA compare avec les patterns historiques</Text>
        </View>
      )}

      {prediction && riskLevel && (
        <View style={styles.resultContainer}>
          <View style={[styles.riskBadge, { backgroundColor: getRiskColor() + '20' }]}>
            <Ionicons name={getRiskIcon()} size={24} color={getRiskColor()} />
            <Text style={[styles.riskLabel, { color: getRiskColor() }]}>
              {getRiskLabel()}
            </Text>
          </View>

          <Text style={styles.predictionText}>{prediction}</Text>

          <TouchableOpacity
            style={styles.reanalyzeButton}
            onPress={() => {
              setPrediction(null);
              setRiskLevel(null);
            }}
          >
            <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
            <Text style={styles.reanalyzeButtonText}>Réanalyser</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    fontSize: 18,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  analyzeButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  loadingSubtext: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  resultContainer: {
    gap: Spacing.md,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  riskLabel: {
    ...Typography.h3,
    fontSize: 18,
    fontWeight: '700',
  },
  predictionText: {
    ...Typography.body,
    lineHeight: 24,
    color: Colors.text.primary,
  },
  reanalyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
  },
  reanalyzeButtonText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
});
