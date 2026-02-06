# Configuration de l'Authentification

## Étapes à suivre

### 1. Connecter Supabase au projet

Pour activer l'authentification réelle, vous devez :

1. Connecter Supabase à votre projet depuis l'interface
2. Les variables d'environnement suivantes seront automatiquement ajoutées :
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_AUTH_BROKER_URL`

### 2. Utiliser le skill "auth"

Une fois Supabase connecté, exécutez :

```bash
# Le skill auth configurera automatiquement @fastshot/auth
```

Le skill auth va :
- Installer `@fastshot/auth` et `@supabase/supabase-js`
- Configurer l'Auth Broker
- Remplacer le mock d'authentification actuel par l'authentification réelle
- Configurer Google et Apple OAuth (si nécessaire)

### 3. Fichiers concernés

Le skill auth mettra à jour automatiquement :
- `/context/AuthContext.tsx` : Remplacera le mock par l'authentification Supabase
- Configuration des fournisseurs OAuth dans Supabase

## Fonctionnalités actuelles (Mock)

L'application fonctionne actuellement avec un système d'authentification temporaire :
- ✅ N'importe quel email/mot de passe est accepté
- ✅ La session persiste via AsyncStorage
- ✅ Navigation protégée fonctionnelle
- ✅ Interface de connexion complète

## Après intégration Supabase

L'application aura :
- 🔒 Authentification sécurisée avec Supabase
- 🔒 Support Google et Apple OAuth
- 🔒 Réinitialisation de mot de passe
- 🔒 Gestion des rôles utilisateurs (ADMIN, PRODUCTION, etc.)
- 🔒 Tokens JWT pour les APIs

## Structure de la base de données (à créer)

```sql
-- Table users (gérée par Supabase Auth)

-- Table user_profiles
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('ADMIN', 'PRODUCTION', 'SUPERVISOR', 'QA', 'VIEWER')),
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);
```
