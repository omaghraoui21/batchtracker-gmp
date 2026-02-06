/**
 * Comprehensive Network Diagnostics for Mobile Connectivity
 * Deep debugging mode with raw error capture, fallback testing,
 * DNS/IPv6 investigation, and config auditing.
 */

import { Platform } from 'react-native';
import { supabase, auditSupabaseConfig } from '@/lib/supabase';
import { debugLogger } from '@/lib/debugLogger';
import * as Network from 'expo-network';

export interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
  latency?: number;
  rawError?: string;
}

export interface NetworkDiagnostics {
  networkInfo: DiagnosticResult;
  dnsResolution: DiagnosticResult;
  apiReachability: DiagnosticResult;
  authService: DiagnosticResult;
  databaseService: DiagnosticResult;
  fallbackConnectivity: DiagnosticResult;
  dnsIpv6Check: DiagnosticResult;
  configAudit: DiagnosticResult;
}

/**
 * Get basic network information from the device
 */
export async function getNetworkInfo(): Promise<DiagnosticResult> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    let ipAddress = 'N/A';
    try {
      ipAddress = await Network.getIpAddressAsync();
    } catch {
      ipAddress = 'Impossible à récupérer';
    }

    const details = {
      isConnected: networkState.isConnected,
      isInternetReachable: networkState.isInternetReachable,
      type: networkState.type,
      ipAddress,
      platform: Platform.OS,
      platformVersion: Platform.Version,
    };

    debugLogger.info('Diagnostics', 'Network info retrieved', details);

    return {
      success: networkState.isConnected === true,
      message: networkState.isConnected
        ? `Connecté via ${networkState.type} (IP: ${ipAddress})`
        : 'Aucune connexion réseau détectée',
      details,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    debugLogger.error('Diagnostics', 'Network info retrieval failed', error);
    return {
      success: false,
      message: 'Impossible de récupérer les informations réseau',
      details: { error: error.message },
      rawError: JSON.stringify({ name: error.name, message: error.message, code: error.code }),
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    const responseDetails = {
      url: supabaseUrl,
      status: response.status,
      statusText: response.statusText,
      latency: `${latency}ms`,
      headers: {
        'content-type': response.headers.get('content-type'),
        'cf-ray': response.headers.get('cf-ray'),
        'server': response.headers.get('server'),
        'x-request-id': response.headers.get('x-request-id'),
      },
    };

    debugLogger.info('Diagnostics', 'DNS resolution test complete', responseDetails);

    return {
      success: response.ok || response.status === 401 || response.status === 403,
      message: `DNS résolu - HTTP ${response.status} - Latence: ${latency}ms`,
      details: responseDetails,
      timestamp: new Date().toISOString(),
      latency,
    };
  } catch (error: any) {
    const rawErrorData = {
      name: error.name,
      message: error.message,
      code: error.code,
      type: error.type,
      cause: error.cause?.message,
    };

    debugLogger.error('Diagnostics', 'DNS resolution failed', rawErrorData);

    let message = 'Échec de résolution DNS';

    if (error.name === 'AbortError') {
      message = 'Timeout de connexion (>10s) - DNS ou réseau trop lent';
    } else if (error.message?.includes('Network request failed')) {
      message = 'Connexion réseau échouée - Vérifiez WiFi/données mobiles';
    } else if (error.message?.includes('SSL') || error.message?.includes('certificate')) {
      message = 'Erreur SSL/TLS - Certificat invalide ou interception proxy';
    } else {
      message = `Erreur DNS: ${error.message}`;
    }

    return {
      success: false,
      message,
      details: { url: supabaseUrl, ...rawErrorData },
      rawError: JSON.stringify(rawErrorData, null, 2),
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

    const { data, error } = await Promise.race([
      supabase.from('profiles').select('count').limit(0),
      new Promise<{ data: null; error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 15000)
      ),
    ]);

    const latency = Date.now() - startTime;

    if (error) {
      const errorCode = 'code' in error ? (error as any).code : undefined;
      const acceptableErrors = ['42501', 'PGRST'];
      const isReachable = acceptableErrors.some((code) =>
        errorCode?.includes(code) || error.message?.includes(code)
      );

      return {
        success: isReachable,
        message: isReachable
          ? `API accessible (erreur permissions acceptée) - Latence: ${latency}ms`
          : `Erreur API: ${error.message}`,
        details: {
          error: error.message,
          code: errorCode,
          latency: `${latency}ms`,
        },
        rawError: JSON.stringify({ message: error.message, code: errorCode }),
        timestamp: new Date().toISOString(),
        latency,
      };
    }

    return {
      success: true,
      message: `API Supabase accessible - Latence: ${latency}ms`,
      details: { latency: `${latency}ms`, hasData: !!data },
      timestamp: new Date().toISOString(),
      latency,
    };
  } catch (error: any) {
    debugLogger.error('Diagnostics', 'API reachability test failed', error);

    return {
      success: false,
      message: error.message === 'Timeout'
        ? 'Timeout API (>15s)'
        : `Échec de connexion API: ${error.message}`,
      details: { error: error.message },
      rawError: JSON.stringify({ name: error.name, message: error.message }),
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

    const { error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: null; error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      ),
    ]);

    const latency = Date.now() - startTime;

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
      rawError: JSON.stringify({ message: error.message }),
      timestamp: new Date().toISOString(),
      latency,
    };
  } catch (error: any) {
    debugLogger.error('Diagnostics', 'Auth service test failed', error);

    return {
      success: false,
      message: error.message === 'Timeout'
        ? 'Timeout service auth (>10s)'
        : `Échec service auth: ${error.message}`,
      details: { error: error.message },
      rawError: JSON.stringify({ name: error.name, message: error.message }),
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

    const { data, error } = await Promise.race([
      supabase.from('profiles').select('count').limit(1),
      new Promise<{ data: any; error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      ),
    ]);

    const latency = Date.now() - startTime;

    if (error) {
      const errorCode = 'code' in error ? (error as any).code : undefined;
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
          code: errorCode,
          latency: `${latency}ms`,
        },
        rawError: JSON.stringify({ message: error.message, code: errorCode }),
        timestamp: new Date().toISOString(),
        latency,
      };
    }

    return {
      success: true,
      message: `Base de données accessible - Latence: ${latency}ms`,
      details: { latency: `${latency}ms`, rowCount: data?.length },
      timestamp: new Date().toISOString(),
      latency,
    };
  } catch (error: any) {
    debugLogger.error('Diagnostics', 'Database test failed', error);

    return {
      success: false,
      message: error.message === 'Timeout'
        ? 'Timeout base de données (>10s)'
        : `Échec base de données: ${error.message}`,
      details: { error: error.message },
      rawError: JSON.stringify({ name: error.name, message: error.message }),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Fallback connectivity test - bypasses Supabase client entirely.
 * Tests fetch to well-known public endpoints to determine if
 * the issue is Supabase-specific or a general network restriction.
 */
export async function testFallbackConnectivity(): Promise<DiagnosticResult> {
  const endpoints = [
    { name: 'Google', url: 'https://www.google.com/generate_204' },
    { name: 'Cloudflare', url: 'https://1.1.1.1/cdn-cgi/trace' },
    { name: 'Apple', url: 'https://captive.apple.com/hotspot-detect.html' },
  ];

  const results: { name: string; ok: boolean; status?: number; latency?: number; error?: string }[] = [];

  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint.url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      results.push({
        name: endpoint.name,
        ok: true,
        status: response.status,
        latency,
      });
    } catch (error: any) {
      results.push({
        name: endpoint.name,
        ok: false,
        error: `${error.name}: ${error.message}`,
      });
    }
  }

  // Also test raw fetch to Supabase (bypassing the SDK)
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      let responseBody = '';
      try {
        responseBody = await response.text();
      } catch {
        responseBody = '[unreadable]';
      }

      results.push({
        name: 'Supabase Auth (raw fetch)',
        ok: response.ok,
        status: response.status,
        latency,
        error: !response.ok ? `HTTP ${response.status}: ${responseBody.substring(0, 200)}` : undefined,
      });
    } catch (error: any) {
      results.push({
        name: 'Supabase Auth (raw fetch)',
        ok: false,
        error: `${error.name}: ${error.message}`,
      });
    }
  }

  const allOk = results.filter((r) => r.ok).length;
  const supabaseResult = results.find((r) => r.name.includes('Supabase'));
  const publicOk = results.filter((r) => !r.name.includes('Supabase') && r.ok).length;

  let message: string;
  let success: boolean;

  if (allOk === results.length) {
    message = `Tous les endpoints accessibles (${allOk}/${results.length})`;
    success = true;
  } else if (publicOk > 0 && !supabaseResult?.ok) {
    message = `Internet fonctionne mais Supabase est bloqué (public: ${publicOk}/3, Supabase: ❌)`;
    success = false;
  } else if (publicOk === 0) {
    message = 'Aucun endpoint accessible - Pas de connexion internet';
    success = false;
  } else {
    message = `Connectivité partielle (${allOk}/${results.length})`;
    success = allOk > results.length / 2;
  }

  debugLogger.info('Diagnostics', 'Fallback connectivity test', { results, message });

  return {
    success,
    message,
    details: { tests: results },
    timestamp: new Date().toISOString(),
  };
}

/**
 * DNS and IPv6 investigation
 * Checks for potential IPv6/DNS issues that commonly affect mobile devices
 */
export async function testDnsIpv6(): Promise<DiagnosticResult> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return {
      success: false,
      message: 'URL Supabase non configurée',
      timestamp: new Date().toISOString(),
    };
  }

  const checks: { name: string; result: string; warning?: boolean }[] = [];

  // 1. Check device IP address for IPv6 indicators
  try {
    const ipAddress = await Network.getIpAddressAsync();
    const isIpv6 = ipAddress.includes(':');
    checks.push({
      name: 'Adresse IP locale',
      result: ipAddress,
      warning: isIpv6,
    });
    if (isIpv6) {
      checks.push({
        name: 'IPv6 détecté',
        result: 'Votre appareil utilise IPv6 - Cela peut causer des problèmes avec certains endpoints',
        warning: true,
      });
    }
  } catch (error: any) {
    checks.push({
      name: 'Adresse IP',
      result: `Erreur: ${error.message}`,
      warning: true,
    });
  }

  // 2. Test Cloudflare trace for network path info
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://1.1.1.1/cdn-cgi/trace', {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const traceText = await response.text();
    const traceLines = traceText.split('\n');
    const traceData: Record<string, string> = {};
    for (const line of traceLines) {
      const [key, value] = line.split('=');
      if (key && value) traceData[key.trim()] = value.trim();
    }

    checks.push({
      name: 'IP publique',
      result: traceData['ip'] || 'Inconnue',
      warning: traceData['ip']?.includes(':'), // IPv6
    });
    checks.push({
      name: 'Localisation réseau',
      result: `${traceData['loc'] || '??'} (${traceData['colo'] || '??'})`,
    });
    checks.push({
      name: 'Protocole',
      result: traceData['http'] || 'Inconnu',
    });
    checks.push({
      name: 'TLS',
      result: traceData['tls'] || 'Inconnu',
    });

    if (traceData['warp'] && traceData['warp'] !== 'off') {
      checks.push({
        name: 'Cloudflare WARP/VPN',
        result: `Actif (${traceData['warp']})`,
        warning: true,
      });
    }
  } catch (error: any) {
    checks.push({
      name: 'Trace Cloudflare',
      result: `Échec: ${error.message}`,
      warning: true,
    });
  }

  // 3. Check hostname resolution timing
  try {
    const hostname = supabaseUrl.replace('https://', '').replace('http://', '');
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    await fetch(`https://${hostname}`, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const resolutionTime = Date.now() - startTime;

    checks.push({
      name: 'Résolution hostname Supabase',
      result: `${resolutionTime}ms`,
      warning: resolutionTime > 3000,
    });
  } catch (error: any) {
    checks.push({
      name: 'Résolution hostname Supabase',
      result: `Échec: ${error.name} - ${error.message}`,
      warning: true,
    });
  }

  const hasWarnings = checks.some((c) => c.warning);
  const hasIpv6 = checks.some((c) => c.name.includes('IPv6'));

  let message: string;
  if (hasIpv6) {
    message = '⚠️ IPv6 détecté - Potentiel problème de compatibilité';
  } else if (hasWarnings) {
    message = '⚠️ Anomalies réseau détectées';
  } else {
    message = 'Configuration DNS/réseau normale';
  }

  debugLogger.info('Diagnostics', 'DNS/IPv6 check complete', { checks });

  return {
    success: !hasWarnings,
    message,
    details: { checks },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run Supabase config audit
 */
export async function runConfigAudit(): Promise<DiagnosticResult> {
  try {
    const audit = await auditSupabaseConfig();

    const failedChecks = audit.checks.filter((c) => c.status === 'error');
    const warningChecks = audit.checks.filter((c) => c.status === 'warning');

    let message: string;
    if (failedChecks.length > 0) {
      message = `${failedChecks.length} problème(s) de configuration: ${failedChecks.map((c) => c.name).join(', ')}`;
    } else if (warningChecks.length > 0) {
      message = `Configuration OK avec ${warningChecks.length} avertissement(s)`;
    } else {
      message = 'Configuration Supabase validée';
    }

    return {
      success: audit.status !== 'error',
      message,
      details: { checks: audit.checks, overallStatus: audit.status },
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    debugLogger.error('Diagnostics', 'Config audit failed', error);
    return {
      success: false,
      message: `Échec de l'audit: ${error.message}`,
      details: { error: error.message },
      rawError: JSON.stringify({ name: error.name, message: error.message }),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Run comprehensive network diagnostics
 */
export async function runComprehensiveDiagnostics(): Promise<NetworkDiagnostics> {
  debugLogger.info('Diagnostics', 'Starting comprehensive diagnostics...');

  const [networkInfo, dnsResolution, apiReachability, authService, databaseService, fallbackConnectivity, dnsIpv6Check, configAudit] =
    await Promise.all([
      getNetworkInfo(),
      testDNSResolution(),
      testAPIReachability(),
      testAuthService(),
      testDatabaseService(),
      testFallbackConnectivity(),
      testDnsIpv6(),
      runConfigAudit(),
    ]);

  const results: NetworkDiagnostics = {
    networkInfo,
    dnsResolution,
    apiReachability,
    authService,
    databaseService,
    fallbackConnectivity,
    dnsIpv6Check,
    configAudit,
  };

  debugLogger.info('Diagnostics', 'Comprehensive diagnostics complete', {
    networkOk: networkInfo.success,
    dnsOk: dnsResolution.success,
    apiOk: apiReachability.success,
    authOk: authService.success,
    dbOk: databaseService.success,
    fallbackOk: fallbackConnectivity.success,
    ipv6Ok: dnsIpv6Check.success,
    configOk: configAudit.success,
  });

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

  // Check fallback connectivity - key insight
  if (diagnostics.fallbackConnectivity.success && !diagnostics.dnsResolution.success) {
    recommendations.push(
      '🔑 Internet fonctionne mais Supabase est bloqué → Possible blocage DNS/firewall spécifique à Supabase'
    );
  }

  if (!diagnostics.fallbackConnectivity.success && !diagnostics.networkInfo.success) {
    recommendations.push(
      '📱 Aucune connexion internet détectée → Vérifiez WiFi et données mobiles'
    );
  }

  // IPv6/DNS issues
  if (!diagnostics.dnsIpv6Check.success) {
    const checks = diagnostics.dnsIpv6Check.details?.checks || [];
    const hasIpv6 = checks.some((c: any) => c.name?.includes('IPv6'));
    const hasVpn = checks.some((c: any) => c.name?.includes('VPN') || c.name?.includes('WARP'));

    if (hasIpv6) {
      recommendations.push(
        '⚠️ IPv6 détecté - Essayez de désactiver IPv6 dans vos paramètres réseau ou utilisez un DNS alternatif (8.8.8.8)'
      );
    }
    if (hasVpn) {
      recommendations.push(
        '🔒 VPN/WARP détecté - Désactivez votre VPN pour tester la connexion directe'
      );
    }
  }

  // Config audit
  if (!diagnostics.configAudit.success) {
    issues.push('Problème de configuration client');
    recommendations.push('Vérifiez la configuration Supabase et AsyncStorage');
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
