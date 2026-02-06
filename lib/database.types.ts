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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
