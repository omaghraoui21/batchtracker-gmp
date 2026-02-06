import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import type { Database } from './database.types';
import { debugLogger } from './debugLogger';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Log Supabase client initialization
debugLogger.info('Supabase', 'Initializing Supabase client', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length || 0,
  platform: Platform.OS,
  platformVersion: Platform.Version,
});

/**
 * Custom fetch wrapper that captures raw network-level errors
 * This is critical for debugging on physical devices where network
 * behavior differs from simulators.
 */
const debugFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || 'GET';
  const startTime = Date.now();

  // Don't log the full body for auth requests (contains passwords)
  const isAuthRequest = url.includes('/auth/');
  const safeUrl = url.length > 120 ? url.substring(0, 120) + '...' : url;

  debugLogger.trace('Fetch', `→ ${method} ${safeUrl}`);

  try {
    const response = await fetch(input, init);
    const duration = Date.now() - startTime;

    debugLogger.trace('Fetch', `← ${response.status} ${method} ${safeUrl} (${duration}ms)`, {
      status: response.status,
      statusText: response.statusText,
      duration,
      headers: {
        'content-type': response.headers.get('content-type'),
        'x-request-id': response.headers.get('x-request-id'),
        'cf-ray': response.headers.get('cf-ray'),
      },
    });

    // If it's a non-2xx response for auth, capture the raw body for debugging
    if (!response.ok && isAuthRequest) {
      // Clone the response so we can read the body without consuming it
      const cloned = response.clone();
      try {
        const rawBody = await cloned.text();
        debugLogger.error('Fetch', `Auth request failed: ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          rawBody: rawBody.substring(0, 1000),
          url: safeUrl,
          duration,
        });
      } catch {
        // Ignore clone/read errors
      }
    }

    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    debugLogger.error('Fetch', `NETWORK ERROR: ${method} ${safeUrl} (${duration}ms)`, {
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorType: error?.type,
      duration,
      platform: Platform.OS,
      // Capture all enumerable properties
      allProps: Object.keys(error || {}).reduce((acc: Record<string, any>, key) => {
        try { acc[key] = error[key]; } catch { acc[key] = '[unreadable]'; }
        return acc;
      }, {}),
    });
    throw error;
  }
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // flowType 'pkce' is default and correct for mobile
  },
  global: {
    fetch: debugFetch,
  },
});

debugLogger.info('Supabase', 'Supabase client created successfully', {
  authConfig: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageType: 'AsyncStorage',
  },
});

// Handle app state for token refresh
AppState.addEventListener('change', (state) => {
  debugLogger.debug('AppState', `App state changed to: ${state}`);
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

/**
 * Audit the Supabase client configuration and AsyncStorage.
 * Returns a structured report of any issues found.
 */
export async function auditSupabaseConfig(): Promise<{
  status: 'ok' | 'warning' | 'error';
  checks: { name: string; status: 'ok' | 'warning' | 'error'; detail: string }[];
}> {
  const checks: { name: string; status: 'ok' | 'warning' | 'error'; detail: string }[] = [];

  // 1. Check env vars
  if (!supabaseUrl) {
    checks.push({ name: 'SUPABASE_URL', status: 'error', detail: 'EXPO_PUBLIC_SUPABASE_URL non défini' });
  } else {
    checks.push({ name: 'SUPABASE_URL', status: 'ok', detail: supabaseUrl });
  }

  if (!supabaseAnonKey) {
    checks.push({ name: 'SUPABASE_ANON_KEY', status: 'error', detail: 'EXPO_PUBLIC_SUPABASE_ANON_KEY non défini' });
  } else {
    checks.push({ name: 'SUPABASE_ANON_KEY', status: 'ok', detail: `${supabaseAnonKey.length} chars` });
  }

  // 2. Test AsyncStorage accessibility
  try {
    const testKey = '__supabase_audit_test__';
    await AsyncStorage.setItem(testKey, 'ok');
    const val = await AsyncStorage.getItem(testKey);
    await AsyncStorage.removeItem(testKey);
    if (val === 'ok') {
      checks.push({ name: 'AsyncStorage', status: 'ok', detail: 'Lecture/écriture fonctionnelle' });
    } else {
      checks.push({ name: 'AsyncStorage', status: 'warning', detail: `Lecture retournée: ${val}` });
    }
  } catch (e: any) {
    checks.push({ name: 'AsyncStorage', status: 'error', detail: `Erreur: ${e.message}` });
  }

  // 3. Check for existing session in storage
  try {
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter((k) => k.includes('supabase') || k.includes('sb-'));
    checks.push({
      name: 'Session Storage',
      status: supabaseKeys.length > 0 ? 'ok' : 'warning',
      detail: supabaseKeys.length > 0
        ? `${supabaseKeys.length} clé(s) trouvée(s): ${supabaseKeys.join(', ')}`
        : 'Aucune session stockée',
    });
  } catch (e: any) {
    checks.push({ name: 'Session Storage', status: 'error', detail: `Erreur: ${e.message}` });
  }

  // 4. Platform info
  checks.push({
    name: 'Platform',
    status: 'ok',
    detail: `${Platform.OS} v${Platform.Version}`,
  });

  // 5. URL polyfill check
  try {
    const testUrl = new URL('/test', supabaseUrl);
    checks.push({
      name: 'URL Polyfill',
      status: 'ok',
      detail: `URL construite: ${testUrl.toString()}`,
    });
  } catch (e: any) {
    checks.push({ name: 'URL Polyfill', status: 'error', detail: `URL polyfill cassé: ${e.message}` });
  }

  const overallStatus = checks.some((c) => c.status === 'error')
    ? 'error'
    : checks.some((c) => c.status === 'warning')
    ? 'warning'
    : 'ok';

  debugLogger.info('Supabase', 'Config audit complete', { overallStatus, checks });

  return { status: overallStatus, checks };
}
