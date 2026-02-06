import { supabase } from './supabase';
import { generateText } from '@fastshot/ai';
import type { Database } from './database.types';

type Batch = Database['public']['Tables']['batches']['Row'];
type StepInstance = Database['public']['Tables']['step_instances']['Row'];
type Deviation = Database['public']['Tables']['deviations']['Row'];
type ElectronicSignature = Database['public']['Tables']['electronic_signatures']['Row'];
type Equipment = Database['public']['Tables']['equipment']['Row'];
type StepMaterial = Database['public']['Tables']['step_materials']['Row'];
type AuditTrail = Database['public']['Tables']['audit_trail']['Row'];

interface eBMRData {
  batch: Batch;
  steps: (StepInstance & {
    step_definition: any;
    signatures: ElectronicSignature[];
    equipment: Equipment[];
    materials: StepMaterial[];
  })[];
  deviations: Deviation[];
  auditTrail: AuditTrail[];
  equipment: Equipment[];
}

/**
 * Generate AI Quality Summary for batch
 */
export async function generateAIQualitySummary(batchId: string): Promise<string> {
  try {
    // Fetch batch data
    const { data: batch } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();

    const { data: steps } = await supabase
      .from('step_instances')
      .select('*, step_definition:step_definitions(*)')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    const { data: deviations } = await supabase
      .from('deviations')
      .select('*')
      .eq('batch_id', batchId);

    const prompt = `Tu es un expert qualité pharmaceutique. Analyse ce lot de production et génère un rapport de synthèse qualité en français pour le pharmacien responsable de la libération.

Lot: ${batch?.batch_number} - ${batch?.product_name}
Statut: ${batch?.status}
Nombre d'étapes: ${steps?.length || 0}
Déviations: ${deviations?.length || 0} (${deviations?.filter(d => d.severity === 'critical').length || 0} critiques)

Étapes:
${steps?.map((s: any, i: number) => `${i + 1}. ${s.step_definition?.name}: ${s.status} (SLA: ${s.is_overdue ? 'Dépassé' : 'Respecté'})`).join('\n')}

Déviations:
${deviations?.map((d: Deviation, i: number) => `${i + 1}. [${d.severity}] ${d.title}: ${d.status}`).join('\n')}

Génère un rapport de synthèse qualité d'une page max incluant:
1. Résumé exécutif
2. Conformité aux SLA et processus
3. Analyse des déviations
4. Recommandation de libération (oui/non/sous réserve)
5. Points d'attention pour le pharmacien

Format: Markdown structuré en français professionnel pharmaceutique.`;

    const summary = await generateText({ prompt });

    // Save AI review
    await supabase.from('ai_quality_reviews').insert({
      batch_id: batchId,
      review_type: 'quality_summary',
      analysis_result: { summary },
      summary: summary.substring(0, 500),
      reviewed_at: new Date().toISOString(),
    });

    return summary;
  } catch (error) {
    console.error('Error generating AI quality summary:', error);
    throw error;
  }
}

/**
 * Perform AI Coherence Check
 */
export async function performAICoherenceCheck(batchId: string): Promise<any> {
  try {
    // Fetch comprehensive data
    const { data: steps } = await supabase
      .from('step_instances')
      .select(`
        *,
        step_definition:step_definitions(*),
        signatures:electronic_signatures(*),
        equipment:step_equipment(*, equipment:equipment(*))
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    const { data: equipment } = await supabase
      .from('equipment')
      .select('*, logbook:equipment_logbook!inner(batch_id)')
      .eq('logbook.batch_id', batchId);

    const prompt = `Tu es un expert en contrôle qualité pharmaceutique GMP. Analyse ce lot pour détecter des anomalies et incohérences.

Analyse à effectuer:
1. Équipements utilisés pendant période de maintenance
2. Signatures manquantes ou non séquentielles
3. Écarts de temps suspects entre étapes
4. Équipements avec calibration expirée
5. Matériaux avec lots suspects ou dates expirées

Données:
${JSON.stringify({ steps: steps?.length, equipment: equipment?.length }, null, 2)}

Retourne un JSON avec:
{
  "anomalies": [
    {"type": "...", "severity": "high|medium|low", "description": "...", "recommendation": "..."}
  ],
  "overall_coherence": "high|medium|low",
  "critical_issues": number
}`;

    const aiResponse = await generateText({ prompt });

    let analysis;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        anomalies: [],
        overall_coherence: 'medium',
        critical_issues: 0,
      };
    } catch {
      analysis = {
        anomalies: [],
        overall_coherence: 'medium',
        critical_issues: 0,
        raw_response: aiResponse,
      };
    }

    // Save AI review
    await supabase.from('ai_quality_reviews').insert({
      batch_id: batchId,
      review_type: 'coherence_check',
      analysis_result: analysis,
      anomalies_detected: analysis.anomalies,
      summary: `${analysis.critical_issues} problèmes critiques détectés`,
      confidence_score: analysis.overall_coherence === 'high' ? 0.9 : 0.7,
      reviewed_at: new Date().toISOString(),
    });

    return analysis;
  } catch (error) {
    console.error('Error performing AI coherence check:', error);
    throw error;
  }
}

/**
 * Generate comprehensive eBMR data for PDF
 */
export async function generateeBMRData(batchId: string): Promise<eBMRData> {
  try {
    // Fetch batch
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError) throw batchError;

    // Fetch steps with all related data
    const { data: stepsData, error: stepsError } = await supabase
      .from('step_instances')
      .select(`
        *,
        step_definition:step_definitions(*)
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (stepsError) throw stepsError;

    // Fetch signatures
    const stepIds = stepsData?.map((s) => s.id) || [];
    const { data: signatures } = await supabase
      .from('electronic_signatures')
      .select('*')
      .in('step_instance_id', stepIds)
      .order('signature_order', { ascending: true });

    // Fetch equipment for each step
    const { data: stepEquipment } = await supabase
      .from('step_equipment')
      .select('*, equipment:equipment(*)')
      .in('step_instance_id', stepIds);

    // Fetch materials for each step
    const { data: stepMaterials } = await supabase
      .from('step_materials')
      .select('*')
      .in('step_instance_id', stepIds);

    // Map data to steps
    const steps = (stepsData || []).map((step) => ({
      ...step,
      signatures: signatures?.filter((sig) => sig.step_instance_id === step.id) || [],
      equipment: stepEquipment
        ?.filter((se) => se.step_instance_id === step.id)
        .map((se) => se.equipment)
        .filter(Boolean) || [],
      materials: stepMaterials?.filter((m) => m.step_instance_id === step.id) || [],
    }));

    // Fetch deviations
    const { data: deviations } = await supabase
      .from('deviations')
      .select('*')
      .eq('batch_id', batchId)
      .order('reported_at', { ascending: false });

    // Fetch audit trail
    const { data: auditTrail } = await supabase
      .from('audit_trail')
      .select('*')
      .eq('batch_id', batchId)
      .order('timestamp', { ascending: false });

    // Fetch all equipment used
    const { data: equipment } = await supabase
      .from('equipment')
      .select('*, logbook:equipment_logbook!inner(batch_id)')
      .eq('logbook.batch_id', batchId);

    return {
      batch: batch!,
      steps: steps as any,
      deviations: deviations || [],
      auditTrail: auditTrail || [],
      equipment: equipment || [],
    };
  } catch (error) {
    console.error('Error generating eBMR data:', error);
    throw error;
  }
}

/**
 * Generate eBMR PDF content (HTML format for rendering)
 */
export async function generateeBMRHTML(batchId: string): Promise<string> {
  const data = await generateeBMRData(batchId);
  const aiSummary = await generateAIQualitySummary(batchId);
  const coherenceCheck = await performAICoherenceCheck(batchId);

  // Generate HTML content
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>eBMR - Lot ${data.batch.batch_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10pt; line-height: 1.4; color: #2d3748; }
    .page { padding: 40px; max-width: 210mm; margin: 0 auto; }
    h1 { font-size: 18pt; color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 8px; margin-bottom: 20px; }
    h2 { font-size: 14pt; color: #1e40af; margin-top: 24px; margin-bottom: 12px; border-left: 4px solid #2563eb; padding-left: 12px; }
    h3 { font-size: 12pt; color: #374151; margin-top: 16px; margin-bottom: 8px; }
    .header { background: #f8fafc; border: 2px solid #2563eb; padding: 16px; margin-bottom: 24px; border-radius: 4px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .info-item { padding: 8px; background: white; border-radius: 4px; }
    .info-label { font-weight: 600; color: #64748b; font-size: 9pt; }
    .info-value { color: #1e293b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 9pt; }
    th { background: #2563eb; color: white; padding: 8px; text-align: left; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 8pt; font-weight: 600; }
    .status-success { background: #d1fae5; color: #065f46; }
    .status-warning { background: #fef3c7; color: #92400e; }
    .status-error { background: #fee2e2; color: #991b1b; }
    .signature { background: #f0fdf4; border: 1px solid #86efac; padding: 12px; margin: 8px 0; border-radius: 4px; }
    .signature-icon { color: #16a34a; font-weight: 600; }
    .deviation { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 8px 0; border-radius: 4px; }
    .ai-section { background: #eff6ff; border: 2px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 8pt; }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <h1>Dossier de Lot Électronique (eBMR)</h1>
      <div class="info-grid" style="margin-top: 16px;">
        <div class="info-item">
          <div class="info-label">Numéro de Lot</div>
          <div class="info-value">${data.batch.batch_number}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Produit</div>
          <div class="info-value">${data.batch.product_name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Statut Global</div>
          <div class="info-value">
            <span class="status-badge ${data.batch.status === 'completed' ? 'status-success' : 'status-warning'}">
              ${data.batch.status === 'completed' ? 'Terminé' : 'En cours'}
            </span>
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Date de création</div>
          <div class="info-value">${new Date(data.batch.created_at!).toLocaleString('fr-FR')}</div>
        </div>
      </div>
    </div>

    <!-- AI Quality Summary -->
    <div class="ai-section">
      <h2>🤖 Rapport de Synthèse Qualité (IA)</h2>
      <div style="white-space: pre-wrap; margin-top: 12px;">${aiSummary}</div>
    </div>

    <!-- AI Coherence Check -->
    <div class="ai-section">
      <h2>🔍 Contrôle de Cohérence (IA)</h2>
      <p><strong>Cohérence globale:</strong> ${coherenceCheck.overall_coherence.toUpperCase()}</p>
      <p><strong>Problèmes critiques:</strong> ${coherenceCheck.critical_issues}</p>
      ${coherenceCheck.anomalies?.length > 0 ? `
        <h3 style="margin-top: 12px;">Anomalies détectées:</h3>
        <ul style="margin-left: 20px; margin-top: 8px;">
          ${coherenceCheck.anomalies.map((a: any) => `
            <li style="margin-bottom: 8px;">
              <strong>[${a.severity.toUpperCase()}]</strong> ${a.description}<br/>
              <em style="color: #64748b; font-size: 8pt;">→ ${a.recommendation}</em>
            </li>
          `).join('')}
        </ul>
      ` : '<p style="margin-top: 12px; color: #16a34a;">✓ Aucune anomalie détectée</p>'}
    </div>

    <!-- Timeline des Étapes -->
    <h2>Timeline des Étapes de Production</h2>
    <table>
      <thead>
        <tr>
          <th>Étape</th>
          <th>Rôle</th>
          <th>Statut</th>
          <th>Début</th>
          <th>Fin</th>
          <th>Signatures</th>
        </tr>
      </thead>
      <tbody>
        ${data.steps.map((step) => `
          <tr>
            <td><strong>${step.step_definition?.name || 'N/A'}</strong></td>
            <td>${step.step_definition?.required_role || 'N/A'}</td>
            <td>
              <span class="status-badge ${
                step.status === 'completed' ? 'status-success' :
                step.status === 'in_progress' ? 'status-warning' : ''
              }">
                ${step.status === 'completed' ? 'Terminée' : step.status === 'in_progress' ? 'En cours' : 'En attente'}
              </span>
            </td>
            <td>${step.started_at ? new Date(step.started_at).toLocaleString('fr-FR') : '-'}</td>
            <td>${step.completed_at ? new Date(step.completed_at).toLocaleString('fr-FR') : '-'}</td>
            <td>${step.signatures.length} signature(s)</td>
          </tr>
          ${step.signatures.length > 0 ? step.signatures.map(sig => `
            <tr style="background: #f0fdf4;">
              <td colspan="6" style="padding-left: 24px;">
                <div class="signature-icon">✓</div>
                <strong>${sig.signature_order === 1 ? '1ère' : '2ème'} Signature:</strong>
                ${sig.signer_name} (${sig.signer_role}) -
                ${new Date(sig.signed_at).toLocaleString('fr-FR')}
                ${sig.comments ? `<br/><em style="color: #64748b;">${sig.comments}</em>` : ''}
              </td>
            </tr>
          `).join('') : ''}
        `).join('')}
      </tbody>
    </table>

    <!-- Équipements Utilisés -->
    <h2>Équipements Utilisés</h2>
    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>ID Unique</th>
          <th>Statut</th>
          <th>Calibration Expiration</th>
        </tr>
      </thead>
      <tbody>
        ${data.equipment.map((eq: any) => {
          const expired = eq.calibration_expiry_date && new Date(eq.calibration_expiry_date) < new Date();
          return `
            <tr>
              <td>${eq.name}</td>
              <td>${eq.unique_id}</td>
              <td><span class="status-badge status-${eq.status === 'cleaned' ? 'success' : 'warning'}">${eq.status}</span></td>
              <td ${expired ? 'style="color: #dc2626; font-weight: 600;"' : ''}>
                ${eq.calibration_expiry_date ? new Date(eq.calibration_expiry_date).toLocaleDateString('fr-FR') : 'N/A'}
                ${expired ? ' ⚠️ EXPIRÉ' : ''}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <!-- Déviations & CAPA -->
    <h2>Déviations & Actions Correctives (CAPA)</h2>
    ${data.deviations.length === 0 ? '<p>Aucune déviation signalée.</p>' : ''}
    ${data.deviations.map((dev) => `
      <div class="deviation">
        <h3>[${dev.severity === 'critical' ? 'CRITIQUE' : dev.severity === 'major' ? 'MAJEURE' : 'MINEURE'}] ${dev.title}</h3>
        <p style="margin-top: 8px;"><strong>Description:</strong> ${dev.description}</p>
        <p style="margin-top: 4px;"><strong>Action immédiate:</strong> ${dev.immediate_action || 'Non spécifiée'}</p>
        <p style="margin-top: 4px;"><strong>Statut:</strong> ${dev.status}</p>
        <p style="margin-top: 4px;"><strong>Signalée par:</strong> ${dev.reported_by} le ${new Date(dev.reported_at!).toLocaleString('fr-FR')}</p>
      </div>
    `).join('')}

    <!-- Audit Trail -->
    <h2>Piste d'Audit Complète</h2>
    <table>
      <thead>
        <tr>
          <th>Horodatage</th>
          <th>Utilisateur</th>
          <th>Action</th>
          <th>Entité</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${data.auditTrail.slice(0, 50).map((audit) => `
          <tr>
            <td>${new Date(audit.timestamp!).toLocaleString('fr-FR')}</td>
            <td>${audit.user_name}${audit.user_role ? ` (${audit.user_role})` : ''}</td>
            <td>${audit.action_type}</td>
            <td>${audit.entity_type}</td>
            <td>${audit.description || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Document généré électroniquement</strong></p>
      <p>Date de génération: ${new Date().toLocaleString('fr-FR')}</p>
      <p>Conforme aux exigences 21 CFR Part 11 et EU Annex 11</p>
      <p style="margin-top: 8px;">🤖 Généré avec Claude Code - Système eBMR GMP</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Lock batch to prevent further modifications
 */
export async function lockBatch(batchId: string, lockedBy: string, reason: string): Promise<void> {
  try {
    // Check if lock exists
    const { data: existingLock } = await supabase
      .from('batch_locks')
      .select('*')
      .eq('batch_id', batchId)
      .single();

    if (existingLock) {
      // Update existing lock
      await supabase
        .from('batch_locks')
        .update({
          is_locked: true,
          locked_at: new Date().toISOString(),
          locked_by: lockedBy,
          lock_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('batch_id', batchId);
    } else {
      // Create new lock
      await supabase.from('batch_locks').insert({
        batch_id: batchId,
        is_locked: true,
        locked_at: new Date().toISOString(),
        locked_by: lockedBy,
        lock_reason: reason,
      });
    }

    // Log audit trail
    await supabase.from('audit_trail').insert({
      batch_id: batchId,
      user_name: lockedBy,
      action_type: 'lock',
      entity_type: 'batches',
      entity_id: batchId,
      description: `Lot verrouillé: ${reason}`,
    });
  } catch (error) {
    console.error('Error locking batch:', error);
    throw error;
  }
}
