// Thème professionnel médical/pharmaceutique - Phase 8 Enhanced
export const Colors = {
  primary: '#0066CC', // Bleu Médical
  secondary: '#004C99',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: {
    primary: '#2C3E50', // Gris Ardoise foncé
    secondary: '#5A6C7D',
    tertiary: '#8B9DAD',
  },
  accent: '#00A86B', // Vert pour succès
  warning: '#FFA726',
  error: '#E53935',
  success: '#00A86B',
  border: '#E1E8ED',
  inactive: '#CBD5E0',
  // Training & Certifications Colors
  gold: '#D4AF37', // Or pour certifications premium
  bronze: '#CD7F32', // Bronze pour certifications
  emerald: '#50C878', // Vert émeraude pour statut actif/qualifié

  // Phase 8: Professional Track & Trace Status Colors
  status: {
    inProgress: '#2563EB', // Cobalt Blue - En cours
    validated: '#10B981', // Emerald Green - Validé
    pending: '#F59E0B', // Amber - En attente
    alert: '#DC2626', // Ruby Red - Alerte/Retard
    completed: '#059669', // Dark Emerald - Terminé
    blocked: '#DC2626', // Ruby - Bloqué
  },

  // Priority Colors
  priority: {
    critical: '#DC2626', // Ruby - Critique
    urgent: '#F59E0B', // Amber - Urgent
    normal: '#0066CC', // Cobalt - Normal
  },

  // Phase 9: Industrial Colors for Deviation Management
  amber: '#F59E0B', // Amber for transfer/reception actions
  ruby: '#DC2626', // Ruby Red for deviation-related elements
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    color: Colors.text.primary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    color: Colors.text.primary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: Colors.text.primary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: Colors.text.primary,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: Colors.text.tertiary,
  },
};
