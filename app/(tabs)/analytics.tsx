import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { Card } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeviationAnalyticsWidget } from '@/components/DeviationAnalyticsWidget';

type TimePeriod = 'day' | 'week' | 'month' | 'quarter';
type AnalyticsTab = 'executive' | 'sla' | 'quality';

interface ExecutiveMetrics {
  averageLatency: number;
  complianceRate: number;
  productionVolume: number;
  totalDeviations: number;
  criticalDeviations: number;
  majorDeviations: number;
  minorDeviations: number;
  capaAverageResolutionTime: number;
}

interface SLAMetrics {
  bottlenecks: { step: string; avgTime: number }[];
  slaPerformance: { onTime: number; overdue: number };
  atRiskBatches: { id: string; batchNumber: string; riskLevel: string }[];
}

interface QualityMetrics {
  deviationsBySeverity: { severity: string; count: number }[];
  deviationsByStep: { step: string; count: number }[];
  recurringIssues: { issue: string; occurrences: number }[];
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [selectedTab, setSelectedTab] = useState<AnalyticsTab>('executive');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  // Newell AI integration
  const { generateText, isLoading: generatingInsights, error: aiError } = useTextGeneration();

  const [executiveMetrics, setExecutiveMetrics] = useState<ExecutiveMetrics>({
    averageLatency: 0,
    complianceRate: 0,
    productionVolume: 0,
    totalDeviations: 0,
    criticalDeviations: 0,
    majorDeviations: 0,
    minorDeviations: 0,
    capaAverageResolutionTime: 0,
  });

  const [slaMetrics, setSlaMetrics] = useState<SLAMetrics>({
    bottlenecks: [],
    slaPerformance: { onTime: 0, overdue: 0 },
    atRiskBatches: [],
  });

  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    deviationsBySeverity: [],
    deviationsByStep: [],
    recurringIssues: [],
  });

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  useEffect(() => {
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDateRange = (period: TimePeriod) => {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case 'day':
        start.setDate(now.getDate() - 1);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
    }

    return { start: start.toISOString(), end: now.toISOString() };
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange(selectedPeriod);

      // Fetch batches for the period
      const { data: batches, error: batchesError } = await supabase
        .from('batches')
        .select('*, step_instances(*)')
        .gte('created_at', start)
        .lte('created_at', end);

      if (batchesError) throw batchesError;

      // Fetch deviations
      const { data: deviations, error: deviationsError } = await supabase
        .from('deviations')
        .select('*, step_instances(step_definitions(name))')
        .gte('created_at', start)
        .lte('created_at', end);

      if (deviationsError) throw deviationsError;

      // Calculate executive metrics
      const productionVolume = batches?.length || 0;

      // Calculate average latency
      let totalLatencyHours = 0;
      let completedBatches = 0;

      batches?.forEach((batch: any) => {
        if (batch.completed_at && batch.created_at) {
          const latency =
            (new Date(batch.completed_at).getTime() - new Date(batch.created_at).getTime()) /
            (1000 * 60 * 60);
          totalLatencyHours += latency;
          completedBatches++;
        }
      });

      const averageLatency = completedBatches > 0 ? totalLatencyHours / completedBatches : 0;

      // Calculate compliance rate
      const totalBatches = productionVolume;
      const batchesWithCriticalDeviations = new Set(
        deviations
          ?.filter((d: any) => d.severity === 'critical' || d.severity === 'major')
          .map((d: any) => d.batch_id)
      ).size;

      const complianceRate =
        totalBatches > 0 ? ((totalBatches - batchesWithCriticalDeviations) / totalBatches) * 100 : 100;

      // Count deviations by severity
      const criticalDeviations = deviations?.filter((d: any) => d.severity === 'critical').length || 0;
      const majorDeviations = deviations?.filter((d: any) => d.severity === 'major').length || 0;
      const minorDeviations = deviations?.filter((d: any) => d.severity === 'minor').length || 0;

      // Calculate CAPA resolution time
      const resolvedDeviations = deviations?.filter((d: any) => d.resolved_at && d.created_at) || [];
      let totalResolutionHours = 0;

      resolvedDeviations.forEach((deviation: any) => {
        const resolutionTime =
          (new Date(deviation.resolved_at).getTime() - new Date(deviation.created_at).getTime()) /
          (1000 * 60 * 60);
        totalResolutionHours += resolutionTime;
      });

      const capaAverageResolutionTime =
        resolvedDeviations.length > 0 ? totalResolutionHours / resolvedDeviations.length : 0;

      setExecutiveMetrics({
        averageLatency: Math.round(averageLatency * 10) / 10,
        complianceRate: Math.round(complianceRate * 10) / 10,
        productionVolume,
        totalDeviations: deviations?.length || 0,
        criticalDeviations,
        majorDeviations,
        minorDeviations,
        capaAverageResolutionTime: Math.round(capaAverageResolutionTime * 10) / 10,
      });

      // Calculate SLA metrics
      await calculateSLAMetrics(batches);

      // Calculate quality metrics
      calculateQualityMetrics(deviations || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateSLAMetrics = async (batches: any[]) => {
    // Calculate bottlenecks by step
    const stepTimes: { [key: string]: { total: number; count: number } } = {};

    for (const batch of batches || []) {
      const { data: steps } = await supabase
        .from('step_instances')
        .select('*, step_definitions(name)')
        .eq('batch_id', batch.id)
        .not('completed_at', 'is', null)
        .not('started_at', 'is', null);

      steps?.forEach((step: any) => {
        const stepName = step.step_definitions?.name || 'Unknown';
        const duration =
          (new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / (1000 * 60 * 60);

        if (!stepTimes[stepName]) {
          stepTimes[stepName] = { total: 0, count: 0 };
        }
        stepTimes[stepName].total += duration;
        stepTimes[stepName].count++;
      });
    }

    const bottlenecks = Object.entries(stepTimes)
      .map(([step, data]) => ({
        step,
        avgTime: data.total / data.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    // Calculate SLA performance
    const { data: allSteps } = await supabase
      .from('step_instances')
      .select('is_overdue')
      .not('completed_at', 'is', null);

    const onTime = allSteps?.filter((s: any) => !s.is_overdue).length || 0;
    const overdue = allSteps?.filter((s: any) => s.is_overdue).length || 0;

    // Find at-risk batches
    const { data: atRiskData } = await supabase
      .from('batches')
      .select('id, batch_number, step_instances!inner(is_overdue, sla_deadline)')
      .eq('status', 'active')
      .eq('step_instances.is_overdue', true)
      .limit(5);

    const atRiskBatches =
      atRiskData?.map((batch: any) => ({
        id: batch.id,
        batchNumber: batch.batch_number,
        riskLevel: 'high',
      })) || [];

    setSlaMetrics({
      bottlenecks,
      slaPerformance: { onTime, overdue },
      atRiskBatches,
    });
  };

  const calculateQualityMetrics = (deviations: any[]) => {
    // Group by severity
    const severityCounts: { [key: string]: number } = {};
    deviations.forEach((d) => {
      severityCounts[d.severity] = (severityCounts[d.severity] || 0) + 1;
    });

    const deviationsBySeverity = Object.entries(severityCounts).map(([severity, count]) => ({
      severity,
      count,
    }));

    // Group by step
    const stepCounts: { [key: string]: number } = {};
    deviations.forEach((d) => {
      const stepName = d.step_instances?.step_definitions?.name || 'Inconnu';
      stepCounts[stepName] = (stepCounts[stepName] || 0) + 1;
    });

    const deviationsByStep = Object.entries(stepCounts)
      .map(([step, count]) => ({ step, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Identify recurring issues (by title similarity)
    const titleCounts: { [key: string]: number } = {};
    deviations.forEach((d) => {
      titleCounts[d.title] = (titleCounts[d.title] || 0) + 1;
    });

    const recurringIssues = Object.entries(titleCounts)
      .filter(([, count]) => count > 1)
      .map(([issue, occurrences]) => ({ issue, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 5);

    setQualityMetrics({
      deviationsBySeverity,
      deviationsByStep,
      recurringIssues,
    });
  };

  const generateAIInsights = async () => {
    try {
      // Prepare context data for AI
      const periodLabel = getPeriodLabel(selectedPeriod);
      const bottlenecksList = slaMetrics.bottlenecks
        .map((b) => `${b.step} (${b.avgTime.toFixed(1)}h)`)
        .join(', ');

      const prompt = `Tu es un expert en analyse de production pharmaceutique GMP. Analyse les données suivantes et fournis des insights stratégiques en français, sous forme de 3-4 points concis avec émojis:

Période: ${periodLabel}
Volume de production: ${executiveMetrics.productionVolume} lots
Latence moyenne: ${executiveMetrics.averageLatency}h
Taux de conformité: ${executiveMetrics.complianceRate}%

Déviations:
- Critiques: ${executiveMetrics.criticalDeviations}
- Majeures: ${executiveMetrics.majorDeviations}
- Mineures: ${executiveMetrics.minorDeviations}

Temps moyen de résolution CAPA: ${executiveMetrics.capaAverageResolutionTime}h

Performance SLA:
- À temps: ${slaMetrics.slaPerformance.onTime}
- En retard: ${slaMetrics.slaPerformance.overdue}
- Lots à risque: ${slaMetrics.atRiskBatches.length}

Principaux goulots d'étranglement: ${bottlenecksList || 'Aucun'}

Fournis des insights actionnables avec:
1. Points d'alerte (⚠️)
2. Points positifs (✅)
3. Recommandations stratégiques (📊)

Sois concis, précis et professionnel.`;

      const response = await generateText(prompt);

      if (response) {
        setAiInsights(response);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      setAiInsights(
        "❌ Erreur lors de la génération des insights. Vérifiez votre connexion et réessayez."
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData();
  };

  const getPeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case 'day':
        return 'Jour';
      case 'week':
        return 'Semaine';
      case 'month':
        return 'Mois';
      case 'quarter':
        return 'Trimestre';
    }
  };

  const renderPeriodFilter = () => (
    <View style={styles.periodFilter}>
      {(['day', 'week', 'month', 'quarter'] as TimePeriod[]).map((period) => (
        <TouchableOpacity
          key={period}
          style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive,
            ]}
          >
            {getPeriodLabel(period)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'executive' && styles.tabButtonActive]}
        onPress={() => setSelectedTab('executive')}
      >
        <Ionicons
          name="speedometer-outline"
          size={20}
          color={selectedTab === 'executive' ? Colors.surface : Colors.text.secondary}
        />
        <Text
          style={[styles.tabButtonText, selectedTab === 'executive' && styles.tabButtonTextActive]}
        >
          Exécutif
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'sla' && styles.tabButtonActive]}
        onPress={() => setSelectedTab('sla')}
      >
        <Ionicons
          name="time-outline"
          size={20}
          color={selectedTab === 'sla' ? Colors.surface : Colors.text.secondary}
        />
        <Text style={[styles.tabButtonText, selectedTab === 'sla' && styles.tabButtonTextActive]}>
          SLA
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'quality' && styles.tabButtonActive]}
        onPress={() => setSelectedTab('quality')}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={20}
          color={selectedTab === 'quality' ? Colors.surface : Colors.text.secondary}
        />
        <Text
          style={[styles.tabButtonText, selectedTab === 'quality' && styles.tabButtonTextActive]}
        >
          Qualité
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderExecutiveDashboard = () => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <Card style={styles.kpiCard}>
          <Ionicons name="time-outline" size={32} color={Colors.primary} />
          <Text style={styles.kpiValue}>{executiveMetrics.averageLatency}h</Text>
          <Text style={styles.kpiLabel}>Latence Moyenne</Text>
        </Card>

        <Card style={styles.kpiCard}>
          <Ionicons name="shield-checkmark-outline" size={32} color={Colors.success} />
          <Text style={[styles.kpiValue, { color: Colors.success }]}>
            {executiveMetrics.complianceRate}%
          </Text>
          <Text style={styles.kpiLabel}>Taux de Conformité</Text>
        </Card>

        <Card style={styles.kpiCard}>
          <Ionicons name="cube-outline" size={32} color={Colors.accent} />
          <Text style={styles.kpiValue}>{executiveMetrics.productionVolume}</Text>
          <Text style={styles.kpiLabel}>Volume de Production</Text>
        </Card>

        <Card style={styles.kpiCard}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
          <Text style={[styles.kpiValue, { color: Colors.error }]}>
            {executiveMetrics.criticalDeviations}
          </Text>
          <Text style={styles.kpiLabel}>Déviations Critiques</Text>
        </Card>
      </View>

      {/* Deviations Chart */}
      {executiveMetrics.totalDeviations > 0 && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Répartition des Déviations</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={[
                {
                  name: 'Critiques',
                  population: executiveMetrics.criticalDeviations,
                  color: Colors.error,
                  legendFontColor: Colors.text.primary,
                },
                {
                  name: 'Majeures',
                  population: executiveMetrics.majorDeviations,
                  color: Colors.warning,
                  legendFontColor: Colors.text.primary,
                },
                {
                  name: 'Mineures',
                  population: executiveMetrics.minorDeviations,
                  color: Colors.success,
                  legendFontColor: Colors.text.primary,
                },
              ]}
              width={Dimensions.get('window').width - Spacing.lg * 4}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </Card>
      )}

      {/* AI Insights */}
      <Card style={styles.insightsCard}>
        <View style={styles.insightsHeader}>
          <Ionicons name="bulb-outline" size={24} color={Colors.primary} />
          <Text style={styles.insightsTitle}>Insights Stratégiques IA</Text>
        </View>

        {aiInsights ? (
          <>
            <View style={styles.insightsContent}>
              <Text style={styles.insightsText}>{aiInsights}</Text>
            </View>
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={() => {
                setAiInsights(null);
              }}
            >
              <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
              <Text style={styles.regenerateButtonText}>Régénérer</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateAIInsights}
            disabled={generatingInsights}
          >
            {generatingInsights ? (
              <>
                <ActivityIndicator color={Colors.surface} />
                <Text style={[styles.generateButtonText, { marginLeft: Spacing.sm }]}>
                  Analyse en cours...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={20} color={Colors.surface} />
                <Text style={styles.generateButtonText}>Générer des Insights</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {aiError && (
          <Text style={styles.errorText}>
            ❌ Erreur: {aiError.message}
          </Text>
        )}
      </Card>
    </Animated.View>
  );

  const renderSLADashboard = () => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {/* SLA Performance */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Performance SLA</Text>
        <View style={styles.slaStats}>
          <View style={styles.slaStat}>
            <Text style={[styles.slaStatValue, { color: Colors.success }]}>
              {slaMetrics.slaPerformance.onTime}
            </Text>
            <Text style={styles.slaStatLabel}>À Temps</Text>
          </View>
          <View style={styles.slaStat}>
            <Text style={[styles.slaStatValue, { color: Colors.error }]}>
              {slaMetrics.slaPerformance.overdue}
            </Text>
            <Text style={styles.slaStatLabel}>Hors SLA</Text>
          </View>
          <View style={styles.slaStat}>
            <Text style={[styles.slaStatValue, { color: Colors.warning }]}>
              {slaMetrics.atRiskBatches.length}
            </Text>
            <Text style={styles.slaStatLabel}>À Risque</Text>
          </View>
        </View>
      </Card>

      {/* Bottlenecks Chart */}
      {slaMetrics.bottlenecks.length > 0 && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Goulots d&apos;Étranglement</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={{
                labels: slaMetrics.bottlenecks.map((b) => b.step.substring(0, 8)),
                datasets: [
                  {
                    data: slaMetrics.bottlenecks.map((b) => b.avgTime),
                  },
                ],
              }}
              width={Dimensions.get('window').width - Spacing.lg * 4}
              height={220}
              yAxisLabel=""
              yAxisSuffix="h"
              chartConfig={{
                backgroundColor: Colors.surface,
                backgroundGradientFrom: Colors.surface,
                backgroundGradientTo: Colors.surface,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                style: {
                  borderRadius: BorderRadius.md,
                },
              }}
              style={styles.chart}
              fromZero
            />
          </View>
          <Text style={styles.chartCaption}>Temps moyen par étape (heures)</Text>
        </Card>
      )}

      {/* At-Risk Batches */}
      {slaMetrics.atRiskBatches.length > 0 && (
        <Card style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Ionicons name="warning-outline" size={24} color={Colors.error} />
            <Text style={styles.riskTitle}>Lots à Risque</Text>
          </View>
          {slaMetrics.atRiskBatches.map((batch) => (
            <View key={batch.id} style={styles.riskBatch}>
              <View style={styles.riskBatchInfo}>
                <Text style={styles.riskBatchNumber}>Lot #{batch.batchNumber}</Text>
                <View style={[styles.riskBadge, { backgroundColor: Colors.error + '20' }]}>
                  <Text style={[styles.riskBadgeText, { color: Colors.error }]}>
                    Risque Élevé
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Animated.View>
  );

  const renderQualityDashboard = () => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {/* CAPA Efficiency */}
      <Card style={styles.capaCard}>
        <Ionicons name="construct-outline" size={32} color={Colors.accent} />
        <Text style={styles.capaValue}>
          {executiveMetrics.capaAverageResolutionTime.toFixed(1)}h
        </Text>
        <Text style={styles.capaLabel}>Temps Moyen de Résolution CAPA</Text>
      </Card>

      {/* Deviations by Step */}
      {qualityMetrics.deviationsByStep.length > 0 && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Déviations par Étape</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={{
                labels: qualityMetrics.deviationsByStep.map((d) => d.step.substring(0, 8)),
                datasets: [
                  {
                    data: qualityMetrics.deviationsByStep.map((d) => d.count),
                  },
                ],
              }}
              width={Dimensions.get('window').width - Spacing.lg * 4}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: Colors.surface,
                backgroundGradientFrom: Colors.surface,
                backgroundGradientTo: Colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(227, 57, 53, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                style: {
                  borderRadius: BorderRadius.md,
                },
              }}
              style={styles.chart}
              fromZero
            />
          </View>
          <Text style={styles.chartCaption}>Nombre de déviations par étape</Text>
        </Card>
      )}

      {/* Recurring Issues */}
      {qualityMetrics.recurringIssues.length > 0 && (
        <Card style={styles.recurringCard}>
          <Text style={styles.recurringTitle}>Analyse de Récurrence</Text>
          <Text style={styles.recurringSubtitle}>Problèmes fréquents détectés</Text>
          {qualityMetrics.recurringIssues.map((issue, index) => (
            <View key={index} style={styles.recurringItem}>
              <View style={styles.recurringBadge}>
                <Text style={styles.recurringBadgeText}>{issue.occurrences}×</Text>
              </View>
              <Text style={styles.recurringIssueText} numberOfLines={2}>
                {issue.issue}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Phase 9: Deviation Analytics Widget */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analyse des Déviations (Phase 9)</Text>
        <DeviationAnalyticsWidget />
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement des analyses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Analyse des Performances</Text>
            <Text style={styles.subtitle}>Insights et KPIs en temps réel</Text>
          </View>
        </View>

        {/* Period Filter */}
        {renderPeriodFilter()}

        {/* Tab Selector */}
        {renderTabSelector()}

        {/* Content based on selected tab */}
        {selectedTab === 'executive' && renderExecutiveDashboard()}
        {selectedTab === 'sla' && renderSLADashboard()}
        {selectedTab === 'quality' && renderQualityDashboard()}
      </ScrollView>
    </View>
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
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  periodFilter: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: Colors.surface,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabButtonText: {
    ...Typography.small,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: Colors.surface,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  kpiValue: {
    ...Typography.h1,
    color: Colors.primary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  kpiLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  chartCard: {
    marginBottom: Spacing.lg,
  },
  chartTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  chart: {
    borderRadius: BorderRadius.md,
  },
  chartCaption: {
    ...Typography.small,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  insightsCard: {
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  insightsTitle: {
    ...Typography.h3,
  },
  insightsContent: {
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  insightsText: {
    ...Typography.body,
    color: Colors.text.primary,
    lineHeight: 24,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  generateButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  slaStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
  },
  slaStat: {
    alignItems: 'center',
  },
  slaStatValue: {
    ...Typography.h1,
    marginBottom: Spacing.xs,
  },
  slaStatLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  riskCard: {
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  riskTitle: {
    ...Typography.h3,
    color: Colors.error,
  },
  riskBatch: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  riskBatchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskBatchNumber: {
    ...Typography.body,
    fontWeight: '600',
  },
  riskBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  riskBadgeText: {
    ...Typography.small,
    fontWeight: '600',
  },
  capaCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  capaValue: {
    ...Typography.h1,
    color: Colors.accent,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  capaLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  recurringCard: {
    marginBottom: Spacing.lg,
  },
  recurringTitle: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
  },
  recurringSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  recurringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recurringBadge: {
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  recurringBadgeText: {
    ...Typography.small,
    color: Colors.warning,
    fontWeight: '700',
  },
  recurringIssueText: {
    ...Typography.body,
    flex: 1,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
  },
  regenerateButtonText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
});
