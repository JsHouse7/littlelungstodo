export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'doctor' | 'staff'
          department: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'doctor' | 'staff'
          department?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'doctor' | 'staff'
          department?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sheets: {
        Row: {
          id: string
          name: string
          type: 'monthly' | 'ongoing_admin' | 'personal_todo'
          month_year: string | null
          owner_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'monthly' | 'ongoing_admin' | 'personal_todo'
          month_year?: string | null
          owner_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'monthly' | 'ongoing_admin' | 'personal_todo'
          month_year?: string | null
          owner_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      column_definitions: {
        Row: {
          id: string
          sheet_type: 'monthly' | 'ongoing_admin' | 'personal_todo'
          column_key: string
          column_label: string
          column_type: 'text' | 'date' | 'number' | 'boolean' | 'select'
          column_order: number
          is_required: boolean
          is_visible: boolean
          select_options: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          sheet_type: 'monthly' | 'ongoing_admin' | 'personal_todo'
          column_key: string
          column_label: string
          column_type?: 'text' | 'date' | 'number' | 'boolean' | 'select'
          column_order: number
          is_required?: boolean
          is_visible?: boolean
          select_options?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          sheet_type?: 'monthly' | 'ongoing_admin' | 'personal_todo'
          column_key?: string
          column_label?: string
          column_type?: 'text' | 'date' | 'number' | 'boolean' | 'select'
          column_order?: number
          is_required?: boolean
          is_visible?: boolean
          select_options?: Json | null
          created_at?: string
        }
      }
      user_column_preferences: {
        Row: {
          id: string
          user_id: string
          sheet_type: 'monthly' | 'ongoing_admin' | 'personal_todo'
          column_key: string
          is_visible: boolean
          column_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sheet_type: 'monthly' | 'ongoing_admin' | 'personal_todo'
          column_key: string
          is_visible?: boolean
          column_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sheet_type?: 'monthly' | 'ongoing_admin' | 'personal_todo'
          column_key?: string
          is_visible?: boolean
          column_order?: number | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          sheet_id: string
          data: Json
          created_by: string
          assigned_to: string | null
          is_completed: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sheet_id: string
          data?: Json
          created_by: string
          assigned_to?: string | null
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sheet_id?: string
          data?: Json
          created_by?: string
          assigned_to?: string | null
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      task_attachments: {
        Row: {
          id: string
          task_id: string
          file_name: string
          file_path: string
          file_size: number | null
          content_type: string | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          content_type?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          content_type?: string | null
          uploaded_by?: string
          created_at?: string
        }
      }
      user_invitations: {
        Row: {
          id: string
          email: string
          invited_by: string
          role: 'admin' | 'doctor' | 'staff'
          department: string | null
          phone: string | null
          full_name: string | null
          invited_at: string
          accepted_at: string | null
          status: 'pending' | 'accepted' | 'expired' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          invited_by: string
          role: 'admin' | 'doctor' | 'staff'
          department?: string | null
          phone?: string | null
          full_name?: string | null
          invited_at?: string
          accepted_at?: string | null
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          invited_by?: string
          role?: 'admin' | 'doctor' | 'staff'
          department?: string | null
          phone?: string | null
          full_name?: string | null
          invited_at?: string
          accepted_at?: string | null
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      user_audit_log: {
        Row: {
          id: string
          performed_by: string
          action: 'invite_user' | 'update_user' | 'reset_password' | 'deactivate_user' | 'activate_user' | 'delete_user'
          target_user_id: string | null
          target_user_email: string | null
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          performed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          performed_by: string
          action: 'invite_user' | 'update_user' | 'reset_password' | 'deactivate_user' | 'activate_user' | 'delete_user'
          target_user_id?: string | null
          target_user_email?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          performed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          performed_by?: string
          action?: 'invite_user' | 'update_user' | 'reset_password' | 'deactivate_user' | 'activate_user' | 'delete_user'
          target_user_id?: string | null
          target_user_email?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          performed_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      sheet_type: 'monthly' | 'ongoing_admin' | 'personal_todo'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type SheetType = Database['public']['Enums']['sheet_type']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Sheet = Database['public']['Tables']['sheets']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type ColumnDefinition = Database['public']['Tables']['column_definitions']['Row']
export type UserColumnPreference = Database['public']['Tables']['user_column_preferences']['Row']
export type TaskAttachment = Database['public']['Tables']['task_attachments']['Row']
export type UserInvitation = Database['public']['Tables']['user_invitations']['Row']
export type UserAuditLog = Database['public']['Tables']['user_audit_log']['Row'] 