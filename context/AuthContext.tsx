import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

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

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

    console.log('[AuthContext] Attempting login for:', email);
    console.log('[AuthContext] Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);

    try {
      // Test connection first
      const { data: healthCheck, error: healthError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (healthError) {
        console.error('[AuthContext] Connection test failed:', healthError);
        throw new Error(
          'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
        );
      }

      console.log('[AuthContext] Connection test successful');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AuthContext] Login failed:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });

        // Provide more specific error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error(
            'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.'
          );
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Veuillez confirmer votre email avant de vous connecter.');
        } else if (error.message.includes('network')) {
          throw new Error(
            'Erreur de connexion réseau. Vérifiez votre connexion internet.'
          );
        } else {
          throw new Error(`Erreur de connexion: ${error.message}`);
        }
      }

      if (data.user) {
        console.log('[AuthContext] Login successful for user ID:', data.user.id);
        console.log('[AuthContext] Loading profile...');
        await loadUserProfile(data.user.id);
        console.log('[AuthContext] Profile loaded successfully');
      } else {
        console.error('[AuthContext] No user data returned from login');
        throw new Error('Connexion échouée - Aucune donnée utilisateur');
      }
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      // Re-throw the error to be handled by the UI
      throw error;
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
