import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { hasPermission, ModuleName } from '@/lib/permissions';

interface PermissionGuardProps {
  module: ModuleName;
  action: 'read' | 'write' | 'delete' | 'approve';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGuard({
  module,
  action,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        const permitted = await hasPermission(user.role, module, action);
        setHasAccess(permitted);
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [user, module, action]);

  if (loading) {
    return <View />;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component to protect screens
 */
export function withPermission(
  Component: React.ComponentType<any>,
  module: ModuleName,
  action: 'read' | 'write' | 'delete' | 'approve' = 'read'
) {
  return function PermissionProtectedComponent(props: any) {
    return (
      <PermissionGuard module={module} action={action}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
