import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { testConnection } from '@/utils/supabaseTest';

interface ConnectionStatusProps {
  visible?: boolean;
}

export function ConnectionStatus({ visible = __DEV__ }: ConnectionStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const result = await testConnection();
      setStatus(result.success ? 'connected' : 'disconnected');
      setLastCheck(new Date());
    } catch (error) {
      console.error('[ConnectionStatus] Check failed:', error);
      setStatus('disconnected');
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    if (visible) {
      checkConnection();
    }
  }, [visible]);

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

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return '● Connecté à Supabase';
      case 'disconnected':
        return '● Déconnecté de Supabase';
      case 'checking':
        return '● Vérification...';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: getStatusColor() }]}
      onPress={checkConnection}
      activeOpacity={0.7}
    >
      <Text style={[styles.statusText, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
      {lastCheck && (
        <Text style={styles.timestampText}>
          {lastCheck.toLocaleTimeString('fr-FR')}
        </Text>
      )}
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
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  timestampText: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
});
