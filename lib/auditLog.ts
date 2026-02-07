/**
 * Audit Logging System for GMP Compliance
 *
 * This module provides comprehensive audit trail logging for all critical actions
 * in the Track & Trace system. All user actions, data modifications, and system
 * events are logged with full traceability for regulatory compliance.
 */

import { supabase } from './supabase';
import type { Database } from './database.types';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'SIGN'
  | 'ASSIGN'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ACCESS'
  | 'EXPORT';

export type AuditModule =
  | 'BATCH'
  | 'USER'
  | 'STEP'
  | 'DEVIATION'
  | 'SIGNATURE'
  | 'WORKFLOW'
  | 'EQUIPMENT'
  | 'TRAINING'
  | 'SYSTEM';

export interface AuditLogEntry {
  action: AuditAction;
  module: AuditModule;
  entity_type: string;
  entity_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  description: string;
  old_value?: string | null;
  new_value?: string | null;
  ip_address?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Log an audit entry to the database
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_log')
      .insert({
        action: entry.action,
        module: entry.module,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        user_id: entry.user_id,
        user_name: entry.user_name,
        user_role: entry.user_role,
        description: entry.description,
        old_value: entry.old_value,
        new_value: entry.new_value,
        ip_address: entry.ip_address,
        metadata: entry.metadata,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - audit logging should not break the main flow
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

/**
 * Log batch creation
 */
export async function logBatchCreation(
  batchId: string,
  batchNumber: string,
  userId: string,
  userName: string,
  userRole: string,
  productName: string
): Promise<void> {
  await logAudit({
    action: 'CREATE',
    module: 'BATCH',
    entity_type: 'batch',
    entity_id: batchId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Lot ${batchNumber} créé pour le produit ${productName}`,
    new_value: JSON.stringify({ batchNumber, productName }),
  });
}

/**
 * Log batch status change
 */
export async function logBatchStatusChange(
  batchId: string,
  batchNumber: string,
  userId: string,
  userName: string,
  userRole: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await logAudit({
    action: 'UPDATE',
    module: 'BATCH',
    entity_type: 'batch',
    entity_id: batchId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Statut du lot ${batchNumber} modifié de ${oldStatus} à ${newStatus}`,
    old_value: oldStatus,
    new_value: newStatus,
  });
}

/**
 * Log step assignment
 */
export async function logStepAssignment(
  stepId: string,
  stepName: string,
  userId: string,
  userName: string,
  userRole: string,
  assignedToName: string
): Promise<void> {
  await logAudit({
    action: 'ASSIGN',
    module: 'STEP',
    entity_type: 'step_instance',
    entity_id: stepId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Étape "${stepName}" assignée à ${assignedToName}`,
    new_value: assignedToName,
  });
}

/**
 * Log electronic signature
 */
export async function logElectronicSignature(
  signatureId: string,
  stepName: string,
  userId: string,
  userName: string,
  userRole: string,
  signatureOrder: number
): Promise<void> {
  await logAudit({
    action: 'SIGN',
    module: 'SIGNATURE',
    entity_type: 'electronic_signature',
    entity_id: signatureId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Signature électronique ${signatureOrder === 1 ? '1ère' : '2ème'} apposée sur l'étape "${stepName}"`,
    metadata: { signatureOrder, stepName },
  });
}

/**
 * Log deviation creation
 */
export async function logDeviationCreation(
  deviationId: string,
  batchNumber: string,
  userId: string,
  userName: string,
  userRole: string,
  severity: string,
  title: string
): Promise<void> {
  await logAudit({
    action: 'CREATE',
    module: 'DEVIATION',
    entity_type: 'deviation',
    entity_id: deviationId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Déviation ${severity} signalée sur le lot ${batchNumber}: ${title}`,
    new_value: JSON.stringify({ severity, title }),
  });
}

/**
 * Log user creation
 */
export async function logUserCreation(
  newUserId: string,
  newUserEmail: string,
  creatorId: string,
  creatorName: string,
  creatorRole: string,
  newUserRole: string
): Promise<void> {
  await logAudit({
    action: 'CREATE',
    module: 'USER',
    entity_type: 'profile',
    entity_id: newUserId,
    user_id: creatorId,
    user_name: creatorName,
    user_role: creatorRole,
    description: `Utilisateur ${newUserEmail} créé avec le rôle ${newUserRole}`,
    new_value: JSON.stringify({ email: newUserEmail, role: newUserRole }),
  });
}

/**
 * Log user update
 */
export async function logUserUpdate(
  targetUserId: string,
  targetUserEmail: string,
  updaterId: string,
  updaterName: string,
  updaterRole: string,
  changes: Record<string, any>
): Promise<void> {
  await logAudit({
    action: 'UPDATE',
    module: 'USER',
    entity_type: 'profile',
    entity_id: targetUserId,
    user_id: updaterId,
    user_name: updaterName,
    user_role: updaterRole,
    description: `Utilisateur ${targetUserEmail} modifié`,
    new_value: JSON.stringify(changes),
  });
}

/**
 * Log user deletion
 */
export async function logUserDeletion(
  targetUserId: string,
  targetUserEmail: string,
  deleterId: string,
  deleterName: string,
  deleterRole: string
): Promise<void> {
  await logAudit({
    action: 'DELETE',
    module: 'USER',
    entity_type: 'profile',
    entity_id: targetUserId,
    user_id: deleterId,
    user_name: deleterName,
    user_role: deleterRole,
    description: `Utilisateur ${targetUserEmail} supprimé`,
    old_value: targetUserEmail,
  });
}

/**
 * Get audit log entries for an entity
 */
export async function getAuditLog(
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return [];
  }
}

/**
 * Get recent audit log entries across all entities
 */
export async function getRecentAuditLog(limit: number = 100): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recent audit log:', error);
    return [];
  }
}
