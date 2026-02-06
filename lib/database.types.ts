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
          created_at: string | null
          description: string
          id: string
          reported_at: string | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          step_instance_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          batch_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          reported_at?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          step_instance_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          batch_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          reported_at?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          step_instance_id?: string | null
          title?: string
          updated_at?: string | null
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
