export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_quality_reviews: {
        Row: {
          analysis_result: Json
          anomalies_detected: Json | null
          batch_id: string
          confidence_score: number | null
          created_at: string | null
          id: string
          recommendations: string | null
          review_type: string
          reviewed_at: string | null
          summary: string | null
        }
        Insert: {
          analysis_result: Json
          anomalies_detected?: Json | null
          batch_id: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          recommendations?: string | null
          review_type: string
          reviewed_at?: string | null
          summary?: string | null
        }
        Update: {
          analysis_result?: Json
          anomalies_detected?: Json | null
          batch_id?: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          recommendations?: string | null
          review_type?: string
          reviewed_at?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_quality_reviews_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          action_type: string
          batch_id: string | null
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
          user_name: string
          user_role: string | null
        }
        Insert: {
          action_type: string
          batch_id?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name: string
          user_role?: string | null
        }
        Update: {
          action_type?: string
          batch_id?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_locks: {
        Row: {
          batch_id: string
          created_at: string | null
          id: string
          is_locked: boolean | null
          lock_reason: string | null
          locked_at: string | null
          locked_by: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          release_signature_id: string | null
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          release_signature_id?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          lock_reason?: string | null
          locked_at?: string | null
          locked_by?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          release_signature_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_locks_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: true
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          batch_number: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_step_id: string | null
          id: string
          priority: string | null
          product_name: string
          status: string
          updated_at: string | null
          workflow_template_id: string | null
        }
        Insert: {
          batch_number: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_step_id?: string | null
          id?: string
          priority?: string | null
          product_name: string
          status?: string
          updated_at?: string | null
          workflow_template_id?: string | null
        }
        Update: {
          batch_number?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_step_id?: string | null
          id?: string
          priority?: string | null
          product_name?: string
          status?: string
          updated_at?: string | null
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_current_step"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      deviations: {
        Row: {
          assigned_to: string | null
          batch_id: string | null
          closed_at: string | null
          closed_by: string | null
          corrective_actions: string | null
          created_at: string | null
          description: string
          id: string
          immediate_action: string | null
          preventive_actions: string | null
          reported_at: string | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          root_cause_analysis: string | null
          severity: string
          status: string
          step_instance_id: string | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          batch_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          description: string
          id?: string
          immediate_action?: string | null
          preventive_actions?: string | null
          reported_at?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          root_cause_analysis?: string | null
          severity: string
          status?: string
          step_instance_id?: string | null
          title: string
          updated_at?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          batch_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          description?: string
          id?: string
          immediate_action?: string | null
          preventive_actions?: string | null
          reported_at?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          root_cause_analysis?: string | null
          severity?: string
          status?: string
          step_instance_id?: string | null
          title?: string
          updated_at?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deviations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deviations_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_required: boolean | null
          is_uploaded: boolean | null
          name: string
          step_instance_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_required?: boolean | null
          is_uploaded?: boolean | null
          name: string
          step_instance_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_required?: boolean | null
          is_uploaded?: boolean | null
          name?: string
          step_instance_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      ebmr_pdf_history: {
        Row: {
          batch_id: string
          checksum: string | null
          created_at: string | null
          file_size_bytes: number | null
          generated_at: string | null
          generated_by: string
          id: string
          notes: string | null
          pdf_url: string | null
          version: number | null
        }
        Insert: {
          batch_id: string
          checksum?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          generated_at?: string | null
          generated_by: string
          id?: string
          notes?: string | null
          pdf_url?: string | null
          version?: number | null
        }
        Update: {
          batch_id?: string
          checksum?: string | null
          created_at?: string | null
          file_size_bytes?: number | null
          generated_at?: string | null
          generated_by?: string
          id?: string
          notes?: string | null
          pdf_url?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ebmr_pdf_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      electronic_signatures: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          signature_order: number
          signature_type: string
          signed_at: string
          signer_name: string
          signer_role: string
          signer_user_id: string
          step_instance_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          signature_order: number
          signature_type: string
          signed_at?: string
          signer_name: string
          signer_role: string
          signer_user_id: string
          step_instance_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          signature_order?: number
          signature_type?: string
          signed_at?: string
          signer_name?: string
          signer_role?: string
          signer_user_id?: string
          step_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "electronic_signatures_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          calibration_expiry_date: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          status: string
          unique_id: string
          updated_at: string | null
        }
        Insert: {
          calibration_expiry_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          status?: string
          unique_id: string
          updated_at?: string | null
        }
        Update: {
          calibration_expiry_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          status?: string
          unique_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment_logbook: {
        Row: {
          batch_id: string
          created_at: string | null
          equipment_id: string
          id: string
          notes: string | null
          step_instance_id: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          equipment_id: string
          id?: string
          notes?: string | null
          step_instance_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          equipment_id?: string
          id?: string
          notes?: string | null
          step_instance_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_logbook_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_logbook_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_logbook_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance: {
        Row: {
          created_at: string | null
          equipment_id: string
          id: string
          maintenance_type: string
          next_maintenance_date: string | null
          notes: string | null
          performed_at: string | null
          performed_by: string
        }
        Insert: {
          created_at?: string | null
          equipment_id: string
          id?: string
          maintenance_type: string
          next_maintenance_date?: string | null
          notes?: string | null
          performed_at?: string | null
          performed_by: string
        }
        Update: {
          created_at?: string | null
          equipment_id?: string
          id?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          notes?: string | null
          performed_at?: string | null
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_qualifications: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          id: string
          last_training_date: string | null
          operator_email: string | null
          operator_id: string
          operator_name: string
          operator_role: string
          qualification_status: string | null
          renewal_alert_sent: boolean | null
          sop_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_training_date?: string | null
          operator_email?: string | null
          operator_id: string
          operator_name: string
          operator_role: string
          qualification_status?: string | null
          renewal_alert_sent?: boolean | null
          sop_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_training_date?: string | null
          operator_email?: string | null
          operator_id?: string
          operator_name?: string
          operator_role?: string
          qualification_status?: string | null
          renewal_alert_sent?: boolean | null
          sop_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_qualifications_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          completed_at: string | null
          correct_answers: number
          id: string
          operator_id: string
          operator_name: string
          passed: boolean
          quiz_questions_answered: number
          score: number
          sop_id: string | null
          time_taken_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          correct_answers: number
          id?: string
          operator_id: string
          operator_name: string
          passed: boolean
          quiz_questions_answered: number
          score: number
          sop_id?: string | null
          time_taken_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number
          id?: string
          operator_id?: string
          operator_name?: string
          passed?: boolean
          quiz_questions_answered?: number
          score?: number
          sop_id?: string | null
          time_taken_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          id: string
          internal_lot_number: string | null
          material_name: string
          quantity_received: number | null
          received_date: string | null
          status: string | null
          storage_location: string | null
          supplier: string | null
          supplier_lot_number: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          internal_lot_number?: string | null
          material_name: string
          quantity_received?: number | null
          received_date?: string | null
          status?: string | null
          storage_location?: string | null
          supplier?: string | null
          supplier_lot_number?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          internal_lot_number?: string | null
          material_name?: string
          quantity_received?: number | null
          received_date?: string | null
          status?: string | null
          storage_location?: string | null
          supplier?: string | null
          supplier_lot_number?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scan_history: {
        Row: {
          batch_id: string | null
          id: string
          notes: string | null
          scan_type: string
          scanned_at: string | null
          scanned_by: string | null
          step_instance_id: string | null
          success: boolean | null
        }
        Insert: {
          batch_id?: string | null
          id?: string
          notes?: string | null
          scan_type: string
          scanned_at?: string | null
          scanned_by?: string | null
          step_instance_id?: string | null
          success?: boolean | null
        }
        Update: {
          batch_id?: string | null
          id?: string
          notes?: string | null
          scan_type?: string
          scanned_at?: string | null
          scanned_by?: string | null
          step_instance_id?: string | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_history_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_summaries: {
        Row: {
          content: string
          generated_at: string | null
          generated_by: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sop_id: string | null
          status: string | null
          summary_type: string | null
          title: string
        }
        Insert: {
          content: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sop_id?: string | null
          status?: string | null
          summary_type?: string | null
          title: string
        }
        Update: {
          content?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sop_id?: string | null
          status?: string | null
          summary_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_summaries_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sops: {
        Row: {
          category: string | null
          code: string
          content: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
          validity_months: number
          version: string
        }
        Insert: {
          category?: string | null
          code: string
          content?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
          validity_months?: number
          version?: string
        }
        Update: {
          category?: string | null
          code?: string
          content?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
          validity_months?: number
          version?: string
        }
        Relationships: []
      }
      step_definitions: {
        Row: {
          allows_deviation: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number
          required_role: string
          requires_documents: boolean | null
          requires_double_validation: boolean | null
          sla_hours: number
          workflow_template_id: string | null
        }
        Insert: {
          allows_deviation?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index: number
          required_role: string
          requires_documents?: boolean | null
          requires_double_validation?: boolean | null
          sla_hours?: number
          workflow_template_id?: string | null
        }
        Update: {
          allows_deviation?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          required_role?: string
          requires_documents?: boolean | null
          requires_double_validation?: boolean | null
          sla_hours?: number
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_definitions_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      step_equipment: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          batch_id: string
          created_at: string | null
          equipment_id: string
          id: string
          step_instance_id: string
          validation_notes: string | null
          validation_status: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          batch_id: string
          created_at?: string | null
          equipment_id: string
          id?: string
          step_instance_id: string
          validation_notes?: string | null
          validation_status?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          batch_id?: string
          created_at?: string | null
          equipment_id?: string
          id?: string
          step_instance_id?: string
          validation_notes?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_equipment_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_equipment_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      step_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          from_status: string
          id: string
          notes: string | null
          step_instance_id: string | null
          to_status: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          from_status: string
          id?: string
          notes?: string | null
          step_instance_id?: string | null
          to_status: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          from_status?: string
          id?: string
          notes?: string | null
          step_instance_id?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_history_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      step_instances: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          batch_id: string | null
          completed_at: string | null
          created_at: string | null
          decision: string | null
          decision_notes: string | null
          id: string
          is_overdue: boolean | null
          sla_deadline: string | null
          started_at: string | null
          status: string
          step_definition_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          decision?: string | null
          decision_notes?: string | null
          id?: string
          is_overdue?: boolean | null
          sla_deadline?: string | null
          started_at?: string | null
          status?: string
          step_definition_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          batch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          decision?: string | null
          decision_notes?: string | null
          id?: string
          is_overdue?: boolean | null
          sla_deadline?: string | null
          started_at?: string | null
          status?: string
          step_definition_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_instances_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_instances_step_definition_id_fkey"
            columns: ["step_definition_id"]
            isOneToOne: false
            referencedRelation: "step_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      step_materials: {
        Row: {
          actual_quantity: number | null
          batch_id: string
          created_at: string | null
          deviation: number | null
          id: string
          material_id: string | null
          material_name: string
          notes: string | null
          recorded_at: string | null
          recorded_by: string | null
          step_instance_id: string
          supplier_lot_number: string | null
          theoretical_quantity: number
          unit_of_measure: string
          yield_percentage: number | null
        }
        Insert: {
          actual_quantity?: number | null
          batch_id: string
          created_at?: string | null
          deviation?: number | null
          id?: string
          material_id?: string | null
          material_name: string
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          step_instance_id: string
          supplier_lot_number?: string | null
          theoretical_quantity: number
          unit_of_measure: string
          yield_percentage?: number | null
        }
        Update: {
          actual_quantity?: number | null
          batch_id?: string
          created_at?: string | null
          deviation?: number | null
          id?: string
          material_id?: string | null
          material_name?: string
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          step_instance_id?: string
          supplier_lot_number?: string | null
          theoretical_quantity?: number
          unit_of_measure?: string
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "step_materials_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_materials_step_instance_id_fkey"
            columns: ["step_instance_id"]
            isOneToOne: false
            referencedRelation: "step_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      step_validation_requirements: {
        Row: {
          created_at: string | null
          id: string
          required_roles: string[] | null
          requires_double_validation: boolean | null
          step_definition_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          required_roles?: string[] | null
          requires_double_validation?: boolean | null
          step_definition_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          required_roles?: string[] | null
          requires_double_validation?: boolean | null
          step_definition_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_validation_requirements_step_definition_id_fkey"
            columns: ["step_definition_id"]
            isOneToOne: true
            referencedRelation: "step_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      supervised_executions: {
        Row: {
          authorization_reason: string
          batch_id: string | null
          comments: string | null
          id: string
          operator_id: string
          operator_name: string
          outcome: string | null
          sop_id: string | null
          step_instance_id: string | null
          supervised_at: string | null
          supervisor_id: string
          supervisor_name: string
        }
        Insert: {
          authorization_reason: string
          batch_id?: string | null
          comments?: string | null
          id?: string
          operator_id: string
          operator_name: string
          outcome?: string | null
          sop_id?: string | null
          step_instance_id?: string | null
          supervised_at?: string | null
          supervisor_id: string
          supervisor_name: string
        }
        Update: {
          authorization_reason?: string
          batch_id?: string | null
          comments?: string | null
          id?: string
          operator_id?: string
          operator_name?: string
          outcome?: string | null
          sop_id?: string | null
          step_instance_id?: string | null
          supervised_at?: string | null
          supervisor_id?: string
          supervisor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervised_executions_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      training_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          alert_sent_at: string | null
          alert_type: string | null
          days_until_expiry: number | null
          id: string
          operator_id: string
          operator_name: string
          sop_id: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          alert_sent_at?: string | null
          alert_type?: string | null
          days_until_expiry?: number | null
          id?: string
          operator_id: string
          operator_name: string
          sop_id?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          alert_sent_at?: string | null
          alert_type?: string | null
          days_until_expiry?: number | null
          id?: string
          operator_id?: string
          operator_name?: string
          sop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_alerts_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quizzes: {
        Row: {
          correct_answer: string
          created_at: string | null
          created_by: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          question: string
          sop_id: string | null
          wrong_answer_1: string | null
          wrong_answer_2: string | null
          wrong_answer_3: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          question: string
          sop_id?: string | null
          wrong_answer_1?: string | null
          wrong_answer_2?: string | null
          wrong_answer_3?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          question?: string
          sop_id?: string | null
          wrong_answer_1?: string | null
          wrong_answer_2?: string | null
          wrong_answer_3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_quizzes_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      training_records: {
        Row: {
          certificate_url: string | null
          created_at: string | null
          expiry_date: string
          id: string
          notes: string | null
          operator_id: string
          operator_name: string
          quiz_passed: boolean | null
          quiz_score: number | null
          sop_id: string | null
          status: string | null
          trainer_name: string
          trainer_signature: string | null
          training_date: string
          training_method: string | null
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string | null
          expiry_date: string
          id?: string
          notes?: string | null
          operator_id: string
          operator_name: string
          quiz_passed?: boolean | null
          quiz_score?: number | null
          sop_id?: string | null
          status?: string | null
          trainer_name: string
          trainer_signature?: string | null
          training_date?: string
          training_method?: string | null
        }
        Update: {
          certificate_url?: string | null
          created_at?: string | null
          expiry_date?: string
          id?: string
          notes?: string | null
          operator_id?: string
          operator_name?: string
          quiz_passed?: boolean | null
          quiz_score?: number | null
          sop_id?: string | null
          status?: string | null
          trainer_name?: string
          trainer_signature?: string | null
          training_date?: string
          training_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_records_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_overdue_steps: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
