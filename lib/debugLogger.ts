/**
 * Deep Debug Logger
 * Captures raw errors, network traces, and system state for mobile debugging.
 * Stores the last N entries in memory for copy-to-clipboard export.
 */

import { Platform } from 'react-native';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'TRACE';

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  rawData?: any;
  stackTrace?: string;
}

export interface LastLoginAttempt {
  timestamp: string;
  email: string;
  steps: {
    step: string;
    status: 'success' | 'error' | 'skipped';
    duration?: number;
    rawResponse?: any;
    rawError?: any;
  }[];
  finalResult: 'success' | 'error';
  totalDuration: number;
}

const MAX_LOG_ENTRIES = 100;

class DebugLogger {
  private logs: DebugLogEntry[] = [];
  private lastLoginAttempt: LastLoginAttempt | null = null;
  private listeners: Set<() => void> = new Set();

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb());
  }

  log(level: LogLevel, category: string, message: string, rawData?: any) {
    const entry: DebugLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      rawData: rawData ? this.safeSerialize(rawData) : undefined,
      stackTrace: level === 'ERROR' ? new Error().stack : undefined,
    };

    this.logs.push(entry);

    // Trim old entries
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
    }

    // Also output to console
    const consolePrefix = `[DebugLog][${category}]`;
    switch (level) {
      case 'ERROR':
        console.error(consolePrefix, message, rawData || '');
        break;
      case 'WARN':
        console.warn(consolePrefix, message, rawData || '');
        break;
      default:
        console.log(consolePrefix, message, rawData || '');
    }

    this.notifyListeners();
  }

  info(category: string, message: string, rawData?: any) {
    this.log('INFO', category, message, rawData);
  }

  warn(category: string, message: string, rawData?: any) {
    this.log('WARN', category, message, rawData);
  }

  error(category: string, message: string, rawData?: any) {
    this.log('ERROR', category, message, rawData);
  }

  debug(category: string, message: string, rawData?: any) {
    this.log('DEBUG', category, message, rawData);
  }

  trace(category: string, message: string, rawData?: any) {
    this.log('TRACE', category, message, rawData);
  }

  /**
   * Record a complete login attempt with all steps
   */
  setLastLoginAttempt(attempt: LastLoginAttempt) {
    this.lastLoginAttempt = attempt;
    this.notifyListeners();
  }

  getLastLoginAttempt(): LastLoginAttempt | null {
    return this.lastLoginAttempt;
  }

  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  getLogsByCategory(category: string): DebugLogEntry[] {
    return this.logs.filter((l) => l.category === category);
  }

  getErrorLogs(): DebugLogEntry[] {
    return this.logs.filter((l) => l.level === 'ERROR');
  }

  clearLogs() {
    this.logs = [];
    this.lastLoginAttempt = null;
    this.notifyListeners();
  }

  /**
   * Safely serialize any data, handling circular references and special types
   */
  private safeSerialize(data: any, depth = 0): any {
    if (depth > 5) return '[MAX_DEPTH]';
    if (data === null || data === undefined) return data;
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack?.split('\n').slice(0, 5).join('\n'),
        ...(data as any).code && { code: (data as any).code },
        ...(data as any).status && { status: (data as any).status },
        ...(data as any).statusCode && { statusCode: (data as any).statusCode },
      };
    }

    if (Array.isArray(data)) {
      return data.slice(0, 20).map((item) => this.safeSerialize(item, depth + 1));
    }

    if (typeof data === 'object') {
      const result: Record<string, any> = {};
      const keys = Object.keys(data).slice(0, 30);
      for (const key of keys) {
        try {
          result[key] = this.safeSerialize(data[key], depth + 1);
        } catch {
          result[key] = '[SERIALIZE_ERROR]';
        }
      }
      return result;
    }

    return String(data);
  }

  /**
   * Export full debug state as a copyable string
   */
  exportFullReport(): string {
    const separator = '═'.repeat(50);
    const sections: string[] = [];

    // Header
    sections.push(`${separator}`);
    sections.push('GMP BATCH TRACKER - RAPPORT DE DÉBOGAGE COMPLET');
    sections.push(`Généré: ${new Date().toISOString()}`);
    sections.push(`Platform: ${Platform.OS} ${Platform.Version}`);
    sections.push(`${separator}\n`);

    // Environment
    sections.push('── CONFIGURATION ──');
    sections.push(`Supabase URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL || 'NON DÉFINI'}`);
    sections.push(`Anon Key: ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NON DÉFINI'}`);
    sections.push(`Auth Broker: ${process.env.EXPO_PUBLIC_AUTH_BROKER_URL || 'NON DÉFINI'}`);
    sections.push(`__DEV__: ${__DEV__}\n`);

    // Last Login Attempt
    if (this.lastLoginAttempt) {
      sections.push('── DERNIÈRE TENTATIVE DE CONNEXION ──');
      sections.push(`Horodatage: ${this.lastLoginAttempt.timestamp}`);
      sections.push(`Email: ${this.lastLoginAttempt.email}`);
      sections.push(`Résultat: ${this.lastLoginAttempt.finalResult}`);
      sections.push(`Durée totale: ${this.lastLoginAttempt.totalDuration}ms`);
      sections.push('Étapes:');
      for (const step of this.lastLoginAttempt.steps) {
        const icon = step.status === 'success' ? '✅' : step.status === 'error' ? '❌' : '⏭️';
        sections.push(`  ${icon} ${step.step} (${step.duration || 0}ms)`);
        if (step.rawError) {
          sections.push(`     Erreur brute: ${JSON.stringify(step.rawError, null, 2)}`);
        }
        if (step.rawResponse) {
          sections.push(`     Réponse: ${JSON.stringify(step.rawResponse, null, 2)}`);
        }
      }
      sections.push('');
    }

    // Recent Error Logs
    const errorLogs = this.getErrorLogs();
    if (errorLogs.length > 0) {
      sections.push('── ERREURS RÉCENTES ──');
      for (const log of errorLogs.slice(-15)) {
        sections.push(`[${log.timestamp}] [${log.category}] ${log.message}`);
        if (log.rawData) {
          sections.push(`  Données: ${JSON.stringify(log.rawData, null, 2)}`);
        }
      }
      sections.push('');
    }

    // All Logs
    sections.push('── JOURNAL COMPLET ──');
    for (const log of this.logs.slice(-50)) {
      sections.push(`[${log.timestamp}] [${log.level}] [${log.category}] ${log.message}`);
      if (log.rawData) {
        sections.push(`  ${JSON.stringify(log.rawData)}`);
      }
    }

    sections.push(`\n${separator}`);
    sections.push('FIN DU RAPPORT');
    sections.push(separator);

    return sections.join('\n');
  }
}

// Singleton instance
export const debugLogger = new DebugLogger();
