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
  | 'EXPORT'
  | 'RECEIVED'            // Phase 9: Batch ownership received
  | 'TRANSFERRED'         // Phase 9: Batch ownership transferred
  | 'SCAN_VIEW'           // Phase 9: QR code scanned to view
  | 'DEVIATION_ADDED'     // Phase 9: Deviation logged
  | 'LOT_CREATED_DRAFT'   // Phase 10: Draft batch created
  | 'QR_GENERATED'        // Phase 10: QR token generated
  | 'AUTO_ASSIGNED'       // Phase 10: Batch auto-assigned by rule
  | 'PRODUCT_ADDED'       // Phase 11: Product added to catalog
  | 'PRODUCT_MODIFIED'    // Phase 11: Product modified in catalog
  | 'PRODUCT_ARCHIVED';   // Phase 11: Product archived (set inactive)

export type AuditModule =
  | 'BATCH'
  | 'USER'
  | 'STEP'
  | 'DEVIATION'
  | 'SIGNATURE'
  | 'WORKFLOW'
  | 'EQUIPMENT'
  | 'TRAINING'
  | 'PRODUCT'             // Phase 11: Product catalog module
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
      .from('audit_trail')
      .insert({
        action_type: entry.action,
        event_type: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        user_id: entry.user_id,
        user_name: entry.user_name,
        user_role: entry.user_role,
        description: entry.description,
        old_value: entry.old_value ? JSON.parse(JSON.stringify(entry.old_value)) : null,
        new_value: entry.new_value ? JSON.parse(JSON.stringify(entry.new_value)) : null,
        ip_address: entry.ip_address,
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

/**
 * Phase 9: Log batch ownership received
 */
export async function logBatchReceived(
  batchId: string,
  batchNumber: string,
  userId: string,
  userName: string,
  userRole: string,
  previousOwner: string | null
): Promise<void> {
  await logAudit({
    action: 'RECEIVED',
    module: 'BATCH',
    entity_type: 'batch',
    entity_id: batchId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Lot ${batchNumber} reçu par ${userName}${previousOwner ? ` (précédemment: ${previousOwner})` : ''}`,
    old_value: previousOwner,
    new_value: userName,
    metadata: { batchNumber, previousOwner, newOwner: userName },
  });
}

/**
 * Phase 9: Log batch ownership transferred
 */
export async function logBatchTransferred(
  batchId: string,
  batchNumber: string,
  transferredById: string,
  transferredByName: string,
  transferredByRole: string,
  fromOwner: string | null,
  toOwner: string,
  notes?: string
): Promise<void> {
  await logAudit({
    action: 'TRANSFERRED',
    module: 'BATCH',
    entity_type: 'batch',
    entity_id: batchId,
    user_id: transferredById,
    user_name: transferredByName,
    user_role: transferredByRole,
    description: `Lot ${batchNumber} transféré ${fromOwner ? `de ${fromOwner} ` : ''}à ${toOwner}`,
    old_value: fromOwner,
    new_value: toOwner,
    metadata: { batchNumber, fromOwner, toOwner, transferredBy: transferredByName, notes },
  });
}

/**
 * Phase 9: Log QR code scan view
 */
export async function logScanView(
  batchId: string,
  batchNumber: string,
  userId: string,
  userName: string,
  userRole: string,
  currentOwner: string | null
): Promise<void> {
  await logAudit({
    action: 'SCAN_VIEW',
    module: 'BATCH',
    entity_type: 'batch',
    entity_id: batchId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Lot ${batchNumber} scanné par ${userName}`,
    metadata: { batchNumber, viewer: userName, currentOwner },
  });
}

/**
 * Phase 9: Log deviation added (enhanced version)
 */
export async function logDeviationAdded(
  deviationId: string,
  batchId: string,
  batchNumber: string,
  userId: string,
  userName: string,
  userRole: string,
  deviationType: string,
  severity: string,
  title: string
): Promise<void> {
  await logAudit({
    action: 'DEVIATION_ADDED',
    module: 'DEVIATION',
    entity_type: 'deviation',
    entity_id: deviationId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Déviation ${severity} ajoutée au lot ${batchNumber}: ${title} (${deviationType})`,
    new_value: JSON.stringify({ severity, title, deviationType }),
    metadata: { batchId, batchNumber, deviationType, severity, title },
  });
}

/**
 * Phase 10: Log draft batch creation
 */
export async function logDraftBatchCreation(
  batchId: string,
  batchNumber: string,
  userId: string,
  userName: string,
  userRole: string,
  productName: string
): Promise<void> {
  await logAudit({
    action: 'LOT_CREATED_DRAFT',
    module: 'BATCH',
    entity_type: 'batch',
    entity_id: batchId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Lot ${batchNumber} créé en mode brouillon pour le produit ${productName}`,
    new_value: JSON.stringify({ batchNumber, productName, status: 'brouillon' }),
    metadata: { batchNumber, productName, draftMode: true },
  });
}

/**
 * Phase 10: Log QR token generation
 */
export async function logQRGeneration(
  batchId: string,
  batchNumber: string,
  userId: string,
  userName: string,
  userRole: string,
  qrToken: string
): Promise<void> {
  await logAudit({
    action: 'QR_GENERATED',
    module: 'BATCH',
    entity_type: 'batch',
    entity_id: batchId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `QR token généré pour le lot ${batchNumber}`,
    new_value: qrToken,
    metadata: { batchNumber, qrToken },
  });
}

/**
 * Phase 10: Log automatic assignment by rule
 */
export async function logAutoAssignment(
  batchId: string,
  batchNumber: string,
  userId: string, // The system user or admin who triggered the rule
  userName: string,
  userRole: string,
  assignedToUserId: string,
  assignedToName: string,
  ruleId: string,
  ruleType: 'fixed_user' | 'round_robin' | 'least_active'
): Promise<void> {
  await logAudit({
    action: 'AUTO_ASSIGNED',
    module: 'BATCH',
    entity_type: 'batch',
    entity_id: batchId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Lot ${batchNumber} automatiquement assigné à ${assignedToName} via règle ${ruleType}`,
    new_value: assignedToName,
    metadata: {
      batchNumber,
      assignedToUserId,
      assignedToName,
      ruleId,
      ruleType,
      automatic: true,
    },
  });
}

/**
 * Phase 11: Log product addition to catalog
 */
export async function logProductAdded(
  productId: string,
  productCode: string,
  productName: string,
  userId: string,
  userName: string,
  userRole: string
): Promise<void> {
  await logAudit({
    action: 'PRODUCT_ADDED',
    module: 'PRODUCT',
    entity_type: 'product',
    entity_id: productId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Produit ${productCode} - ${productName} ajouté au catalogue`,
    new_value: JSON.stringify({ productCode, productName }),
    metadata: { productCode, productName },
  });
}

/**
 * Phase 11: Log product modification in catalog
 */
export async function logProductModified(
  productId: string,
  productCode: string,
  userId: string,
  userName: string,
  userRole: string,
  changes: Record<string, any>
): Promise<void> {
  await logAudit({
    action: 'PRODUCT_MODIFIED',
    module: 'PRODUCT',
    entity_type: 'product',
    entity_id: productId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Produit ${productCode} modifié`,
    new_value: JSON.stringify(changes),
    metadata: { productCode, changes },
  });
}

/**
 * Phase 11: Log product archiving (set inactive)
 */
export async function logProductArchived(
  productId: string,
  productCode: string,
  productName: string,
  userId: string,
  userName: string,
  userRole: string
): Promise<void> {
  await logAudit({
    action: 'PRODUCT_ARCHIVED',
    module: 'PRODUCT',
    entity_type: 'product',
    entity_id: productId,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    description: `Produit ${productCode} - ${productName} archivé (inactif)`,
    old_value: 'active',
    new_value: 'inactive',
    metadata: { productCode, productName, archived: true },
  });
}
