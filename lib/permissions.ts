import { supabase } from './supabase';
import type { UserRole } from '@/types/auth';

export interface Permission {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

export interface RolePermissions {
  [module: string]: Permission;
}

// Cache for role permissions
let rolePermissionsCache: Map<UserRole, RolePermissions> = new Map();

/**
 * Load permissions for a specific role from the database
 */
export async function loadRolePermissions(role: UserRole): Promise<RolePermissions> {
  // Check cache first
  if (rolePermissionsCache.has(role)) {
    return rolePermissionsCache.get(role)!;
  }

  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', role);

    if (error) throw error;

    const permissions: RolePermissions = {};
    data?.forEach((perm) => {
      permissions[perm.module] = {
        can_read: perm.can_read ?? false,
        can_write: perm.can_write ?? false,
        can_delete: perm.can_delete ?? false,
        can_approve: perm.can_approve ?? false,
      };
    });

    // Cache the results
    rolePermissionsCache.set(role, permissions);
    return permissions;
  } catch (error) {
    console.error('Error loading role permissions:', error);
    return {};
  }
}

/**
 * Check if a user has permission to perform an action on a module
 */
export async function hasPermission(
  role: UserRole,
  module: string,
  action: 'read' | 'write' | 'delete' | 'approve'
): Promise<boolean> {
  // Admin always has full permissions
  if (role === 'ADMIN') {
    return true;
  }

  const permissions = await loadRolePermissions(role);
  const modulePermission = permissions[module];

  if (!modulePermission) {
    return false;
  }

  switch (action) {
    case 'read':
      return modulePermission.can_read;
    case 'write':
      return modulePermission.can_write;
    case 'delete':
      return modulePermission.can_delete;
    case 'approve':
      return modulePermission.can_approve;
    default:
      return false;
  }
}

/**
 * Get all permissions for a role
 */
export async function getRolePermissions(role: UserRole): Promise<RolePermissions> {
  return loadRolePermissions(role);
}

/**
 * Clear the permissions cache (useful after permission updates)
 */
export function clearPermissionsCache() {
  rolePermissionsCache.clear();
}

/**
 * Hook to check permissions in React components
 */
export function usePermissions() {
  return {
    hasPermission,
    getRolePermissions,
    clearCache: clearPermissionsCache,
  };
}

// Module names for type safety
export const MODULES = {
  DASHBOARD: 'dashboard',
  EQUIPMENT: 'equipment',
  TRAINING: 'training',
  EBMR: 'ebmr',
  QUALITY: 'quality',
  AUDIT_TRAIL: 'audit_trail',
  BATCHES: 'batches',
  DEVIATIONS: 'deviations',
  WORKFLOWS: 'workflows',
  USERS: 'users',
} as const;

export type ModuleName = typeof MODULES[keyof typeof MODULES];
