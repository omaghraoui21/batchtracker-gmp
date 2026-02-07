/**
 * Phase 12: DB Audit & Repair System
 * Industrial-grade database integrity checking and repair utilities for GMP compliance
 */

import { supabase } from './supabase';
import type {
  IntegrityReport,
  IntegrityCheck,
  DiagnosticStatus,
  RepairAction,
  RepairReport,
} from '@/types/dbAudit';

/**
 * Run comprehensive database integrity audit
 */
export async function runDatabaseAudit(): Promise<IntegrityReport> {
  const timestamp = new Date().toISOString();
  const checks: IntegrityCheck[] = [];

  // 1. User Integrity Checks
  const userChecks = await auditUsers();
  checks.push(...userChecks);

  // 2. Batch/Lot Integrity Checks
  const batchChecks = await auditBatches();
  checks.push(...batchChecks);

  // 3. Audit Events Integrity Checks
  const auditChecks = await auditAuditEvents();
  checks.push(...auditChecks);

  // 4. Workflow Integrity Checks
  const workflowChecks = await auditWorkflow();
  checks.push(...workflowChecks);

  // Calculate summary
  const passedChecks = checks.filter((c) => c.status === 'pass').length;
  const warningChecks = checks.filter((c) => c.status === 'warning').length;
  const criticalChecks = checks.filter((c) => c.status === 'critical').length;

  const overallStatus: DiagnosticStatus =
    criticalChecks > 0 ? 'critical' : warningChecks > 0 ? 'warning' : 'pass';

  // Generate statistics
  const statistics = await generateStatistics();

  return {
    timestamp,
    overallStatus,
    checks,
    summary: {
      totalChecks: checks.length,
      passedChecks,
      warningChecks,
      criticalChecks,
    },
    statistics,
  };
}

/**
 * Audit Users table
 */
async function auditUsers(): Promise<IntegrityCheck[]> {
  const checks: IntegrityCheck[] = [];

  try {
    // Fetch all users (profiles)
    // Note: Using 'as any' due to incomplete database types
    const { data: users, error } = await supabase
      .from('profiles' as any)
      .select('*');

    if (error) throw error;

    // Check 1: Email uniqueness
    const emails = users?.map((u: any) => u.email?.toLowerCase()) || [];
    const duplicateEmails = emails.filter((e: string, i: number) => e && emails.indexOf(e) !== i);
    const uniqueDuplicates = [...new Set(duplicateEmails)];

    checks.push({
      category: 'Users',
      checkName: 'Email Uniqueness',
      status: uniqueDuplicates.length > 0 ? 'critical' : 'pass',
      message:
        uniqueDuplicates.length > 0
          ? `${uniqueDuplicates.length} duplicate email(s) detected`
          : 'All emails are unique',
      details: {
        count: uniqueDuplicates.length,
        duplicates: uniqueDuplicates.slice(0, 5) as string[],
      },
    });

    // Check 2: Valid roles
    const validRoles = ['ADMIN', 'PRODUCTION', 'SUPERVISOR', 'QA', 'VIEWER'];
    const invalidRoleUsers = users?.filter((u: any) => !validRoles.includes(u.role)) || [];

    checks.push({
      category: 'Users',
      checkName: 'Valid Roles',
      status: invalidRoleUsers.length > 0 ? 'critical' : 'pass',
      message:
        invalidRoleUsers.length > 0
          ? `${invalidRoleUsers.length} user(s) with invalid roles`
          : 'All users have valid roles',
      details: {
        count: invalidRoleUsers.length,
        examples: invalidRoleUsers.slice(0, 3).map((u: any) => `${u.email}: ${u.role}`),
      },
    });

    // Check 3: Manufacturing units presence
    const usersWithoutUnits = users?.filter(
      (u: any) => u.role !== 'ADMIN' && u.role !== 'VIEWER' && !u.manufacturing_unit
    ) || [];

    checks.push({
      category: 'Users',
      checkName: 'Manufacturing Units',
      status: usersWithoutUnits.length > 0 ? 'warning' : 'pass',
      message:
        usersWithoutUnits.length > 0
          ? `${usersWithoutUnits.length} operational user(s) without manufacturing unit`
          : 'All operational users have manufacturing units',
      details: {
        count: usersWithoutUnits.length,
        examples: usersWithoutUnits.slice(0, 3).map((u: any) => u.email),
      },
    });
  } catch (error: any) {
    checks.push({
      category: 'Users',
      checkName: 'User Audit',
      status: 'critical',
      message: `Failed to audit users: ${error.message}`,
    });
  }

  return checks;
}

/**
 * Audit Batches table
 */
async function auditBatches(): Promise<IntegrityCheck[]> {
  const checks: IntegrityCheck[] = [];

  try {
    // Fetch all batches
    const { data: batches, error } = await supabase
      .from('batches')
      .select('*');

    if (error) throw error;

    // Check 1: Unique lot numbers
    const lotNumbers = batches?.map((b) => b.batch_number) || [];
    const duplicateLots = lotNumbers.filter((n, i) => lotNumbers.indexOf(n) !== i);
    const uniqueDuplicateLots = [...new Set(duplicateLots)];

    checks.push({
      category: 'Batches',
      checkName: 'Lot Number Uniqueness',
      status: uniqueDuplicateLots.length > 0 ? 'critical' : 'pass',
      message:
        uniqueDuplicateLots.length > 0
          ? `${uniqueDuplicateLots.length} duplicate lot number(s)`
          : 'All lot numbers are unique',
      details: {
        count: uniqueDuplicateLots.length,
        duplicates: uniqueDuplicateLots.slice(0, 5),
      },
    });

    // Check 2: QR token uniqueness
    const qrTokens = batches?.filter((b) => b.qr_token).map((b) => b.qr_token) || [];
    const duplicateQR = qrTokens.filter((t, i) => qrTokens.indexOf(t) !== i);
    const uniqueDuplicateQR = [...new Set(duplicateQR)].filter(Boolean);

    checks.push({
      category: 'Batches',
      checkName: 'QR Token Uniqueness',
      status: uniqueDuplicateQR.length > 0 ? 'critical' : 'pass',
      message:
        uniqueDuplicateQR.length > 0
          ? `${uniqueDuplicateQR.length} duplicate QR token(s)`
          : 'All QR tokens are unique',
      details: {
        count: uniqueDuplicateQR.length,
        duplicates: uniqueDuplicateQR.slice(0, 5) as string[],
      },
    });

    // Check 3: Missing QR tokens
    const missingQR = batches?.filter((b) => !b.qr_token) || [];

    checks.push({
      category: 'Batches',
      checkName: 'QR Token Presence',
      status: missingQR.length > 0 ? 'warning' : 'pass',
      message:
        missingQR.length > 0
          ? `${missingQR.length} batch(es) without QR token`
          : 'All batches have QR tokens',
      details: {
        count: missingQR.length,
        missing: missingQR.slice(0, 5).map((b) => b.batch_number),
      },
    });

    // Check 4: Orphaned batches (invalid owner references)
    const { data: profiles } = await supabase.from('profiles' as any).select('id');
    const validUserIds = new Set(profiles?.map((p: any) => p.id) || []);
    const orphanedBatches = batches?.filter(
      (b) => b.current_owner_id && !validUserIds.has(b.current_owner_id)
    ) || [];

    checks.push({
      category: 'Batches',
      checkName: 'Valid Owner References',
      status: orphanedBatches.length > 0 ? 'critical' : 'pass',
      message:
        orphanedBatches.length > 0
          ? `${orphanedBatches.length} batch(es) with invalid owner references`
          : 'All batch owners are valid',
      details: {
        count: orphanedBatches.length,
        orphans: orphanedBatches.slice(0, 5).map((b) => b.batch_number),
      },
    });

    // Check 5: Valid status values
    const validStatuses = ['En cours', 'Terminé', 'En attente', 'Bloqué', 'To Assign'];
    const invalidStatus = batches?.filter((b) => !validStatuses.includes(b.status)) || [];

    checks.push({
      category: 'Batches',
      checkName: 'Valid Status Values',
      status: invalidStatus.length > 0 ? 'warning' : 'pass',
      message:
        invalidStatus.length > 0
          ? `${invalidStatus.length} batch(es) with invalid status`
          : 'All batches have valid status',
      details: {
        count: invalidStatus.length,
        examples: invalidStatus.slice(0, 3).map((b) => `${b.batch_number}: ${b.status}`),
      },
    });

    // Check 6: Missing initial steps
    const missingSteps = batches?.filter((b) => !b.current_step_id) || [];

    checks.push({
      category: 'Batches',
      checkName: 'Initial Step Presence',
      status: missingSteps.length > 0 ? 'warning' : 'pass',
      message:
        missingSteps.length > 0
          ? `${missingSteps.length} batch(es) without current step`
          : 'All batches have current step',
      details: {
        count: missingSteps.length,
        missing: missingSteps.slice(0, 5).map((b) => b.batch_number),
      },
    });
  } catch (error: any) {
    checks.push({
      category: 'Batches',
      checkName: 'Batch Audit',
      status: 'critical',
      message: `Failed to audit batches: ${error.message}`,
    });
  }

  return checks;
}

/**
 * Audit audit_trail table
 */
async function auditAuditEvents(): Promise<IntegrityCheck[]> {
  const checks: IntegrityCheck[] = [];

  try {
    // Fetch recent audit events
    const { data: events, error } = await supabase
      .from('audit_trail')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (error) throw error;

    // Check 1: Valid batch references
    const { data: batches } = await supabase.from('batches').select('id');
    const validBatchIds = new Set(batches?.map((b) => b.id) || []);
    const orphanedEvents = events?.filter(
      (e) => e.batch_id && !validBatchIds.has(e.batch_id)
    ) || [];

    checks.push({
      category: 'Audit Events',
      checkName: 'Valid Batch References',
      status: orphanedEvents.length > 0 ? 'warning' : 'pass',
      message:
        orphanedEvents.length > 0
          ? `${orphanedEvents.length} audit event(s) with invalid batch references`
          : 'All audit events have valid batch references',
      details: {
        count: orphanedEvents.length,
        orphans: orphanedEvents.slice(0, 5).map((e) => e.id),
      },
    });

    // Check 2: Timestamp presence
    const missingTimestamp = events?.filter((e) => !e.timestamp) || [];

    checks.push({
      category: 'Audit Events',
      checkName: 'Timestamp Presence',
      status: missingTimestamp.length > 0 ? 'critical' : 'pass',
      message:
        missingTimestamp.length > 0
          ? `${missingTimestamp.length} audit event(s) without timestamp`
          : 'All audit events have timestamps',
      details: {
        count: missingTimestamp.length,
        missing: missingTimestamp.slice(0, 5).map((e) => e.id),
      },
    });

    // Check 3: Valid actor (user) references
    const { data: profiles } = await supabase.from('profiles' as any).select('id');
    const validUserIds = new Set(profiles?.map((p: any) => p.id) || []);
    const invalidActors = events?.filter(
      (e) => e.user_id && !validUserIds.has(e.user_id)
    ) || [];

    checks.push({
      category: 'Audit Events',
      checkName: 'Valid Actor References',
      status: invalidActors.length > 0 ? 'warning' : 'pass',
      message:
        invalidActors.length > 0
          ? `${invalidActors.length} audit event(s) with invalid actor references`
          : 'All audit events have valid actor references',
      details: {
        count: invalidActors.length,
        examples: invalidActors.slice(0, 5).map((e) => e.id),
      },
    });
  } catch (error: any) {
    checks.push({
      category: 'Audit Events',
      checkName: 'Audit Event Check',
      status: 'critical',
      message: `Failed to audit audit events: ${error.message}`,
    });
  }

  return checks;
}

/**
 * Audit Workflow tables
 */
async function auditWorkflow(): Promise<IntegrityCheck[]> {
  const checks: IntegrityCheck[] = [];

  try {
    // Fetch workflow templates and steps
    const { data: templates, error: templateError } = await supabase
      .from('workflow_templates' as any)
      .select('*');

    const { data: steps, error: stepsError } = await supabase
      .from('step_definitions' as any)
      .select('*');

    if (templateError) throw templateError;
    if (stepsError) throw stepsError;

    // Check 1: Valid SLA targets
    const invalidSLA = steps?.filter((s: any) => {
      if (!s.sla_hours) return false;
      const sla = parseInt(s.sla_hours as any);
      return isNaN(sla) || sla <= 0 || sla > 720; // Max 30 days
    }) || [];

    checks.push({
      category: 'Workflow',
      checkName: 'Valid SLA Targets',
      status: invalidSLA.length > 0 ? 'warning' : 'pass',
      message:
        invalidSLA.length > 0
          ? `${invalidSLA.length} step(s) with invalid SLA targets`
          : 'All steps have valid SLA targets',
      details: {
        count: invalidSLA.length,
        examples: invalidSLA.slice(0, 3).map((s: any) => `${s.step_name}: ${s.sla_hours}h`),
      },
    });

    // Check 2: Duplicate step names within same template
    const templateSteps = new Map<string, string[]>();
    steps?.forEach((s: any) => {
      if (!s.workflow_template_id) return;
      const existing = templateSteps.get(s.workflow_template_id) || [];
      existing.push(s.step_name);
      templateSteps.set(s.workflow_template_id, existing);
    });

    const duplicateSteps: string[] = [];
    templateSteps.forEach((names, templateId) => {
      const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
      duplicates.forEach((d) => duplicateSteps.push(`${templateId}:${d}`));
    });

    checks.push({
      category: 'Workflow',
      checkName: 'Unique Step Names',
      status: duplicateSteps.length > 0 ? 'warning' : 'pass',
      message:
        duplicateSteps.length > 0
          ? `${duplicateSteps.length} duplicate step name(s) found`
          : 'All step names are unique within their templates',
      details: {
        count: duplicateSteps.length,
        duplicates: duplicateSteps.slice(0, 5),
      },
    });

    // Check 3: Rule eligibility
    const { data: rules } = await supabase
      .from('assignment_rules')
      .select('*, step_definition_id');

    const invalidRules = rules?.filter((r: any) => {
      if (r.rule_type === 'fixed_user' && !r.fixed_user_id) return true;
      if (r.rule_type === 'round_robin' && (!r.eligible_user_ids || r.eligible_user_ids.length === 0)) return true;
      return false;
    }) || [];

    checks.push({
      category: 'Workflow',
      checkName: 'Valid Assignment Rules',
      status: invalidRules.length > 0 ? 'warning' : 'pass',
      message:
        invalidRules.length > 0
          ? `${invalidRules.length} assignment rule(s) with invalid configuration`
          : 'All assignment rules are properly configured',
      details: {
        count: invalidRules.length,
        examples: invalidRules.slice(0, 3).map((r: any) => `Rule ${r.id}: ${r.rule_type}`),
      },
    });
  } catch (error: any) {
    checks.push({
      category: 'Workflow',
      checkName: 'Workflow Audit',
      status: 'critical',
      message: `Failed to audit workflow: ${error.message}`,
    });
  }

  return checks;
}

/**
 * Generate statistics for the audit report
 */
async function generateStatistics() {
  const stats = {
    users: { total: 0, duplicateEmails: 0, invalidRoles: 0, missingUnits: 0 },
    batches: {
      total: 0,
      duplicateLotNumbers: 0,
      duplicateQRTokens: 0,
      missingQRTokens: 0,
      orphanedBatches: 0,
      invalidStatus: 0,
      missingSteps: 0,
    },
    auditEvents: { total: 0, orphanedEvents: 0, missingTimestamps: 0, invalidActors: 0 },
    workflow: { totalTemplates: 0, totalSteps: 0, invalidSLA: 0, duplicateSteps: 0 },
  };

  try {
    // User stats
    const { data: users, count: userCount } = await supabase
      .from('profiles' as any)
      .select('*', { count: 'exact' });
    stats.users.total = userCount || 0;

    // Batch stats
    const { data: batches, count: batchCount } = await supabase
      .from('batches')
      .select('*', { count: 'exact' });
    stats.batches.total = batchCount || 0;
    stats.batches.missingQRTokens = batches?.filter((b) => !b.qr_token).length || 0;

    // Audit event stats
    const { count: auditCount } = await supabase
      .from('audit_trail')
      .select('*', { count: 'exact', head: true });
    stats.auditEvents.total = auditCount || 0;

    // Workflow stats
    const { count: templateCount } = await supabase
      .from('workflow_templates' as any)
      .select('*', { count: 'exact', head: true });
    const { count: stepCount } = await supabase
      .from('step_definitions' as any)
      .select('*', { count: 'exact', head: true });
    stats.workflow.totalTemplates = templateCount || 0;
    stats.workflow.totalSteps = stepCount || 0;
  } catch (error) {
    console.error('Error generating statistics:', error);
  }

  return stats;
}

/**
 * Run safe-mode automatic repair
 */
export async function runSafeModeRepair(
  integrityReport: IntegrityReport
): Promise<RepairReport> {
  const timestamp = new Date().toISOString();
  const actions: RepairAction[] = [];
  const errors: string[] = [];

  // Generate repair actions based on the integrity report
  const proposedActions = await generateRepairActions(integrityReport);

  let appliedActions = 0;
  let failedActions = 0;

  // Apply each repair action
  for (const action of proposedActions) {
    try {
      await applyRepairAction(action);
      actions.push(action);
      appliedActions++;
    } catch (error: any) {
      errors.push(`Failed to apply ${action.type} for ${action.entityId}: ${error.message}`);
      failedActions++;
    }
  }

  // Re-run audit to get after summary
  const afterAudit = await runDatabaseAudit();

  return {
    timestamp,
    actions: proposedActions,
    beforeSummary: integrityReport.summary,
    afterSummary: afterAudit.summary,
    appliedActions,
    failedActions,
    errors,
  };
}

/**
 * Generate repair actions from integrity report
 */
async function generateRepairActions(report: IntegrityReport): Promise<RepairAction[]> {
  const actions: RepairAction[] = [];

  // Generate actions for orphaned batches
  const orphanedBatchCheck = report.checks.find(
    (c) => c.category === 'Batches' && c.checkName === 'Valid Owner References'
  );
  if (orphanedBatchCheck && orphanedBatchCheck.details?.orphans) {
    for (const orphan of orphanedBatchCheck.details.orphans) {
      actions.push({
        id: `repair_orphan_${orphan}`,
        type: 'reassign_orphan',
        entity: 'batch',
        entityId: orphan,
        description: `Reassign orphaned batch ${orphan} to 'To Assign' status`,
        currentValue: 'Invalid owner',
        proposedValue: 'To Assign',
        risk: 'low',
      });
    }
  }

  // Generate actions for missing QR tokens
  const missingQRCheck = report.checks.find(
    (c) => c.category === 'Batches' && c.checkName === 'QR Token Presence'
  );
  if (missingQRCheck && missingQRCheck.details?.missing) {
    for (const missing of missingQRCheck.details.missing) {
      actions.push({
        id: `repair_qr_${missing}`,
        type: 'generate_qr_token',
        entity: 'batch',
        entityId: missing,
        description: `Generate missing QR token for batch ${missing}`,
        currentValue: null,
        proposedValue: 'Generated QR token',
        risk: 'low',
      });
    }
  }

  return actions;
}

/**
 * Apply a single repair action
 */
async function applyRepairAction(action: RepairAction): Promise<void> {
  switch (action.type) {
    case 'reassign_orphan':
      // Reassign orphaned batch to 'To Assign' status
      const { data: batch } = await supabase
        .from('batches')
        .select('*')
        .eq('batch_number', action.entityId)
        .single();

      if (batch) {
        await supabase
          .from('batches')
          .update({
            status: 'To Assign',
            current_owner_id: null,
            current_owner_name: null,
          })
          .eq('id', batch.id);
      }
      break;

    case 'generate_qr_token':
      // Generate QR token for batch
      const { data: batchForQR } = await supabase
        .from('batches')
        .select('*')
        .eq('batch_number', action.entityId)
        .single();

      if (batchForQR) {
        const qrToken = `QR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
        await supabase
          .from('batches')
          .update({ qr_token: qrToken })
          .eq('id', batchForQR.id);
      }
      break;

    case 'set_missing_step':
      // Set missing initial step (would need workflow context)
      break;

    case 'archive_duplicate':
      // Archive duplicate (soft-delete by setting is_active = false or similar)
      break;

    case 'fix_status':
      // Fix invalid status
      break;

    default:
      throw new Error(`Unknown repair action type: ${action.type}`);
  }
}

/**
 * Export technical report as JSON
 */
export function exportTechnicalReport(
  integrityReport: IntegrityReport,
  repairReport?: RepairReport
): string {
  const report = {
    generated_at: new Date().toISOString(),
    system: 'GMP Track & Trace - Phase 12 DB Audit',
    integrity_report: integrityReport,
    repair_report: repairReport || null,
  };

  return JSON.stringify(report, null, 2);
}
