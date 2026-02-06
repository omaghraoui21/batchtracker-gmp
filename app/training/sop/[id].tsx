import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { generateText } from '@fastshot/ai';
import * as Haptics from 'expo-haptics';

type SOP = Database['public']['Tables']['sops']['Row'];
type SOPSummary = Database['public']['Tables']['sop_summaries']['Row'];

export default function SOPDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [sop, setSOP] = useState<SOP | null>(null);
  const [summary, setSummary] = useState<SOPSummary | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  useEffect(() => {
    fetchSOPDetails();
  }, [id]);

  const fetchSOPDetails = async () => {
    try {
      setLoading(true);

      // Fetch SOP
      const { data: sopData, error: sopError } = await supabase
        .from('sops')
        .select('*')
        .eq('id', id)
        .single();

      if (sopError) throw sopError;

      setSOP(sopData);

      // Fetch existing summary
      const { data: summaryData } = await supabase
        .from('sop_summaries')
        .select('*')
        .eq('sop_id', id)
        .eq('summary_type', 'field_memo')
        .eq('status', 'approved')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (summaryData) {
        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Error fetching SOP details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du SOP');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!sop || !sop.content) {
      Alert.alert('Erreur', 'Le contenu du SOP est manquant');
      return;
    }

    try {
      setGeneratingSummary(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Use Newell AI to generate summary
      const prompt = `Tu es un expert en formation pharmaceutique GMP. Crée un mémo de terrain concis pour ce SOP. Le mémo doit être court (max 200 mots), facile à comprendre et contenir les points clés essentiels.

SOP: ${sop.name}
Code: ${sop.code}

Contenu:
${sop.content}

Fournis un mémo de terrain professionnel en français, formaté avec des bullet points pour une lecture rapide sur le terrain.`;

      const aiResponse = await generateText({ prompt });

      // Save summary to database
      const { data: newSummary, error: summaryError } = await supabase
        .from('sop_summaries')
        .insert({
          sop_id: sop.id,
          summary_type: 'field_memo',
          title: `Mémo de Terrain - ${sop.code}`,
          content: aiResponse,
          generated_by: 'ai',
          status: 'approved',
        })
        .select()
        .single();

      if (summaryError) throw summaryError;

      setSummary(newSummary);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Succès', 'Mémo de terrain généré avec succès');
    } catch (error) {
      console.error('Error generating summary:', error);
      Alert.alert('Erreur', 'Impossible de générer le résumé');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!sop || !sop.content) {
      Alert.alert('Erreur', 'Le contenu du SOP est manquant');
      return;
    }

    try {
      setGeneratingQuiz(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Use Newell AI to generate quiz questions
      const prompt = `Tu es un expert en formation pharmaceutique GMP. Génère 3 questions de quiz pour évaluer la compréhension de ce SOP.

SOP: ${sop.name}
Code: ${sop.code}

Contenu:
${sop.content}

Pour chaque question, fournis:
- La question (claire et précise)
- La réponse correcte
- 3 réponses incorrectes plausibles
- Une explication

Format JSON:
{
  "questions": [
    {
      "question": "...",
      "correct_answer": "...",
      "wrong_answer_1": "...",
      "wrong_answer_2": "...",
      "wrong_answer_3": "...",
      "explanation": "..."
    }
  ]
}`;

      const aiResponse = await generateText({ prompt });

      // Parse AI response
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid JSON response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Save questions to database
        const questionsToInsert = parsed.questions.map((q: any) => ({
          sop_id: sop.id,
          question: q.question,
          correct_answer: q.correct_answer,
          wrong_answer_1: q.wrong_answer_1,
          wrong_answer_2: q.wrong_answer_2,
          wrong_answer_3: q.wrong_answer_3,
          explanation: q.explanation,
          difficulty: 'medium',
          created_by: 'ai',
        }));

        const { error: quizError } = await supabase
          .from('training_quizzes')
          .insert(questionsToInsert);

        if (quizError) throw quizError;

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Succès', `${parsed.questions.length} questions générées avec succès`);
      } catch (parseError) {
        console.error('Error parsing quiz response:', parseError);
        Alert.alert('Erreur', 'Impossible de traiter la réponse IA');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      Alert.alert('Erreur', 'Impossible de générer le quiz');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!sop) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
        <Text style={styles.errorText}>SOP introuvable</Text>
      </View>
    );
  }

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'Production':
        return Colors.primary;
      case 'Qualité':
        return Colors.success;
      case 'Équipement':
        return Colors.warning;
      case 'Environnement':
        return '#00A86B';
      default:
        return Colors.text.tertiary;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: sop.code,
          headerBackTitle: 'Retour',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={[styles.sopIcon, { backgroundColor: getCategoryColor(sop.category) + '15' }]}>
              <Ionicons name="document-text" size={32} color={getCategoryColor(sop.category)} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.sopCode}>{sop.code}</Text>
              <Text style={styles.sopName}>{sop.name}</Text>
            </View>
          </View>

          {sop.description && <Text style={styles.sopDescription}>{sop.description}</Text>}

          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <Ionicons name="folder-outline" size={16} color={Colors.text.secondary} />
              <Text style={styles.metadataText}>{sop.category}</Text>
            </View>
            <View style={styles.metadataItem}>
              <Ionicons name="code-outline" size={16} color={Colors.text.secondary} />
              <Text style={styles.metadataText}>Version {sop.version}</Text>
            </View>
            <View style={styles.metadataItem}>
              <Ionicons name="time-outline" size={16} color={Colors.text.secondary} />
              <Text style={styles.metadataText}>Validité: {sop.validity_months} mois</Text>
            </View>
          </View>
        </Card>

        {/* AI Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outils IA</Text>

          <TouchableOpacity
            style={[styles.aiButton, generatingSummary && styles.aiButtonLoading]}
            onPress={handleGenerateSummary}
            disabled={generatingSummary || generatingQuiz}
          >
            <View style={styles.aiButtonIcon}>
              <Ionicons
                name={generatingSummary ? 'hourglass-outline' : 'sparkles'}
                size={24}
                color={Colors.surface}
              />
            </View>
            <View style={styles.aiButtonContent}>
              <Text style={styles.aiButtonTitle}>
                {generatingSummary ? 'Génération en cours...' : 'Générer un Mémo de Terrain'}
              </Text>
              <Text style={styles.aiButtonSubtitle}>
                Résumé court pour consultation rapide
              </Text>
            </View>
            {!generatingSummary && (
              <Ionicons name="chevron-forward" size={20} color={Colors.surface} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aiButton, styles.aiButtonSecondary, generatingQuiz && styles.aiButtonLoading]}
            onPress={handleGenerateQuiz}
            disabled={generatingSummary || generatingQuiz}
          >
            <View style={[styles.aiButtonIcon, { backgroundColor: Colors.success }]}>
              <Ionicons
                name={generatingQuiz ? 'hourglass-outline' : 'school'}
                size={24}
                color={Colors.surface}
              />
            </View>
            <View style={styles.aiButtonContent}>
              <Text style={styles.aiButtonTitle}>
                {generatingQuiz ? 'Génération en cours...' : 'Générer un Quiz'}
              </Text>
              <Text style={styles.aiButtonSubtitle}>
                Questions pour valider la compréhension
              </Text>
            </View>
            {!generatingQuiz && (
              <Ionicons name="chevron-forward" size={20} color={Colors.surface} />
            )}
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mémo de Terrain</Text>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="sparkles" size={20} color="#D4AF37" />
                <Text style={styles.summaryBadge}>Généré par IA</Text>
              </View>
              <Text style={styles.summaryContent}>{summary.content}</Text>
            </Card>
          </View>
        )}

        {/* Content */}
        {sop.content && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contenu du SOP</Text>
            <Card style={styles.contentCard}>
              <Text style={styles.contentText}>{sop.content}</Text>
            </Card>
          </View>
        )}
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
    paddingBottom: Spacing.xxl * 2,
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
  },
  headerCard: {
    marginBottom: Spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sopIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  sopCode: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  sopName: {
    ...Typography.h3,
  },
  sopDescription: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  aiButtonSecondary: {
    backgroundColor: Colors.success,
  },
  aiButtonLoading: {
    opacity: 0.7,
  },
  aiButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  aiButtonContent: {
    flex: 1,
  },
  aiButtonTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.surface,
    marginBottom: 2,
  },
  aiButtonSubtitle: {
    ...Typography.caption,
    color: Colors.surface,
    opacity: 0.9,
  },
  summaryCard: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  summaryBadge: {
    ...Typography.caption,
    color: '#D4AF37',
    fontWeight: '700',
  },
  summaryContent: {
    ...Typography.body,
    lineHeight: 22,
  },
  contentCard: {
    backgroundColor: Colors.surface,
  },
  contentText: {
    ...Typography.body,
    lineHeight: 22,
  },
});
