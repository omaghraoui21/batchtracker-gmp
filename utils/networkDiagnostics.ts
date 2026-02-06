/**
 * Comprehensive Network Diagnostics for Mobile Connectivity
 * Provides detailed testing of DNS, API reachability, and latency
 */

import { supabase } from '@/lib/supabase';
import * as Network from 'expo-network';

export interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
  latency?: number;
}

export interface NetworkDiagnostics {
  networkInfo: DiagnosticResult;
  dnsResolution: DiagnosticResult;
  apiReachability: DiagnosticResult;
  authService: DiagnosticResult;
  databaseService: DiagnosticResult;
}

/**
 * Get basic network information from the device
 */
export async function getNetworkInfo(): Promise<DiagnosticResult> {
  try {
    const networkState = await Network.getNetworkStateAsync();

    return {
      success: networkState.isConnected === true,
      message: networkState.isConnected
        ? `Connecté via ${networkState.type}`
        : 'Aucune connexion réseau détectée',
      details: {
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable,
        type: networkState.type,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[NetworkDiagnostics] Error getting network info:', error);
    return {
      success: false,
      message: 'Impossible de récupérer les informations réseau',
      details: { error: (error as Error).message },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test DNS resolution and connectivity to Supabase URL
 */
export async function testDNSResolution(): Promise<DiagnosticResult> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return {
      success: false,
      message: 'URL Supabase non configurée',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const startTime = Date.now();

    // Test basic HTTP connectivity with a simple HEAD request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    return {
      success: response.ok || response.status === 401, // 401 is expected without auth
      message: `DNS résolu - Latence: ${latency}ms`,
      details: {
        url: supabaseUrl,
        status: response.status,
        latency: `${latency}ms`,
      },
      timestamp: new Date().toISOString(),
      latency,
    };
  } catch (error: any) {
    console.error('[NetworkDiagnostics] DNS resolution failed:', error);

    let message = 'Échec de résolution DNS';
    const details: any = { url: supabaseUrl };

    if (error.name === 'AbortError') {
      message = 'Timeout de connexion (>10s)';
      details.error = 'Timeout';
    } else if (error.message.includes('Network request failed')) {
      message = 'Connexion réseau échouée';
      details.error = 'Network failure';
    } else {
      details.error = error.message;
    }

    return {
      success: false,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test Supabase REST API reachability
 */
export async function testAPIReachability(): Promise<DiagnosticResult> {
  try {
    const startTime = Date.now();

    // Simple query to test API connectivity
    const { error } = await Promise.race([
      supabase.from('profiles').select('count').limit(0),
      new Promise<{ error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 15000)
      ),
    ]);

    const latency = Date.now() - startTime;

    if (error) {
      // Some errors are acceptable (like permission errors)
      // as they confirm the API is reachable
      const acceptableErrors = ['42501', 'PGRST'];

      const isReachable = acceptableErrors.some((code) =>
        error.code?.includes(code) || error.message?.includes(code)
      );

      return {
        success: isReachable,
        message: isReachable
          ? `API accessible - Latence: ${latency}ms`
          : `Erreur API: ${error.message}`,
        details: {
          error: error.message,
          code: error.code,
          latency: `${latency}ms`,
        },
        timestamp: new Date().toISOString(),
        latency,
      };
    }

    return {
      success: true,
      message: `API Supabase accessible - Latence: ${latency}ms`,
      details: { latency: `${latency}ms` },
      timestamp: new Date().toISOString(),
      latency,
    };
  } catch (error: any) {
    console.error('[NetworkDiagnostics] API reachability test failed:', error);

    return {
      success: false,
      message: error.message === 'Timeout'
        ? 'Timeout API (>15s)'
        : `Échec de connexion API: ${error.message}`,
      details: { error: error.message },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test Supabase Auth service specifically
 */
export async function testAuthService(): Promise<DiagnosticResult> {
  try {
    const startTime = Date.now();

    // Test auth service with a session check
    const { error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      ),
    ]);

    const latency = Date.now() - startTime;

    // No error means auth service is reachable
    if (!error) {
      return {
        success: true,
        message: `Service d'authentification actif - Latence: ${latency}ms`,
        details: { latency: `${latency}ms` },
        timestamp: new Date().toISOString(),
        latency,
      };
    }

    return {
      success: false,
      message: `Erreur service auth: ${error.message}`,
      details: { error: error.message, latency: `${latency}ms` },
      timestamp: new Date().toISOString(),
      latency,
    };
  } catch (error: any) {
    console.error('[NetworkDiagnostics] Auth service test failed:', error);

    return {
      success: false,
      message: error.message === 'Timeout'
        ? 'Timeout service auth (>10s)'
        : `Échec service auth: ${error.message}`,
      details: { error: error.message },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test database connectivity
 */
export async function testDatabaseService(): Promise<DiagnosticResult> {
  try {
    const startTime = Date.now();

    // Try to access a table (even if we get a permission error, it confirms DB is reachable)
    const { data, error } = await Promise.race([
      supabase.from('profiles').select('count').limit(1),
      new Promise<{ data: any; error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      ),
    ]);

    const latency = Date.now() - startTime;

    // Even if there's an error, as long as it's not a network error, the DB is reachable
    if (error) {
      const isNetworkError = error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message === 'Timeout';

      return {
        success: !isNetworkError,
        message: isNetworkError
          ? `Base de données inaccessible: ${error.message}`
          : `Base de données accessible - Latence: ${latency}ms`,
        details: {
          error: error.message,
          code: error.code,
          latency: `${latency}ms`,
        },
        timestamp: new Date().toISOString(),
        latency,
      };
    }

    return {
      success: true,
      message: `Base de données accessible - Latence: ${latency}ms`,
      details: { latency: `${latency}ms` },
      timestamp: new Date().toISOString(),
      latency,
    };
  } catch (error: any) {
    console.error('[NetworkDiagnostics] Database test failed:', error);

    return {
      success: false,
      message: error.message === 'Timeout'
        ? 'Timeout base de données (>10s)'
        : `Échec base de données: ${error.message}`,
      details: { error: error.message },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Run comprehensive network diagnostics
 */
export async function runComprehensiveDiagnostics(): Promise<NetworkDiagnostics> {
  console.log('[NetworkDiagnostics] Starting comprehensive diagnostics...');

  const [networkInfo, dnsResolution, apiReachability, authService, databaseService] =
    await Promise.all([
      getNetworkInfo(),
      testDNSResolution(),
      testAPIReachability(),
      testAuthService(),
      testDatabaseService(),
    ]);

  const results: NetworkDiagnostics = {
    networkInfo,
    dnsResolution,
    apiReachability,
    authService,
    databaseService,
  };

  console.log('[NetworkDiagnostics] Diagnostics complete:', results);
  return results;
}

/**
 * Analyze diagnostics and provide user-friendly recommendations
 */
export function analyzeDiagnostics(diagnostics: NetworkDiagnostics): {
  status: 'healthy' | 'degraded' | 'failed';
  summary: string;
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check network connection
  if (!diagnostics.networkInfo.success) {
    issues.push('Aucune connexion réseau');
    recommendations.push('Vérifiez que votre appareil est connecté au WiFi ou aux données mobiles');
  }

  // Check DNS resolution
  if (!diagnostics.dnsResolution.success) {
    issues.push('Résolution DNS échouée');
    recommendations.push('Vérifiez les paramètres DNS de votre réseau');
    recommendations.push('Si vous utilisez un VPN, essayez de le désactiver temporairement');
  }

  // Check API reachability
  if (!diagnostics.apiReachability.success) {
    issues.push('API Supabase inaccessible');
    recommendations.push('Vérifiez que votre firewall/proxy ne bloque pas les connexions HTTPS');
    recommendations.push('Si vous êtes sur un réseau d\'entreprise, contactez votre IT');
  }

  // Check auth service
  if (!diagnostics.authService.success) {
    issues.push('Service d\'authentification inaccessible');
    recommendations.push('Le service d\'authentification est temporairement indisponible');
  }

  // Check database service
  if (!diagnostics.databaseService.success) {
    issues.push('Base de données inaccessible');
  }

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'failed';
  if (issues.length === 0) {
    status = 'healthy';
  } else if (diagnostics.networkInfo.success && diagnostics.dnsResolution.success) {
    status = 'degraded';
  } else {
    status = 'failed';
  }

  const summary = issues.length === 0
    ? '✅ Tous les services sont opérationnels'
    : `❌ ${issues.length} problème${issues.length > 1 ? 's' : ''} détecté${issues.length > 1 ? 's' : ''}: ${issues.join(', ')}`;

  return {
    status,
    summary,
    recommendations,
  };
}
