/**
 * Supabase connection and authentication testing utilities
 * Use these to diagnose connection issues on mobile devices
 */

import { supabase } from '@/lib/supabase';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Test basic Supabase connection
 */
export async function testConnection(): Promise<ConnectionTestResult> {
  try {
    console.log('[SupabaseTest] Testing connection...');

    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('[SupabaseTest] Connection failed:', error);
      return {
        success: false,
        message: 'Impossible de se connecter à Supabase',
        details: error,
        timestamp: new Date().toISOString(),
      };
    }

    console.log('[SupabaseTest] Connection successful');
    return {
      success: true,
      message: 'Connexion à Supabase établie',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[SupabaseTest] Exception during connection test:', error);
    return {
      success: false,
      message: 'Erreur lors du test de connexion',
      details: error,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test authentication with specific credentials
 */
export async function testAuthentication(
  email: string,
  password: string
): Promise<ConnectionTestResult> {
  try {
    console.log('[SupabaseTest] Testing authentication for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[SupabaseTest] Authentication failed:', error);
      return {
        success: false,
        message: 'Échec de l\'authentification',
        details: {
          message: error.message,
          status: error.status,
          name: error.name,
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'Aucune donnée utilisateur retournée',
        timestamp: new Date().toISOString(),
      };
    }

    console.log('[SupabaseTest] Authentication successful, user ID:', data.user.id);

    // Test profile loading
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('[SupabaseTest] Profile loading failed:', profileError);
      return {
        success: false,
        message: 'Authentification réussie mais échec du chargement du profil',
        details: profileError,
        timestamp: new Date().toISOString(),
      };
    }

    console.log('[SupabaseTest] Profile loaded:', profile?.email);

    return {
      success: true,
      message: 'Authentification et chargement du profil réussis',
      details: {
        userId: data.user.id,
        email: profile?.email,
        role: profile?.role,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[SupabaseTest] Exception during authentication test:', error);
    return {
      success: false,
      message: 'Exception lors du test d\'authentification',
      details: error,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test if environment variables are properly set
 */
export function testEnvironmentVariables(): ConnectionTestResult {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      message: 'Variables d\'environnement Supabase manquantes',
      details: {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
      },
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: true,
    message: 'Variables d\'environnement configurées',
    details: {
      url: supabaseUrl.substring(0, 30) + '...',
      keyLength: supabaseAnonKey.length,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run all diagnostic tests
 */
export async function runDiagnostics(
  email?: string,
  password?: string
): Promise<{
  environment: ConnectionTestResult;
  connection: ConnectionTestResult;
  authentication?: ConnectionTestResult;
}> {
  console.log('[SupabaseTest] Running full diagnostics...');

  const environment = testEnvironmentVariables();
  const connection = await testConnection();

  const results: any = {
    environment,
    connection,
  };

  if (email && password) {
    results.authentication = await testAuthentication(email, password);
  }

  console.log('[SupabaseTest] Diagnostics complete:', results);
  return results;
}
