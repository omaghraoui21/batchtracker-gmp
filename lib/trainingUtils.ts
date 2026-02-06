import { supabase } from './supabase';
import type { Database } from './database.types';

type StepDefinition = Database['public']['Tables']['step_definitions']['Row'];
type OperatorQualification = Database['public']['Tables']['operator_qualifications']['Row'];

/**
 * Check if an operator has the required qualification for a step
 */
export async function checkOperatorQualification(
  operatorId: string,
  stepDefinition: StepDefinition | null
): Promise<{ isQualified: boolean; requiredSOP: string | null; message: string }> {
  if (!stepDefinition) {
    return { isQualified: true, requiredSOP: null, message: '' };
  }

  try {
    // Map step required_role to SOP category
    // This is a simplified mapping - in production, you might have explicit step_definition->sop mappings
    const sopCategoryMap: Record<string, string> = {
      'Opérateur': 'Production',
      'Superviseur': 'Production',
      'Vérificateur': 'Qualité',
      'Qualité': 'Qualité',
      'Technicien': 'Équipement',
    };

    const sopCategory = sopCategoryMap[stepDefinition.required_role] || 'Production';

    // Get relevant SOPs for this category
    const { data: sops, error: sopsError } = await supabase
      .from('sops')
      .select('id, code, name')
      .eq('category', sopCategory)
      .eq('status', 'active')
      .limit(1);

    if (sopsError || !sops || sops.length === 0) {
      // No specific SOP required for this step
      return { isQualified: true, requiredSOP: null, message: '' };
    }

    const relevantSOP = sops[0];

    // Check operator qualification for this SOP
    const { data: qualifications, error: qualError } = await supabase
      .from('operator_qualifications')
      .select('*')
      .eq('operator_id', operatorId)
      .eq('sop_id', relevantSOP.id)
      .single();

    if (qualError || !qualifications) {
      return {
        isQualified: false,
        requiredSOP: relevantSOP.name,
        message: `Habilitation requise : ${relevantSOP.code} - ${relevantSOP.name}`,
      };
    }

    // Check if qualification is active and not expired
    const now = new Date();
    const expiryDate = qualifications.expiry_date ? new Date(qualifications.expiry_date) : null;

    if (
      qualifications.qualification_status !== 'qualified' ||
      (expiryDate && expiryDate < now)
    ) {
      return {
        isQualified: false,
        requiredSOP: relevantSOP.name,
        message: `Habilitation expirée ou invalide : ${relevantSOP.code} - ${relevantSOP.name}`,
      };
    }

    return { isQualified: true, requiredSOP: null, message: '' };
  } catch (error) {
    console.error('Error checking operator qualification:', error);
    return { isQualified: true, requiredSOP: null, message: '' }; // Fail open for demo
  }
}

/**
 * Record a supervised execution when a non-qualified operator needs to perform an action
 */
export async function recordSupervisedExecution(data: {
  operatorId: string;
  operatorName: string;
  supervisorId: string;
  supervisorName: string;
  sopId: string;
  stepInstanceId?: string;
  batchId?: string;
  authorizationReason: string;
}) {
  try {
    const { error } = await supabase.from('supervised_executions').insert({
      operator_id: data.operatorId,
      operator_name: data.operatorName,
      supervisor_id: data.supervisorId,
      supervisor_name: data.supervisorName,
      sop_id: data.sopId,
      step_instance_id: data.stepInstanceId || null,
      batch_id: data.batchId || null,
      authorization_reason: data.authorizationReason,
      outcome: null,
    });

    if (error) throw error;

    // Record in audit trail
    await supabase.from('audit_trail').insert({
      entity_type: 'supervised_execution',
      action_type: 'supervised_action',
      user_name: data.supervisorName,
      user_role: 'Superviseur',
      description: `Autorisation supervisée pour ${data.operatorName} : ${data.authorizationReason}`,
      batch_id: data.batchId || null,
    });

    return { success: true };
  } catch (error) {
    console.error('Error recording supervised execution:', error);
    return { success: false, error };
  }
}
