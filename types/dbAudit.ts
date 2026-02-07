/**
 * Phase 12: DB Audit & Repair Types
 * Industrial-grade database integrity system for GMP compliance
 */

export type DiagnosticStatus = 'pass' | 'warning' | 'critical';

export interface IntegrityCheck {
  category: string;
  checkName: string;
  status: DiagnosticStatus;
  message: string;
  details?: {
    count?: number;
    duplicates?: string[];
    orphans?: string[];
    missing?: string[];
    examples?: string[];
  };
}

export interface IntegrityReport {
  timestamp: string;
  overallStatus: DiagnosticStatus;
  checks: IntegrityCheck[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    warningChecks: number;
    criticalChecks: number;
  };
  statistics: {
    users: {
      total: number;
      duplicateEmails: number;
      invalidRoles: number;
      missingUnits: number;
    };
    batches: {
      total: number;
      duplicateLotNumbers: number;
      duplicateQRTokens: number;
      missingQRTokens: number;
      orphanedBatches: number;
      invalidStatus: number;
      missingSteps: number;
    };
    auditEvents: {
      total: number;
      orphanedEvents: number;
      missingTimestamps: number;
      invalidActors: number;
    };
    workflow: {
      totalTemplates: number;
      totalSteps: number;
      invalidSLA: number;
      duplicateSteps: number;
    };
  };
}

export interface RepairAction {
  id: string;
  type: 'reassign_orphan' | 'set_missing_step' | 'generate_qr_token' | 'archive_duplicate' | 'fix_status';
  entity: 'batch' | 'user' | 'audit_event' | 'workflow';
  entityId: string;
  description: string;
  currentValue: any;
  proposedValue: any;
  risk: 'low' | 'medium' | 'high';
}

export interface RepairReport {
  timestamp: string;
  actions: RepairAction[];
  beforeSummary: IntegrityReport['summary'];
  afterSummary: IntegrityReport['summary'];
  appliedActions: number;
  failedActions: number;
  errors: string[];
}

export interface ManualChecklistItem {
  id: string;
  category: 'user' | 'batch' | 'workflow' | 'system';
  description: string;
  testProcedure: string;
  status: 'pending' | 'pass' | 'fail';
  testedBy?: string;
  testedAt?: string;
  notes?: string;
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  generatedBy: string;
  integrityReport: IntegrityReport;
  repairReport?: RepairReport;
  manualChecklist: ManualChecklistItem[];
  signature?: {
    signedBy: string;
    signedAt: string;
    role: string;
  };
}
