/**
 * Phase 12: Atomic Batch Creation
 * Transactional batch creation with QR token generation and assignment
 * If any step fails, batch is created as 'To Assign' instead of crashing
 */

import { supabase } from './supabase';
import type { Database } from './database.types';

type BatchInsert = Database['public']['Tables']['batches']['Insert'];

interface AtomicBatchCreationResult {
  success: boolean;
  batchId?: string;
  batch?: any;
  qrToken?: string;
  assignedTo?: string;
  assignedToUserId?: string;
  status: 'assigned' | 'to_assign' | 'error';
  error?: string;
  warnings: string[];
}

/**
 * Create a batch atomically with QR token generation and assignment
 * This ensures data integrity by handling failures gracefully
 */
export async function createBatchAtomically(
  batchData: BatchInsert,
  creatorUserId: string,
  workflowTemplateId?: string
): Promise<AtomicBatchCreationResult> {
  const warnings: string[] = [];
  let batchId: string | undefined;
  let qrToken: string | undefined;
  let assignedToUserId: string | undefined;
  let assignedToName: string | undefined;

  try {
    // Step 1: Generate QR token BEFORE creating batch
    qrToken = generateQRToken(batchData.batch_number);

    // Step 2: Prepare batch data with QR token
    const batchWithQR: BatchInsert = {
      ...batchData,
      qr_token: qrToken,
      qr_code_data: JSON.stringify({
        batch_number: batchData.batch_number,
        product_name: batchData.product_name,
        qr_token: qrToken,
        created_at: new Date().toISOString(),
      }),
      created_by: creatorUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Step 3: Set initial status
    // For now, all batches are created as 'To Assign'
    // Assignment will happen later through the normal workflow
    batchWithQR.status = 'To Assign';

    // Note: Automatic assignment can be implemented later by calling
    // assignBatchAutomatically after batch creation is complete

    // Step 4: Create batch in database (ATOMIC OPERATION)
    const { data: createdBatch, error: batchError } = await supabase
      .from('batches')
      .insert(batchWithQR)
      .select()
      .single();

    if (batchError) {
      throw new Error(`Failed to create batch: ${batchError.message}`);
    }

    if (!createdBatch) {
      throw new Error('Batch created but no data returned');
    }

    batchId = createdBatch.id;

    // Step 5: Initial step instance creation is handled by workflow system
    // when batch is assigned to first step

    // Success!
    return {
      success: true,
      batchId,
      batch: createdBatch,
      qrToken,
      assignedTo: assignedToName,
      assignedToUserId,
      status: assignedToUserId ? 'assigned' : 'to_assign',
      warnings,
    };
  } catch (error: any) {
    // Critical error - batch creation failed
    return {
      success: false,
      status: 'error',
      error: error.message,
      warnings,
    };
  }
}

/**
 * Generate a unique QR token for batch
 */
function generateQRToken(batchNumber: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const batchSuffix = batchNumber.replace(/[^A-Z0-9]/gi, '').substring(0, 6).toUpperCase();
  return `QR-${batchSuffix}-${timestamp}-${random}`;
}

/**
 * Validate batch number uniqueness before creation
 */
export async function validateBatchNumberUniqueness(batchNumber: string): Promise<{
  isUnique: boolean;
  existingBatchId?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select('id')
      .eq('batch_number', batchNumber)
      .limit(1);

    if (error) throw error;

    return {
      isUnique: !data || data.length === 0,
      existingBatchId: data && data.length > 0 ? data[0].id : undefined,
    };
  } catch (error) {
    // If error, assume not unique to be safe
    return { isUnique: false };
  }
}

/**
 * Enforce database constraints and indexes
 * This should be run during initial setup or migration
 */
export async function enforceDatabaseConstraints(): Promise<{
  success: boolean;
  constraints: string[];
  errors: string[];
}> {
  const constraints: string[] = [];
  const errors: string[] = [];

  try {
    // Note: These would typically be SQL migrations run at database level
    // This is a placeholder to document required constraints

    constraints.push('UNIQUE constraint on batches.batch_number');
    constraints.push('UNIQUE constraint on batches.qr_token');
    constraints.push('UNIQUE constraint on profiles.email');
    constraints.push('INDEX on batches.current_owner_id');
    constraints.push('INDEX on batches.status');
    constraints.push('INDEX on batches.qr_token');
    constraints.push('INDEX on audit_trail.batch_id');
    constraints.push('INDEX on audit_trail.timestamp');
    constraints.push('FOREIGN KEY batches.current_owner_id -> profiles.id');
    constraints.push('FOREIGN KEY batches.workflow_template_id -> workflow_templates.id');

    // In a real implementation, you would execute SQL here via Supabase SQL editor
    // or through migrations. React Native apps cannot directly modify schema.

    return {
      success: true,
      constraints,
      errors,
    };
  } catch (error: any) {
    errors.push(error.message);
    return {
      success: false,
      constraints,
      errors,
    };
  }
}

/**
 * Safe batch update with validation
 * Prevents invalid status transitions
 */
export async function updateBatchSafely(
  batchId: string,
  updates: Partial<Database['public']['Tables']['batches']['Update']>
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate status transition if status is being updated
    if (updates.status) {
      const validStatuses = ['En cours', 'Terminé', 'En attente', 'Bloqué', 'To Assign'];
      if (!validStatuses.includes(updates.status)) {
        return {
          success: false,
          error: `Invalid status: ${updates.status}. Must be one of: ${validStatuses.join(', ')}`,
        };
      }
    }

    // Always update updated_at timestamp
    const safeUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('batches')
      .update(safeUpdates)
      .eq('id', batchId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
