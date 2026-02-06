export type UserRole = 'ADMIN' | 'PRODUCTION' | 'SUPERVISOR' | 'QA' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
