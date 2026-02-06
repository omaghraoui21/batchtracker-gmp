import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { testConnection } from '@/utils/supabaseTest';
import * as Network from 'expo-network';

interface ConnectionStatusProps {
  visible?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function ConnectionStatus({
  visible = __DEV__,
  autoRefresh = true,
  refreshInterval = 30000,
}: ConnectionStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [networkType, setNetworkType] = useState<string>('Unknown');

  const checkConnection = async () => {
    setStatus('checking');
    try {
      // Check device network status
      const networkState = await Network.getNetworkStateAsync();
      setNetworkType(networkState.type || 'Unknown');

      if (!networkState.isConnected) {
        setStatus('disconnected');
        setLastCheck(new Date());
        setLatency(null);
        return;
      }

      // Test Supabase connection with latency measurement
      const startTime = Date.now();
      const result = await testConnection();
      const endTime = Date.now();

      setStatus(result.success ? 'connected' : 'disconnected');
      setLatency(result.success ? endTime - startTime : null);
      setLastCheck(new Date());
    } catch (error) {
      console.error('[ConnectionStatus] Check failed:', error);
      setStatus('disconnected');
      setLastCheck(new Date());
      setLatency(null);
    }
  };

  useEffect(() => {
    if (visible) {
      checkConnection();

      if (autoRefresh) {
        const interval = setInterval(checkConnection, refreshInterval);
        return () => clearInterval(interval);
      }
    }
  }, [visible, autoRefresh, refreshInterval]);

  if (!visible) return null;

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return Colors.success;
      case 'disconnected':
        return Colors.error;
      case 'checking':
        return Colors.warning;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return '✓';
      case 'disconnected':
        return '✗';
      case 'checking':
        return '⟳';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connecté';
      case 'disconnected':
        return 'Déconnecté';
      case 'checking':
        return 'Vérification...';
    }
  };

  const getLatencyColor = () => {
    if (!latency) return Colors.text.tertiary;
    if (latency < 200) return Colors.success;
    if (latency < 500) return Colors.warning;
    return Colors.error;
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: getStatusColor() }]}
      onPress={checkConnection}
      activeOpacity={0.7}
      disabled={status === 'checking'}
    >
      <View style={styles.leftSection}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]}>
          {status === 'checking' ? (
            <ActivityIndicator size="small" color={Colors.surface} />
          ) : (
            <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
          )}
        </View>
        <View style={styles.statusInfo}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          <Text style={styles.networkType}>{networkType}</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {latency !== null && status === 'connected' && (
          <View style={styles.latencyBadge}>
            <Text style={[styles.latencyText, { color: getLatencyColor() }]}>
              {latency}ms
            </Text>
          </View>
        )}
        {lastCheck && (
          <Text style={styles.timestampText}>
            {lastCheck.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  statusIcon: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  networkType: {
    ...Typography.small,
    color: Colors.text.tertiary,
    fontSize: 10,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  latencyBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: 2,
  },
  latencyText: {
    ...Typography.small,
    fontSize: 10,
    fontWeight: '600',
  },
  timestampText: {
    ...Typography.small,
    color: Colors.text.tertiary,
    fontSize: 10,
  },
});
