/**
 * Automatic Assignment Engine
 *
 * Phase 10: Implements intelligent batch assignment based on configurable rules.
 * Supports three rule types: Fixed User, Round Robin, and Least Active.
 */

import { supabase } from './supabase';
import type { Database } from './database.types';
import { logAutoAssignment } from './auditLog';

type AssignmentRule = Database['public']['Tables']['assignment_rules']['Row'];
type Batch = Database['public']['Tables']['batches']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export type AssignmentRuleType = 'fixed_user' | 'round_robin' | 'least_active';

export interface AssignmentResult {
  success: boolean;
  assignedUserId: string | null;
  assignedUserName: string | null;
  ruleId: string | null;
  ruleType: AssignmentRuleType | null;
  reason?: string;
  error?: string;
}

/**
 * Main function to assign a batch based on workflow step rules
 */
export async function assignBatchAutomatically(
  batchId: string,
  stepDefinitionId: string,
  triggerUserId: string,
  triggerUserName: string,
  triggerUserRole: string
): Promise<AssignmentResult> {
  try {
    // Fetch active assignment rules for this step, ordered by priority
    const { data: rules, error: rulesError } = await supabase
      .from('assignment_rules')
      .select('*')
      .eq('step_definition_id', stepDefinitionId)
      .eq('is_active', true)
      .order('priority', { ascending: false }); // Higher priority first

    if (rulesError) {
      console.error('Error fetching assignment rules:', rulesError);
      return {
        success: false,
        assignedUserId: null,
        assignedUserName: null,
        ruleId: null,
        ruleType: null,
        error: 'Failed to fetch assignment rules',
      };
    }

    if (!rules || rules.length === 0) {
      return {
        success: false,
        assignedUserId: null,
        assignedUserName: null,
        ruleId: null,
        ruleType: null,
        reason: 'No active assignment rules found for this step',
      };
    }

    // Try each rule in order of priority
    for (const rule of rules) {
      let result: AssignmentResult;

      switch (rule.rule_type as AssignmentRuleType) {
        case 'fixed_user':
          result = await applyFixedUserRule(rule);
          break;
        case 'round_robin':
          result = await applyRoundRobinRule(rule);
          break;
        case 'least_active':
          result = await applyLeastActiveRule(rule);
          break;
        default:
          continue;
      }

      if (result.success && result.assignedUserId) {
        // Update batch with assignment
        const { error: updateError } = await supabase
          .from('batches')
          .update({
            assigned_to_user_id: result.assignedUserId,
            assigned_by_rule: true,
            assignment_rule_id: rule.id,
          })
          .eq('id', batchId);

        if (updateError) {
          console.error('Error updating batch assignment:', updateError);
          continue;
        }

        // Fetch batch number for audit log
        const { data: batch } = await supabase
          .from('batches')
          .select('batch_number')
          .eq('id', batchId)
          .single();

        // Log the automatic assignment
        if (batch && result.assignedUserName) {
          await logAutoAssignment(
            batchId,
            batch.batch_number,
            triggerUserId,
            triggerUserName,
            triggerUserRole,
            result.assignedUserId,
            result.assignedUserName,
            rule.id,
            rule.rule_type as AssignmentRuleType
          );
        }

        return result;
      }
    }

    // No rule succeeded
    return {
      success: false,
      assignedUserId: null,
      assignedUserName: null,
      ruleId: null,
      ruleType: null,
      reason: 'No eligible users found for any assignment rule',
    };
  } catch (error) {
    console.error('Assignment engine error:', error);
    return {
      success: false,
      assignedUserId: null,
      assignedUserName: null,
      ruleId: null,
      ruleType: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fixed User Rule: Always assigns to a specific user
 */
async function applyFixedUserRule(rule: AssignmentRule): Promise<AssignmentResult> {
  if (!rule.fixed_user_id) {
    return {
      success: false,
      assignedUserId: null,
      assignedUserName: null,
      ruleId: rule.id,
      ruleType: 'fixed_user',
      error: 'Fixed user ID not configured',
    };
  }

  // Check if user is active
  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, name, is_active')
    .eq('id', rule.fixed_user_id)
    .single();

  if (error || !user || !user.is_active) {
    return {
      success: false,
      assignedUserId: null,
      assignedUserName: null,
      ruleId: rule.id,
      ruleType: 'fixed_user',
      error: 'Fixed user not found or inactive',
    };
  }

  return {
    success: true,
    assignedUserId: user.id,
    assignedUserName: user.name,
    ruleId: rule.id,
    ruleType: 'fixed_user',
  };
}

/**
 * Round Robin Rule: Rotates assignment among eligible users
 */
async function applyRoundRobinRule(rule: AssignmentRule): Promise<AssignmentResult> {
  if (!rule.eligible_user_ids || rule.eligible_user_ids.length === 0) {
    return {
      success: false,
      assignedUserId: null,
      assignedUserName: null,
      ruleId: rule.id,
      ruleType: 'round_robin',
      error: 'No eligible users configured',
    };
  }

  // Fetch all eligible users who are active
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, name, is_active')
    .in('id', rule.eligible_user_ids)
    .eq('is_active', true);

  if (error || !users || users.length === 0) {
    return {
      success: false,
      assignedUserId: null,
      assignedUserName: null,
      ruleId: rule.id,
      ruleType: 'round_robin',
      error: 'No active eligible users found',
    };
  }

  // Find the next user in round robin
  let nextUser: typeof users[0] | null = null;

  if (!rule.last_assigned_user_id) {
    // First assignment, pick first user
    nextUser = users[0];
  } else {
    // Find the last assigned user and pick the next one
    const lastIndex = users.findIndex((u) => u.id === rule.last_assigned_user_id);
    if (lastIndex === -1) {
      // Last assigned user is no longer eligible, start from beginning
      nextUser = users[0];
    } else {
      // Pick next user, wrap around if at end
      const nextIndex = (lastIndex + 1) % users.length;
      nextUser = users[nextIndex];
    }
  }

  if (!nextUser) {
    return {
      success: false,
      assignedUserId: null,
      assignedUserName: null,
      ruleId: rule.id,
      ruleType: 'round_robin',
      error: 'Could not determine next user',
    };
  }

  // Update rule with last assigned user
  await supabase
    .from('assignment_rules')
    .update({ last_assigned_user_id: nextUser.id })
    .eq('id', rule.id);

  return {
    success: true,
    assignedUserId: nextUser.id,
    assignedUserName: nextUser.name,
    ruleId: rule.id,
    ruleType: 'round_robin',
  };
}

/**
 * Least Active Rule: Assigns to user with fewest in-progress batches
 */
async function applyLeastActiveRule(rule: AssignmentRule): Promise<AssignmentResult> {
  if (!rule.eligible_user_ids || rule.eligible_user_ids.length === 0) {
    return {
      success: false,
      assignedUserId: null,
      assignedUserName: null,
      ruleId: rule.id,
      ruleType: 'least_active',
      error: 'No eligible users configured',
    };
  }

  // Fetch all eligible users who are active
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, name, is_active')
    .in('id', rule.eligible_user_ids)
    .eq('is_active', true);

  if (usersError || !users || users.length === 0) {
    return {
      success: false,
      assignedUserId: null,
      assignedUserName: null,
      ruleId: rule.id,
      ruleType: 'least_active',
      error: 'No active eligible users found',
    };
  }

  // Count in-progress batches for each user
  const userBatchCounts = await Promise.all(
    users.map(async (user) => {
      const { count, error } = await supabase
        .from('batches')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to_user_id', user.id)
        .in('batch_status', ['brouillon', 'en_cours']);

      return {
        user,
        count: error ? 999999 : (count || 0), // If error, make this user least preferred
      };
    })
  );

  // Find user with minimum count
  const leastActiveUser = userBatchCounts.reduce((min, current) =>
    current.count < min.count ? current : min
  );

  return {
    success: true,
    assignedUserId: leastActiveUser.user.id,
    assignedUserName: leastActiveUser.user.name,
    ruleId: rule.id,
    ruleType: 'least_active',
  };
}

/**
 * Test assignment rule (simulate without actually assigning)
 */
export async function testAssignmentRule(
  stepDefinitionId: string,
  ruleType: AssignmentRuleType,
  fixedUserId?: string,
  eligibleUserIds?: string[]
): Promise<AssignmentResult> {
  // Create a temporary rule object for testing
  const testRule: AssignmentRule = {
    id: 'test-rule',
    step_definition_id: stepDefinitionId,
    rule_type: ruleType,
    fixed_user_id: fixedUserId || null,
    eligible_user_ids: eligibleUserIds || null,
    last_assigned_user_id: null,
    is_active: true,
    priority: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  switch (ruleType) {
    case 'fixed_user':
      return await applyFixedUserRule(testRule);
    case 'round_robin':
      return await applyRoundRobinRule(testRule);
    case 'least_active':
      return await applyLeastActiveRule(testRule);
    default:
      return {
        success: false,
        assignedUserId: null,
        assignedUserName: null,
        ruleId: null,
        ruleType: null,
        error: 'Invalid rule type',
      };
  }
}
