import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export type AuthError = {
  type: 'network' | 'credentials' | 'profile' | 'unknown';
  message: string;
  originalError?: any;
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      console.log('[AuthContext] Loading profile for user ID:', userId);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Error loading profile:', {
          message: error.message,
          code: error.code,
          details: error.details,
        });

        // If profile doesn't exist, create it from auth user
        if (error.code === 'PGRST116') {
          console.log('[AuthContext] Profile not found, this might need to be created');
        }
        throw new Error(`Erreur lors du chargement du profil: ${error.message}`);
      }

      if (!profile) {
        console.error('[AuthContext] No profile found for user ID:', userId);
        throw new Error('Profil utilisateur introuvable');
      }

      console.log('[AuthContext] Profile loaded successfully:', {
        email: profile.email,
        name: profile.name,
        role: profile.role,
        id: profile.id,
      });

      // Validate required fields
      if (!profile.email || !profile.role) {
        console.error('[AuthContext] Profile missing required fields:', profile);
        throw new Error('Profil utilisateur incomplet');
      }

      const user: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role as User['role'],
        avatar: profile.avatar_url || undefined,
      };

      // Update last_login_at
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateError) {
          console.warn('[AuthContext] Failed to update last_login_at:', updateError);
        }
      } catch (updateError) {
        console.warn('[AuthContext] Non-critical error updating last_login_at:', updateError);
      }

      console.log('[AuthContext] ✅ User authenticated:', user.email, 'Role:', user.role);
      setAuthState({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('[AuthContext] Fatal error loading profile:', error);
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      throw error;
    }
  };

  /**
   * Categorize errors for better user feedback
   */
  const categorizeError = (error: any): AuthError => {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    const errorStatus = error?.status;

    console.log('[AuthContext] Categorizing error:', {
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
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT' ||
      !navigator.onLine
    ) {
      return {
        type: 'network',
        message:
          'Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.',
        originalError: error,
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
        canRetry: false,
      };
    }

    // Email confirmation required
    if (errorMessage.includes('Email not confirmed')) {
      return {
        type: 'credentials',
        message: 'Veuillez confirmer votre email avant de vous connecter.',
        originalError: error,
        canRetry: false,
      };
    }

    // Profile loading errors
    if (errorMessage.includes('profile') || errorCode === 'PGRST116') {
      return {
        type: 'profile',
        message: 'Erreur lors du chargement du profil utilisateur.',
        originalError: error,
        canRetry: true,
      };
    }

    // Unknown errors
    return {
      type: 'unknown',
      message: `Erreur inattendue: ${errorMessage}`,
      originalError: error,
      canRetry: true,
    };
  };

  /**
   * Test network connectivity with timeout
   */
  const testConnectivity = async (timeoutMs: number = 8000): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(0)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      return !error;
    } catch (error: any) {
      console.error('[AuthContext] Connectivity test failed:', error);
      return false;
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

    console.log('[AuthContext] ===== LOGIN ATTEMPT START =====');
    console.log('[AuthContext] Email:', email);
    console.log('[AuthContext] Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
    console.log('[AuthContext] Timestamp:', new Date().toISOString());

    try {
      // Step 1: Test connectivity with timeout
      console.log('[AuthContext] Step 1: Testing connectivity...');
      const isConnected = await testConnectivity(8000);

      if (!isConnected) {
        console.error('[AuthContext] Connectivity test failed');
        const error: AuthError = {
          type: 'network',
          message:
            'Impossible de se connecter au serveur.\n\n' +
            '📱 Vérifiez votre connexion WiFi ou données mobiles\n' +
            '🔒 Désactivez votre VPN si vous en utilisez un\n' +
            '🏢 Si vous êtes sur un réseau d\'entreprise, contactez votre IT',
          canRetry: true,
        };
        throw error;
      }

      console.log('[AuthContext] ✅ Connectivity test passed');

      // Step 2: Attempt authentication with timeout
      console.log('[AuthContext] Step 2: Attempting authentication...');
      const authPromise = supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'La connexion prend trop de temps. Vérifiez votre réseau.'
              )
            ),
          15000
        )
      );

      const { data, error: authError } = await Promise.race([
        authPromise,
        timeoutPromise,
      ]);

      if (authError) {
        console.error('[AuthContext] Authentication failed:', {
          message: authError.message,
          status: authError.status,
          code: authError.code,
        });
        throw categorizeError(authError);
      }

      if (!data.user) {
        console.error('[AuthContext] No user data returned');
        const error: AuthError = {
          type: 'unknown',
          message: 'Connexion échouée - Aucune donnée utilisateur',
          canRetry: true,
        };
        throw error;
      }

      console.log('[AuthContext] ✅ Authentication successful');
      console.log('[AuthContext] User ID:', data.user.id);

      // Step 3: Load profile (non-blocking for critical errors)
      console.log('[AuthContext] Step 3: Loading user profile...');
      try {
        await loadUserProfile(data.user.id);
        console.log('[AuthContext] ✅ Profile loaded successfully');
      } catch (profileError: any) {
        console.error('[AuthContext] Profile loading failed:', profileError);

        // If profile loading fails but auth succeeded, we still consider it a success
        // The user can still use the app with basic info
        console.warn(
          '[AuthContext] ⚠️ Continuing with basic auth info despite profile error'
        );

        // Set basic user info from auth data
        const basicUser: User = {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.email?.split('@')[0] || 'User',
          role: 'VIEWER', // Default role for fallback
        };

        setAuthState({
          user: basicUser,
          isAuthenticated: true,
          isLoading: false,
        });

        // Don't throw, just log the warning
        console.warn('[AuthContext] User logged in with basic profile');
        return; // Exit successfully
      }

      console.log('[AuthContext] ===== LOGIN SUCCESS =====');
    } catch (error: any) {
      console.error('[AuthContext] ===== LOGIN FAILED =====');
      console.error('[AuthContext] Error:', error);

      // Ensure we always throw an AuthError
      if (error.type) {
        throw error; // Already an AuthError
      } else {
        throw categorizeError(error);
      }
    }
  };

  const logout = async () => {
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
