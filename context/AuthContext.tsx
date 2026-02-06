import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import { debugLogger, type LastLoginAttempt } from '@/lib/debugLogger';
import type { Session } from '@supabase/supabase-js';

export type AuthError = {
  type: 'network' | 'credentials' | 'profile' | 'unknown';
  message: string;
  originalError?: any;
  rawErrorJson?: string;
  canRetry: boolean;
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    debugLogger.info('Auth', 'AuthProvider mounting, getting initial session');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      debugLogger.info('Auth', 'Initial session check', {
        hasSession: !!session,
        userId: session?.user?.id,
      });
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      debugLogger.info('Auth', `Auth state changed: ${_event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
      });
      setSession(session);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      debugLogger.info('Auth', 'Loading profile for user', { userId });

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        debugLogger.error('Auth', 'Profile loading error', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        if (error.code === 'PGRST116') {
          debugLogger.warn('Auth', 'Profile not found - may need creation');
        }
        throw new Error(`Erreur lors du chargement du profil: ${error.message}`);
      }

      if (!profile) {
        debugLogger.error('Auth', 'No profile data returned', { userId });
        throw new Error('Profil utilisateur introuvable');
      }

      debugLogger.info('Auth', 'Profile loaded', {
        email: profile.email,
        name: profile.name,
        role: profile.role,
      });

      // Validate required fields
      if (!profile.email || !profile.role) {
        debugLogger.error('Auth', 'Profile missing required fields', {
          hasEmail: !!profile.email,
          hasRole: !!profile.role,
        });
        throw new Error('Profil utilisateur incomplet');
      }

      const user: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role as User['role'],
        avatar: profile.avatar_url || undefined,
      };

      // Update last_login_at (non-blocking)
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateError) {
          debugLogger.warn('Auth', 'Failed to update last_login_at', {
            message: updateError.message,
          });
        }
      } catch (updateError) {
        debugLogger.warn('Auth', 'Non-critical last_login_at update error', updateError);
      }

      debugLogger.info('Auth', `User authenticated: ${user.email} Role: ${user.role}`);
      setAuthState({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      debugLogger.error('Auth', 'Fatal error loading profile', error);
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      throw error;
    }
  };

  /**
   * Extract raw error JSON from any error object
   */
  const extractRawErrorJson = (error: any): string => {
    try {
      const raw: Record<string, any> = {};
      if (error?.message) raw.message = error.message;
      if (error?.status) raw.status = error.status;
      if (error?.statusCode) raw.statusCode = error.statusCode;
      if (error?.code) raw.code = error.code;
      if (error?.name) raw.name = error.name;
      if (error?.details) raw.details = error.details;
      if (error?.hint) raw.hint = error.hint;
      if (error?.stack) raw.stack = error.stack?.split('\n').slice(0, 3).join('\n');

      // Capture any extra properties
      if (typeof error === 'object' && error !== null) {
        for (const key of Object.keys(error)) {
          if (!(key in raw)) {
            try {
              raw[key] = error[key];
            } catch {
              raw[key] = '[unreadable]';
            }
          }
        }
      }

      return JSON.stringify(raw, null, 2);
    } catch {
      return String(error);
    }
  };

  /**
   * Categorize errors for better user feedback
   */
  const categorizeError = (error: any): AuthError => {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    const errorStatus = error?.status;
    const rawJson = extractRawErrorJson(error);

    debugLogger.info('Auth', 'Categorizing error', {
      message: errorMessage,
      code: errorCode,
      status: errorStatus,
    });

    // Network errors
    if (
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('Timeout') ||
      errorMessage.includes('AbortError') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ENETUNREACH') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('SSL') ||
      errorMessage.includes('certificate') ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT'
    ) {
      return {
        type: 'network',
        message:
          'Impossible de se connecter au serveur.\n\n' +
          'Vérifiez votre connexion internet et réessayez.',
        originalError: error,
        rawErrorJson: rawJson,
        canRetry: true,
      };
    }

    // Credential errors
    if (
      errorMessage.includes('Invalid login credentials') ||
      errorMessage.includes('invalid_credentials') ||
      errorStatus === 400 ||
      errorStatus === 401
    ) {
      return {
        type: 'credentials',
        message:
          'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.',
        originalError: error,
        rawErrorJson: rawJson,
        canRetry: false,
      };
    }

    // Email confirmation required
    if (errorMessage.includes('Email not confirmed')) {
      return {
        type: 'credentials',
        message: 'Veuillez confirmer votre email avant de vous connecter.',
        originalError: error,
        rawErrorJson: rawJson,
        canRetry: false,
      };
    }

    // Profile loading errors
    if (errorMessage.includes('profile') || errorCode === 'PGRST116') {
      return {
        type: 'profile',
        message: 'Erreur lors du chargement du profil utilisateur.',
        originalError: error,
        rawErrorJson: rawJson,
        canRetry: true,
      };
    }

    // Unknown errors - include raw error for transparency
    return {
      type: 'unknown',
      message: `Erreur inattendue: ${errorMessage}`,
      originalError: error,
      rawErrorJson: rawJson,
      canRetry: true,
    };
  };

  /**
   * Test network connectivity with timeout
   */
  const testConnectivity = async (timeoutMs: number = 8000): Promise<{ ok: boolean; rawError?: any; duration: number }> => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(0)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (error) {
        debugLogger.warn('Auth', 'Connectivity test returned error', {
          message: error.message,
          code: error.code,
          duration,
        });
        // Some errors are acceptable (like permission errors)
        const isConnected = !error.message.includes('fetch') &&
          !error.message.includes('network') &&
          !error.message.includes('Network request failed');
        return { ok: isConnected, rawError: error, duration };
      }

      return { ok: true, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      debugLogger.error('Auth', 'Connectivity test exception', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        duration,
      });
      return { ok: false, rawError: error, duration };
    }
  };

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      const error: AuthError = {
        type: 'credentials',
        message: 'Email et mot de passe requis',
        canRetry: false,
      };
      throw error;
    }

    const loginStartTime = Date.now();
    const loginAttempt: LastLoginAttempt = {
      timestamp: new Date().toISOString(),
      email,
      steps: [],
      finalResult: 'error',
      totalDuration: 0,
    };

    debugLogger.info('Auth', '===== LOGIN ATTEMPT START =====', {
      email,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      timestamp: new Date().toISOString(),
    });

    try {
      // Step 1: Test connectivity with timeout
      debugLogger.info('Auth', 'Step 1: Testing connectivity...');
      const connectivityStart = Date.now();
      const connectivityResult = await testConnectivity(8000);
      const connectivityDuration = Date.now() - connectivityStart;

      loginAttempt.steps.push({
        step: 'Connectivity Test',
        status: connectivityResult.ok ? 'success' : 'error',
        duration: connectivityDuration,
        rawError: connectivityResult.rawError,
      });

      if (!connectivityResult.ok) {
        debugLogger.error('Auth', 'Connectivity test failed', {
          duration: connectivityDuration,
          rawError: connectivityResult.rawError,
        });

        loginAttempt.finalResult = 'error';
        loginAttempt.totalDuration = Date.now() - loginStartTime;
        debugLogger.setLastLoginAttempt(loginAttempt);

        const error: AuthError = {
          type: 'network',
          message:
            'Impossible de se connecter au serveur Supabase.\n\n' +
            '📱 Vérifiez votre connexion WiFi ou données mobiles\n' +
            '🔒 Désactivez votre VPN si vous en utilisez un\n' +
            '🏢 Si vous êtes sur un réseau d\'entreprise, contactez votre IT',
          rawErrorJson: extractRawErrorJson(connectivityResult.rawError),
          canRetry: true,
        };
        throw error;
      }

      debugLogger.info('Auth', 'Connectivity test passed', { duration: connectivityDuration });

      // Step 2: Attempt authentication with timeout
      debugLogger.info('Auth', 'Step 2: Attempting authentication...');
      const authStart = Date.now();

      const authPromise = supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Auth timeout (15s) - La connexion prend trop de temps.'
              )
            ),
          15000
        )
      );

      let authData: any;
      let authError: any;

      try {
        const result = await Promise.race([authPromise, timeoutPromise]);
        authData = result.data;
        authError = result.error;
      } catch (raceError: any) {
        authError = raceError;
      }

      const authDuration = Date.now() - authStart;

      if (authError) {
        debugLogger.error('Auth', 'Authentication failed', {
          message: authError.message,
          status: authError.status,
          code: authError.code,
          name: authError.name,
          duration: authDuration,
        });

        loginAttempt.steps.push({
          step: 'Authentication (signInWithPassword)',
          status: 'error',
          duration: authDuration,
          rawError: {
            message: authError.message,
            status: authError.status,
            code: authError.code,
            name: authError.name,
            __type: authError.__isAuthError ? 'AuthApiError' : 'Unknown',
          },
        });

        loginAttempt.finalResult = 'error';
        loginAttempt.totalDuration = Date.now() - loginStartTime;
        debugLogger.setLastLoginAttempt(loginAttempt);

        throw categorizeError(authError);
      }

      if (!authData?.user) {
        debugLogger.error('Auth', 'No user data returned from auth', { authData });

        loginAttempt.steps.push({
          step: 'Authentication (signInWithPassword)',
          status: 'error',
          duration: authDuration,
          rawError: { message: 'No user data in response' },
          rawResponse: authData,
        });

        loginAttempt.finalResult = 'error';
        loginAttempt.totalDuration = Date.now() - loginStartTime;
        debugLogger.setLastLoginAttempt(loginAttempt);

        const error: AuthError = {
          type: 'unknown',
          message: 'Connexion échouée - Aucune donnée utilisateur',
          rawErrorJson: JSON.stringify({ data: authData }, null, 2),
          canRetry: true,
        };
        throw error;
      }

      loginAttempt.steps.push({
        step: 'Authentication (signInWithPassword)',
        status: 'success',
        duration: authDuration,
        rawResponse: {
          userId: authData.user.id,
          email: authData.user.email,
          hasSession: !!authData.session,
        },
      });

      debugLogger.info('Auth', 'Authentication successful', {
        userId: authData.user.id,
        duration: authDuration,
      });

      // Step 3: Load profile
      debugLogger.info('Auth', 'Step 3: Loading user profile...');
      const profileStart = Date.now();

      try {
        await loadUserProfile(authData.user.id);
        const profileDuration = Date.now() - profileStart;

        loginAttempt.steps.push({
          step: 'Profile Loading',
          status: 'success',
          duration: profileDuration,
        });

        debugLogger.info('Auth', 'Profile loaded successfully', {
          duration: profileDuration,
        });
      } catch (profileError: any) {
        const profileDuration = Date.now() - profileStart;

        debugLogger.error('Auth', 'Profile loading failed', {
          message: profileError.message,
          duration: profileDuration,
        });

        loginAttempt.steps.push({
          step: 'Profile Loading',
          status: 'error',
          duration: profileDuration,
          rawError: {
            message: profileError.message,
          },
        });

        // Fallback: Use basic auth info
        debugLogger.warn('Auth', 'Continuing with basic auth info (fallback)');

        loginAttempt.steps.push({
          step: 'Fallback to Basic Auth',
          status: 'success',
          duration: 0,
        });

        const basicUser: User = {
          id: authData.user.id,
          email: authData.user.email || email,
          name: authData.user.email?.split('@')[0] || 'User',
          role: 'VIEWER',
        };

        setAuthState({
          user: basicUser,
          isAuthenticated: true,
          isLoading: false,
        });

        loginAttempt.finalResult = 'success';
        loginAttempt.totalDuration = Date.now() - loginStartTime;
        debugLogger.setLastLoginAttempt(loginAttempt);

        debugLogger.warn('Auth', 'User logged in with basic profile (fallback)');
        return;
      }

      loginAttempt.finalResult = 'success';
      loginAttempt.totalDuration = Date.now() - loginStartTime;
      debugLogger.setLastLoginAttempt(loginAttempt);

      debugLogger.info('Auth', '===== LOGIN SUCCESS =====', {
        totalDuration: loginAttempt.totalDuration,
      });
    } catch (error: any) {
      debugLogger.error('Auth', '===== LOGIN FAILED =====', {
        type: error.type,
        message: error.message,
        rawErrorJson: error.rawErrorJson,
      });

      // Ensure login attempt is recorded
      if (loginAttempt.finalResult !== 'error') {
        loginAttempt.finalResult = 'error';
        loginAttempt.totalDuration = Date.now() - loginStartTime;
        debugLogger.setLastLoginAttempt(loginAttempt);
      }

      // Ensure we always throw an AuthError
      if (error.type) {
        throw error;
      } else {
        throw categorizeError(error);
      }
    }
  };

  const logout = async () => {
    debugLogger.info('Auth', 'Logging out');
    await supabase.auth.signOut();
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
