export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          product_code: string
          product_name: string
          technical_description: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          product_code: string
          product_name: string
          technical_description?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          product_code?: string
          product_name?: string
          technical_description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          department: string | null
          phone: string | null
          is_active: boolean
          avatar_url: string | null
          manufacturing_unit: string | null
          last_login_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          name: string
          role?: string
          department?: string | null
          phone?: string | null
          is_active?: boolean
          avatar_url?: string | null
          manufacturing_unit?: string | null
          last_login_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          department?: string | null
          phone?: string | null
          is_active?: boolean
          avatar_url?: string | null
          manufacturing_unit?: string | null
          last_login_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      batches: {
        Row: {
          id: string
          batch_number: string
          product_id: string | null
          product_name: string
          dossier_type: string | null
          manufacturing_date: string | null
          expiry_date: string | null
          assigned_to: string | null
          assigned_to_user_id: string | null
          assigned_by_rule: boolean | null
          assignment_rule_id: string | null
          workflow_template_id: string | null
          priority: string
          status: string
          batch_status: string | null
          qr_token: string | null
          qr_code_data: string | null
          current_step_id: string | null
          current_owner_id: string | null
          current_owner_name: string | null
          ownership_updated_at: string | null
          created_by: string | null
          completed_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          batch_number: string
          product_id?: string | null
          product_name: string
          dossier_type?: string | null
          manufacturing_date?: string | null
          expiry_date?: string | null
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          assigned_by_rule?: boolean | null
          assignment_rule_id?: string | null
          workflow_template_id?: string | null
          priority?: string
          status?: string
          batch_status?: string | null
          qr_token?: string | null
          qr_code_data?: string | null
          current_step_id?: string | null
          current_owner_id?: string | null
          current_owner_name?: string | null
          ownership_updated_at?: string | null
          created_by?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          batch_number?: string
          product_id?: string | null
          product_name?: string
          dossier_type?: string | null
          manufacturing_date?: string | null
          expiry_date?: string | null
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          assigned_by_rule?: boolean | null
          assignment_rule_id?: string | null
          workflow_template_id?: string | null
          priority?: string
          status?: string
          batch_status?: string | null
          qr_token?: string | null
          qr_code_data?: string | null
          current_step_id?: string | null
          current_owner_id?: string | null
          current_owner_name?: string | null
          ownership_updated_at?: string | null
          created_by?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      step_definitions: {
        Row: {
          id: string
          workflow_template_id: string
          name: string
          step_name: string | null
          description: string | null
          role_required: string | null
          required_role: string | null
          requires_double_validation: boolean | null
          order_index: number
          sla_hours: number
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          workflow_template_id: string
          name: string
          step_name?: string | null
          description?: string | null
          role_required?: string | null
          required_role?: string | null
          requires_double_validation?: boolean | null
          order_index: number
          sla_hours: number
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          workflow_template_id?: string
          name?: string
          step_name?: string | null
          description?: string | null
          role_required?: string | null
          required_role?: string | null
          requires_double_validation?: boolean | null
          order_index?: number
          sla_hours?: number
          is_active?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      step_instances: {
        Row: {
          id: string
          batch_id: string
          step_definition_id: string
          status: string
          assigned_to: string | null
          started_at: string | null
          completed_at: string | null
          sla_deadline: string | null
          is_overdue: boolean | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          step_definition_id: string
          status?: string
          assigned_to?: string | null
          started_at?: string | null
          completed_at?: string | null
          sla_deadline?: string | null
          is_overdue?: boolean | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          step_definition_id?: string
          status?: string
          assigned_to?: string | null
          started_at?: string | null
          completed_at?: string | null
          sla_deadline?: string | null
          is_overdue?: boolean | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      deviations: {
        Row: {
          id: string
          batch_id: string | null
          step_instance_id: string | null
          title: string
          description: string | null
          severity: string
          status: string
          assigned_to: string | null
          reported_by: string | null
          reported_at: string | null
          immediate_action: string | null
          root_cause_analysis: string | null
          corrective_actions: string | null
          preventive_actions: string | null
          verification_notes: string | null
          verified_by: string | null
          verified_at: string | null
          closed_at: string | null
          resolved_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          batch_id?: string | null
          step_instance_id?: string | null
          title: string
          description?: string | null
          severity: string
          status?: string
          assigned_to?: string | null
          reported_by?: string | null
          reported_at?: string | null
          immediate_action?: string | null
          root_cause_analysis?: string | null
          corrective_actions?: string | null
          preventive_actions?: string | null
          verification_notes?: string | null
          verified_by?: string | null
          verified_at?: string | null
          closed_at?: string | null
          resolved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string | null
          step_instance_id?: string | null
          title?: string
          description?: string | null
          severity?: string
          status?: string
          assigned_to?: string | null
          reported_by?: string | null
          reported_at?: string | null
          immediate_action?: string | null
          root_cause_analysis?: string | null
          corrective_actions?: string | null
          preventive_actions?: string | null
          verification_notes?: string | null
          verified_by?: string | null
          verified_at?: string | null
          closed_at?: string | null
          resolved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workflow_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_trail: {
        Row: {
          id: string
          batch_id: string | null
          entity_type: string | null
          entity_id: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
          action: string | null
          action_type: string | null
          event_type: string | null
          description: string | null
          details: Json | null
          old_value: Json | null
          new_value: Json | null
          ip_address: string | null
          timestamp: string
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id?: string | null
          entity_type?: string | null
          entity_id?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
          action?: string | null
          action_type?: string | null
          event_type?: string | null
          description?: string | null
          details?: Json | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          timestamp?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string | null
          entity_type?: string | null
          entity_id?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
          action?: string
          action_type?: string | null
          event_type?: string | null
          description?: string | null
          details?: Json | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          timestamp?: string
          created_at?: string | null
        }
        Relationships: []
      }
      scan_history: {
        Row: {
          id: string
          scan_type: string
          batch_id: string | null
          step_instance_id: string | null
          scanned_by: string | null
          success: boolean
          notes: string | null
          scanned_at: string
        }
        Insert: {
          id?: string
          scan_type: string
          batch_id?: string | null
          step_instance_id?: string | null
          scanned_by?: string | null
          success?: boolean
          notes?: string | null
          scanned_at?: string
        }
        Update: {
          id?: string
          scan_type?: string
          batch_id?: string | null
          step_instance_id?: string | null
          scanned_by?: string | null
          success?: boolean
          notes?: string | null
          scanned_at?: string
        }
        Relationships: []
      }
      assignment_rules: {
        Row: {
          id: string
          step_definition_id: string | null
          rule_type: string
          fixed_user_id: string | null
          eligible_user_ids: string[] | null
          last_assigned_user_id: string | null
          is_active: boolean
          priority: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          step_definition_id?: string | null
          rule_type: string
          fixed_user_id?: string | null
          eligible_user_ids?: string[] | null
          last_assigned_user_id?: string | null
          is_active?: boolean
          priority?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          step_definition_id?: string | null
          rule_type?: string
          fixed_user_id?: string | null
          eligible_user_ids?: string[] | null
          last_assigned_user_id?: string | null
          is_active?: boolean
          priority?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      electronic_signatures: {
        Row: {
          id: string
          batch_id: string | null
          step_instance_id: string | null
          signer_id: string | null
          signer_name: string | null
          signer_role: string | null
          meaning: string | null
          comments: string | null
          signature_order: number | null
          signed_at: string
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id?: string | null
          step_instance_id?: string | null
          signer_id?: string | null
          signer_name?: string | null
          signer_role?: string | null
          meaning?: string | null
          comments?: string | null
          signature_order?: number | null
          signed_at?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string | null
          step_instance_id?: string | null
          signer_id?: string | null
          signer_name?: string | null
          signer_role?: string | null
          meaning?: string | null
          comments?: string | null
          signature_order?: number | null
          signed_at?: string
          created_at?: string | null
        }
        Relationships: []
      }
      deviation_types: {
        Row: {
          id: string
          code: string
          label: string
          category: string
          default_severity: string
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          code: string
          label: string
          category: string
          default_severity: string
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          label?: string
          category?: string
          default_severity?: string
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          role: string
          module: string
          can_read: boolean
          can_write: boolean
          can_delete: boolean
          can_approve: boolean
        }
        Insert: {
          id?: string
          role: string
          module: string
          can_read?: boolean
          can_write?: boolean
          can_delete?: boolean
          can_approve?: boolean
        }
        Update: {
          id?: string
          role?: string
          module?: string
          can_read?: boolean
          can_write?: boolean
          can_delete?: boolean
          can_approve?: boolean
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          entity_type: string | null
          entity_id: string | null
          action_type: string | null
          event_type: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
          description: string | null
          old_value: Json | null
          new_value: Json | null
          ip_address: string | null
          batch_id: string | null
          timestamp: string
          created_at: string | null
        }
        Insert: {
          id?: string
          entity_type?: string | null
          entity_id?: string | null
          action_type?: string | null
          event_type?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
          description?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          batch_id?: string | null
          timestamp?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          entity_type?: string | null
          entity_id?: string | null
          action_type?: string | null
          event_type?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
          description?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          batch_id?: string | null
          timestamp?: string
          created_at?: string | null
        }
        Relationships: []
      }
      sops: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          category: string | null
          status: string
          validity_months: number | null
          version: string | null
          content: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          category?: string | null
          status?: string
          validity_months?: number | null
          version?: string | null
          content?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          category?: string | null
          status?: string
          validity_months?: number | null
          version?: string | null
          content?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      operator_qualifications: {
        Row: {
          id: string
          operator_id: string
          operator_name: string | null
          sop_id: string
          qualification_status: string
          expiry_date: string | null
          last_training_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          operator_id: string
          operator_name?: string | null
          sop_id: string
          qualification_status?: string
          expiry_date?: string | null
          last_training_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          operator_id?: string
          operator_name?: string | null
          sop_id?: string
          qualification_status?: string
          expiry_date?: string | null
          last_training_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supervised_executions: {
        Row: {
          id: string
          operator_id: string
          operator_name: string | null
          supervisor_id: string
          supervisor_name: string | null
          sop_id: string | null
          step_instance_id: string | null
          batch_id: string | null
          authorization_reason: string | null
          outcome: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          operator_id: string
          operator_name?: string | null
          supervisor_id: string
          supervisor_name?: string | null
          sop_id?: string | null
          step_instance_id?: string | null
          batch_id?: string | null
          authorization_reason?: string | null
          outcome?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          operator_id?: string
          operator_name?: string | null
          supervisor_id?: string
          supervisor_name?: string | null
          sop_id?: string | null
          step_instance_id?: string | null
          batch_id?: string | null
          authorization_reason?: string | null
          outcome?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      ai_quality_reviews: {
        Row: {
          id: string
          batch_id: string
          review_type: string
          analysis_result: Json | null
          summary: string | null
          reviewed_at: string | null
          anomalies_detected: number | null
          confidence_score: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          review_type: string
          analysis_result?: Json | null
          summary?: string | null
          reviewed_at?: string | null
          anomalies_detected?: number | null
          confidence_score?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          review_type?: string
          analysis_result?: Json | null
          summary?: string | null
          reviewed_at?: string | null
          anomalies_detected?: number | null
          confidence_score?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          id: string
          name: string
          unique_id: string
          status: string
          description: string | null
          location: string | null
          calibration_expiry_date: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          unique_id: string
          status?: string
          description?: string | null
          location?: string | null
          calibration_expiry_date?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          unique_id?: string
          status?: string
          description?: string | null
          location?: string | null
          calibration_expiry_date?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment_logbook: {
        Row: {
          id: string
          equipment_id: string
          batch_id: string | null
          used_at: string | null
          used_by: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          equipment_id: string
          batch_id?: string | null
          used_at?: string | null
          used_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          equipment_id?: string
          batch_id?: string | null
          used_at?: string | null
          used_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      equipment_maintenance: {
        Row: {
          id: string
          equipment_id: string
          maintenance_type: string
          performed_at: string | null
          performed_by: string | null
          notes: string | null
          next_maintenance_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          equipment_id: string
          maintenance_type: string
          performed_at?: string | null
          performed_by?: string | null
          notes?: string | null
          next_maintenance_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          equipment_id?: string
          maintenance_type?: string
          performed_at?: string | null
          performed_by?: string | null
          notes?: string | null
          next_maintenance_date?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      step_equipment: {
        Row: {
          id: string
          step_instance_id: string
          equipment_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          step_instance_id: string
          equipment_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          step_instance_id?: string
          equipment_id?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      step_materials: {
        Row: {
          id: string
          step_instance_id: string
          material_name: string | null
          quantity: number | null
          unit: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          step_instance_id: string
          material_name?: string | null
          quantity?: number | null
          unit?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          step_instance_id?: string
          material_name?: string | null
          quantity?: number | null
          unit?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      batch_locks: {
        Row: {
          id: string
          batch_id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          lock_reason: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          lock_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          lock_reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sop_summaries: {
        Row: {
          id: string
          sop_id: string
          summary_type: string
          title: string | null
          content: string | null
          generated_by: string | null
          status: string | null
          generated_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          sop_id: string
          summary_type: string
          title?: string | null
          content?: string | null
          generated_by?: string | null
          status?: string | null
          generated_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          sop_id?: string
          summary_type?: string
          title?: string | null
          content?: string | null
          generated_by?: string | null
          status?: string | null
          generated_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      training_quizzes: {
        Row: {
          id: string
          sop_id: string
          question: string
          correct_answer: string
          wrong_answer_1: string
          wrong_answer_2: string
          wrong_answer_3: string
          explanation: string | null
          difficulty: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          sop_id: string
          question: string
          correct_answer: string
          wrong_answer_1: string
          wrong_answer_2: string
          wrong_answer_3: string
          explanation?: string | null
          difficulty?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          sop_id?: string
          question?: string
          correct_answer?: string
          wrong_answer_1?: string
          wrong_answer_2?: string
          wrong_answer_3?: string
          explanation?: string | null
          difficulty?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      step_history: {
        Row: {
          id: string
          step_instance_id: string
          from_status: string | null
          to_status: string
          changed_by: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          step_instance_id: string
          from_status?: string | null
          to_status: string
          changed_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          step_instance_id?: string
          from_status?: string | null
          to_status?: string
          changed_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      ebmr_pdf_history: {
        Row: {
          id: string
          batch_id: string
          generated_by: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          generated_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          generated_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      generate_new_qr_token: {
        Args: {
          batch_id_param: string
        }
        Returns: string
      }
      get_avg_holding_time: {
        Args: Record<string, never>
        Returns: Json
      }
    }
    Enums: {}
  }
}
