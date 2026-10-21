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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accounting_entries: {
        Row: {
          description: string | null
          entry_date: string | null
          id: string
          lines: Json | null
          org_id: string | null
          source_id: string | null
          source_type: string | null
          status: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Insert: {
          description?: string | null
          entry_date?: string | null
          id?: string
          lines?: Json | null
          org_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Update: {
          description?: string | null
          entry_date?: string | null
          id?: string
          lines?: Json | null
          org_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string | null
          candidate_id: string | null
          id: string
          job_id: string | null
          org_id: string | null
          score: number | null
          stage: string | null
          status: string | null
        }
        Insert: {
          applied_at?: string | null
          candidate_id?: string | null
          id?: string
          job_id?: string | null
          org_id?: string | null
          score?: number | null
          stage?: string | null
          status?: string | null
        }
        Update: {
          applied_at?: string | null
          candidate_id?: string | null
          id?: string
          job_id?: string | null
          org_id?: string | null
          score?: number | null
          stage?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          approved_by: string | null
          attendance_id: string | null
          id: string
          org_id: string | null
          reason: string | null
          requested_by: string | null
          requested_check_in: string | null
          requested_check_out: string | null
          status: Database["public"]["Enums"]["request_status"] | null
        }
        Insert: {
          approved_by?: string | null
          attendance_id?: string | null
          id?: string
          org_id?: string | null
          reason?: string | null
          requested_by?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
        }
        Update: {
          approved_by?: string | null
          attendance_id?: string | null
          id?: string
          org_id?: string | null
          reason?: string | null
          requested_by?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          employee_id: string | null
          hours: number | null
          id: string
          latitude: number | null
          longitude: number | null
          org_id: string | null
          overtime_hours: number | null
          source: string | null
          status: string | null
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          employee_id?: string | null
          hours?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          org_id?: string | null
          overtime_hours?: number | null
          source?: string | null
          status?: string | null
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          employee_id?: string | null
          hours?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          org_id?: string | null
          overtime_hours?: number | null
          source?: string | null
          status?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
          org_id: string | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_acct_accounts: {
        Row: {
          active: boolean
          code: string
          id: number
          is_group: boolean
          name: string
          org_id: string
          parent_id: number | null
          type: string
        }
        Insert: {
          active?: boolean
          code: string
          id?: never
          is_group?: boolean
          name: string
          org_id: string
          parent_id?: number | null
          type: string
        }
        Update: {
          active?: boolean
          code?: string
          id?: never
          is_group?: boolean
          name?: string
          org_id?: string
          parent_id?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_acct_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_acct_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "awtad_acct_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_acct_mappings: {
        Row: {
          credit_code: string | null
          debit_code: string | null
          event: string
          org_id: string
        }
        Insert: {
          credit_code?: string | null
          debit_code?: string | null
          event: string
          org_id: string
        }
        Update: {
          credit_code?: string | null
          debit_code?: string | null
          event?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_acct_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_announcements: {
        Row: {
          body: string | null
          created_at: string | null
          group_id: number | null
          id: number
          link: string | null
          org_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          group_id?: number | null
          id?: never
          link?: string | null
          org_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          group_id?: number | null
          id?: never
          link?: string | null
          org_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_announcements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "awtad_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_approval_rules: {
        Row: {
          id: number
          kind: string
          levels: number
          org_id: string
        }
        Insert: {
          id?: never
          kind: string
          levels?: number
          org_id: string
        }
        Update: {
          id?: never
          kind?: string
          levels?: number
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_approval_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_assets: {
        Row: {
          employee_id: number
          id: number
          issued_on: string | null
          name: string
          org_id: string
          returned_on: string | null
          serial: string | null
          status: string
        }
        Insert: {
          employee_id: number
          id?: never
          issued_on?: string | null
          name: string
          org_id: string
          returned_on?: string | null
          serial?: string | null
          status?: string
        }
        Update: {
          employee_id?: number
          id?: never
          issued_on?: string | null
          name?: string
          org_id?: string
          returned_on?: string | null
          serial?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_assets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          day: string
          employee_id: number
          excused: boolean
          id: number
          in_range: boolean | null
          lat: number | null
          lng: number | null
          location_id: number | null
          org_id: string
          selfie_path: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          day?: string
          employee_id: number
          excused?: boolean
          id?: never
          in_range?: boolean | null
          lat?: number | null
          lng?: number | null
          location_id?: number | null
          org_id: string
          selfie_path?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          day?: string
          employee_id?: number
          excused?: boolean
          id?: never
          in_range?: boolean | null
          lat?: number | null
          lng?: number | null
          location_id?: number | null
          org_id?: string
          selfie_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_attendance_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "awtad_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_attendance_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_audit: {
        Row: {
          action: string | null
          actor: string | null
          at: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
          org_id: string | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action?: string | null
          actor?: string | null
          at?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string | null
          actor?: string | null
          at?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      awtad_candidates: {
        Row: {
          created_at: string | null
          cv_text: string | null
          email: string | null
          id: number
          job: string | null
          job_id: number | null
          name: string
          org_id: string
          phone: string | null
          score: number | null
          stage: number
        }
        Insert: {
          created_at?: string | null
          cv_text?: string | null
          email?: string | null
          id?: never
          job?: string | null
          job_id?: number | null
          name: string
          org_id: string
          phone?: string | null
          score?: number | null
          stage?: number
        }
        Update: {
          created_at?: string | null
          cv_text?: string | null
          email?: string | null
          id?: never
          job?: string | null
          job_id?: number | null
          name?: string
          org_id?: string
          phone?: string | null
          score?: number | null
          stage?: number
        }
        Relationships: [
          {
            foreignKeyName: "awtad_candidates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_comp_ledger: {
        Row: {
          created_at: string | null
          employee_id: number
          hours: number
          id: number
          org_id: string
          reason: string | null
          request_id: number | null
        }
        Insert: {
          created_at?: string | null
          employee_id: number
          hours: number
          id?: never
          org_id: string
          reason?: string | null
          request_id?: number | null
        }
        Update: {
          created_at?: string | null
          employee_id?: number
          hours?: number
          id?: never
          org_id?: string
          reason?: string | null
          request_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_comp_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_comp_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_company_docs: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          file_path: string | null
          id: number
          issue_date: string | null
          issuer: string | null
          kind: string
          notes: string | null
          notify_days: number
          number: string | null
          org_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          file_path?: string | null
          id?: never
          issue_date?: string | null
          issuer?: string | null
          kind: string
          notes?: string | null
          notify_days?: number
          number?: string | null
          org_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          file_path?: string | null
          id?: never
          issue_date?: string | null
          issuer?: string | null
          kind?: string
          notes?: string | null
          notify_days?: number
          number?: string | null
          org_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_company_docs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_company_profile: {
        Row: {
          address: string | null
          brand_color: string | null
          city: string | null
          cr_number: string | null
          email: string | null
          footer_note: string | null
          header_note: string | null
          logo_path: string | null
          name_ar: string | null
          name_en: string | null
          org_id: string
          phone: string | null
          unified_no: string | null
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          city?: string | null
          cr_number?: string | null
          email?: string | null
          footer_note?: string | null
          header_note?: string | null
          logo_path?: string | null
          name_ar?: string | null
          name_en?: string | null
          org_id: string
          phone?: string | null
          unified_no?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          city?: string | null
          cr_number?: string | null
          email?: string | null
          footer_note?: string | null
          header_note?: string | null
          logo_path?: string | null
          name_ar?: string | null
          name_en?: string | null
          org_id?: string
          phone?: string | null
          unified_no?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_company_profile_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_contracts: {
        Row: {
          body: string | null
          created_at: string | null
          employee_id: number
          id: number
          org_id: string
          signed_at: string | null
          signed_name: string | null
          status: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          employee_id: number
          id?: never
          org_id: string
          signed_at?: string | null
          signed_name?: string | null
          status?: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          employee_id?: number
          id?: never
          org_id?: string
          signed_at?: string | null
          signed_name?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_courses: {
        Row: {
          hours: number | null
          id: number
          org_id: string
          provider: string | null
          title: string
        }
        Insert: {
          hours?: number | null
          id?: never
          org_id: string
          provider?: string | null
          title: string
        }
        Update: {
          hours?: number | null
          id?: never
          org_id?: string
          provider?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_courses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_deadlines: {
        Row: {
          active: boolean
          category: string | null
          day_of_month: number | null
          done_period: string | null
          due_date: string | null
          id: number
          month_of_year: number | null
          notes: string | null
          notify_days: number
          org_id: string
          recurrence: string
          title: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          day_of_month?: number | null
          done_period?: string | null
          due_date?: string | null
          id?: never
          month_of_year?: number | null
          notes?: string | null
          notify_days?: number
          org_id: string
          recurrence?: string
          title: string
        }
        Update: {
          active?: boolean
          category?: string | null
          day_of_month?: number | null
          done_period?: string | null
          due_date?: string | null
          id?: never
          month_of_year?: number | null
          notes?: string | null
          notify_days?: number
          org_id?: string
          recurrence?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_deadlines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_delegations: {
        Row: {
          from_date: string
          from_emp: number
          id: number
          org_id: string
          request_id: number | null
          to_date: string
          to_emp: number
        }
        Insert: {
          from_date: string
          from_emp: number
          id?: never
          org_id: string
          request_id?: number | null
          to_date: string
          to_emp: number
        }
        Update: {
          from_date?: string
          from_emp?: number
          id?: never
          org_id?: string
          request_id?: number | null
          to_date?: string
          to_emp?: number
        }
        Relationships: [
          {
            foreignKeyName: "awtad_delegations_from_emp_fkey"
            columns: ["from_emp"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_delegations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_delegations_to_emp_fkey"
            columns: ["to_emp"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_disciplinary: {
        Row: {
          details: string | null
          employee_id: number
          id: number
          kind: string
          on_date: string | null
          org_id: string
          status: string
        }
        Insert: {
          details?: string | null
          employee_id: number
          id?: never
          kind: string
          on_date?: string | null
          org_id: string
          status?: string
        }
        Update: {
          details?: string | null
          employee_id?: number
          id?: never
          kind?: string
          on_date?: string | null
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_disciplinary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_disciplinary_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_documents: {
        Row: {
          created_at: string | null
          employee_id: number
          expires_on: string | null
          id: number
          kind: string | null
          org_id: string
          path: string
          title: string
        }
        Insert: {
          created_at?: string | null
          employee_id: number
          expires_on?: string | null
          id?: never
          kind?: string | null
          org_id: string
          path: string
          title: string
        }
        Update: {
          created_at?: string | null
          employee_id?: number
          expires_on?: string | null
          id?: never
          kind?: string | null
          org_id?: string
          path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_employees: {
        Row: {
          active: boolean
          address: string | null
          bank_code: string | null
          basic: number | null
          birth_date: string | null
          contract_end: string | null
          cost_center: string | null
          created_at: string | null
          dept: string | null
          education: string | null
          email: string | null
          emergency_name: string | null
          emergency_phone: string | null
          employment_type: string | null
          entity_id: number | null
          gender: string | null
          gosi_no: string | null
          health_insurance_expiry: string | null
          house: number | null
          iban: string | null
          id: number
          iqama_expiry: string | null
          job: string | null
          join_date: string | null
          manager_id: number | null
          marital_status: string | null
          name: string
          nat: string
          national_id: string | null
          nationality: string | null
          occupation: string | null
          org_id: string
          other: number | null
          passport_expiry: string | null
          pay_group: string | null
          phone: string | null
          portal_username: string | null
          preboarding: boolean
          probation_end: string | null
          qiwa_contract_no: string | null
          qiwa_status: string | null
          trans: number | null
          unit_id: number | null
          work_permit_expiry: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          bank_code?: string | null
          basic?: number | null
          birth_date?: string | null
          contract_end?: string | null
          cost_center?: string | null
          created_at?: string | null
          dept?: string | null
          education?: string | null
          email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          employment_type?: string | null
          entity_id?: number | null
          gender?: string | null
          gosi_no?: string | null
          health_insurance_expiry?: string | null
          house?: number | null
          iban?: string | null
          id?: never
          iqama_expiry?: string | null
          job?: string | null
          join_date?: string | null
          manager_id?: number | null
          marital_status?: string | null
          name: string
          nat?: string
          national_id?: string | null
          nationality?: string | null
          occupation?: string | null
          org_id: string
          other?: number | null
          passport_expiry?: string | null
          pay_group?: string | null
          phone?: string | null
          portal_username?: string | null
          preboarding?: boolean
          probation_end?: string | null
          qiwa_contract_no?: string | null
          qiwa_status?: string | null
          trans?: number | null
          unit_id?: number | null
          work_permit_expiry?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          bank_code?: string | null
          basic?: number | null
          birth_date?: string | null
          contract_end?: string | null
          cost_center?: string | null
          created_at?: string | null
          dept?: string | null
          education?: string | null
          email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          employment_type?: string | null
          entity_id?: number | null
          gender?: string | null
          gosi_no?: string | null
          health_insurance_expiry?: string | null
          house?: number | null
          iban?: string | null
          id?: never
          iqama_expiry?: string | null
          job?: string | null
          join_date?: string | null
          manager_id?: number | null
          marital_status?: string | null
          name?: string
          nat?: string
          national_id?: string | null
          nationality?: string | null
          occupation?: string | null
          org_id?: string
          other?: number | null
          passport_expiry?: string | null
          pay_group?: string | null
          phone?: string | null
          portal_username?: string | null
          preboarding?: boolean
          probation_end?: string | null
          qiwa_contract_no?: string | null
          qiwa_status?: string | null
          trans?: number | null
          unit_id?: number | null
          work_permit_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_employees_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "awtad_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_entities: {
        Row: {
          cr_number: string | null
          id: number
          name: string
          notes: string | null
          org_id: string
        }
        Insert: {
          cr_number?: string | null
          id?: never
          name: string
          notes?: string | null
          org_id: string
        }
        Update: {
          cr_number?: string | null
          id?: never
          name?: string
          notes?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_entities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_exit_tasks: {
        Row: {
          done: boolean
          employee_id: number
          id: number
          org_id: string
          title: string
        }
        Insert: {
          done?: boolean
          employee_id: number
          id?: never
          org_id: string
          title: string
        }
        Update: {
          done?: boolean
          employee_id?: number
          id?: never
          org_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_exit_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_exit_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_expense_policies: {
        Row: {
          category: string
          dept: string | null
          id: number
          max_amount: number | null
          monthly_budget: number | null
          note: string | null
          org_id: string
        }
        Insert: {
          category: string
          dept?: string | null
          id?: never
          max_amount?: number | null
          monthly_budget?: number | null
          note?: string | null
          org_id: string
        }
        Update: {
          category?: string
          dept?: string | null
          id?: never
          max_amount?: number | null
          monthly_budget?: number | null
          note?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_expense_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          employee_id: number
          expense_date: string | null
          flagged: string | null
          id: number
          note: string | null
          org_id: string
          paid_in: string | null
          reimburse: boolean
          status: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          employee_id: number
          expense_date?: string | null
          flagged?: string | null
          id?: never
          note?: string | null
          org_id: string
          paid_in?: string | null
          reimburse?: boolean
          status?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          employee_id?: number
          expense_date?: string | null
          flagged?: string | null
          id?: never
          note?: string | null
          org_id?: string
          paid_in?: string | null
          reimburse?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_fees: {
        Row: {
          amount: number
          created_at: string | null
          employee_id: number | null
          id: number
          journal_id: number | null
          kind: string
          note: string | null
          org_id: string
          paid_on: string | null
          pay_code: string | null
          vat: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          employee_id?: number | null
          id?: never
          journal_id?: number | null
          kind: string
          note?: string | null
          org_id: string
          paid_on?: string | null
          pay_code?: string | null
          vat?: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          employee_id?: number | null
          id?: never
          journal_id?: number | null
          kind?: string
          note?: string | null
          org_id?: string
          paid_on?: string | null
          pay_code?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "awtad_fees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_fees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_field_reports: {
        Row: {
          body: string | null
          created_at: string | null
          employee_id: number
          id: number
          lat: number | null
          lng: number | null
          org_id: string
          photo_path: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          employee_id: number
          id?: never
          lat?: number | null
          lng?: number | null
          org_id: string
          photo_path?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          employee_id?: number
          id?: never
          lat?: number | null
          lng?: number | null
          org_id?: string
          photo_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_field_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_field_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_fiscal_years: {
        Row: {
          end_date: string
          id: number
          name: string
          org_id: string
          start_date: string
          status: string
        }
        Insert: {
          end_date: string
          id?: never
          name: string
          org_id: string
          start_date: string
          status?: string
        }
        Update: {
          end_date?: string
          id?: never
          name?: string
          org_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_fiscal_years_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_goals: {
        Row: {
          cycle: string | null
          employee_id: number
          id: number
          kind: string | null
          org_id: string
          progress: number | null
          title: string
          weight: number | null
        }
        Insert: {
          cycle?: string | null
          employee_id: number
          id?: never
          kind?: string | null
          org_id: string
          progress?: number | null
          title: string
          weight?: number | null
        }
        Update: {
          cycle?: string | null
          employee_id?: number
          id?: never
          kind?: string | null
          org_id?: string
          progress?: number | null
          title?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_goals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_group_members: {
        Row: {
          employee_id: number
          group_id: number
          id: number
          org_id: string
        }
        Insert: {
          employee_id: number
          group_id: number
          id?: never
          org_id: string
        }
        Update: {
          employee_id?: number
          group_id?: number
          id?: never
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "awtad_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_group_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_groups: {
        Row: {
          code: string | null
          id: number
          name: string
          org_id: string
          supervisor_id: number | null
        }
        Insert: {
          code?: string | null
          id?: never
          name: string
          org_id: string
          supervisor_id?: number | null
        }
        Update: {
          code?: string | null
          id?: never
          name?: string
          org_id?: string
          supervisor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_groups_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_holidays: {
        Row: {
          day: string
          id: number
          name: string
          org_id: string
          scope: string | null
        }
        Insert: {
          day: string
          id?: never
          name: string
          org_id: string
          scope?: string | null
        }
        Update: {
          day?: string
          id?: never
          name?: string
          org_id?: string
          scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_holidays_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_integration_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: number
          org_id: string
          platform: string
          result: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: never
          org_id: string
          platform: string
          result?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: never
          org_id?: string
          platform?: string
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_integration_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_integrations: {
        Row: {
          establishment_ref: string | null
          id: number
          last_sync: string | null
          notes: string | null
          org_id: string
          platform: string
          status: string
        }
        Insert: {
          establishment_ref?: string | null
          id?: never
          last_sync?: string | null
          notes?: string | null
          org_id: string
          platform: string
          status?: string
        }
        Update: {
          establishment_ref?: string | null
          id?: never
          last_sync?: string | null
          notes?: string | null
          org_id?: string
          platform?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_jobs: {
        Row: {
          created_at: string | null
          dept: string | null
          description: string | null
          id: number
          org_id: string
          requirements: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string | null
          dept?: string | null
          description?: string | null
          id?: never
          org_id: string
          requirements?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string | null
          dept?: string | null
          description?: string | null
          id?: never
          org_id?: string
          requirements?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_journal_entries: {
        Row: {
          created_at: string | null
          id: number
          lines: Json
          org_id: string
          period: string
          total: number | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          lines: Json
          org_id: string
          period: string
          total?: number | null
        }
        Update: {
          created_at?: string | null
          id?: never
          lines?: Json
          org_id?: string
          period?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_journal_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_journal_lines: {
        Row: {
          account_id: number
          credit: number
          debit: number
          dept: string | null
          employee_id: number | null
          id: number
          journal_id: number
          memo: string | null
          org_id: string
        }
        Insert: {
          account_id: number
          credit?: number
          debit?: number
          dept?: string | null
          employee_id?: number | null
          id?: never
          journal_id: number
          memo?: string | null
          org_id: string
        }
        Update: {
          account_id?: number
          credit?: number
          debit?: number
          dept?: string | null
          employee_id?: number | null
          id?: never
          journal_id?: number
          memo?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "awtad_acct_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "awtad_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_journal_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_journals: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_date: string
          entry_no: number
          id: number
          org_id: string
          reversed_of: number | null
          source: string
          source_ref: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date: string
          entry_no: number
          id?: never
          org_id: string
          reversed_of?: number | null
          source?: string
          source_ref?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_no?: number
          id?: never
          org_id?: string
          reversed_of?: number | null
          source?: string
          source_ref?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_journals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_learning_paths: {
        Row: {
          description: string | null
          id: number
          name: string
          org_id: string
        }
        Insert: {
          description?: string | null
          id?: never
          name: string
          org_id: string
        }
        Update: {
          description?: string | null
          id?: never
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_learning_paths_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_leave_adjustments: {
        Row: {
          created_at: string | null
          days: number
          employee_id: number
          id: number
          kind: string
          note: string | null
          org_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          days: number
          employee_id: number
          id?: never
          kind: string
          note?: string | null
          org_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          days?: number
          employee_id?: number
          id?: never
          kind?: string
          note?: string | null
          org_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "awtad_leave_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_leave_adjustments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_leave_policies: {
        Row: {
          days: number
          id: number
          kind: string
          note: string | null
          org_id: string
          paid_pct: number
        }
        Insert: {
          days: number
          id?: never
          kind: string
          note?: string | null
          org_id: string
          paid_pct?: number
        }
        Update: {
          days?: number
          id?: never
          kind?: string
          note?: string | null
          org_id?: string
          paid_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "awtad_leave_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_leaves: {
        Row: {
          created_at: string | null
          days: number
          employee_id: number
          from_date: string
          id: number
          org_id: string
          returned_on: string | null
          status: string
          to_date: string
          type: string
        }
        Insert: {
          created_at?: string | null
          days: number
          employee_id: number
          from_date: string
          id?: never
          org_id: string
          returned_on?: string | null
          status?: string
          to_date: string
          type: string
        }
        Update: {
          created_at?: string | null
          days?: number
          employee_id?: number
          from_date?: string
          id?: never
          org_id?: string
          returned_on?: string | null
          status?: string
          to_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_leaves_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_letters: {
        Row: {
          addressed_to: string | null
          created_at: string | null
          employee_id: number
          id: number
          kind: string
          org_id: string
          status: string
        }
        Insert: {
          addressed_to?: string | null
          created_at?: string | null
          employee_id: number
          id?: never
          kind: string
          org_id: string
          status?: string
        }
        Update: {
          addressed_to?: string | null
          created_at?: string | null
          employee_id?: number
          id?: never
          kind?: string
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_letters_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_letters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_lists: {
        Row: {
          id: number
          kind: string
          name: string
          org_id: string
        }
        Insert: {
          id?: never
          kind: string
          name: string
          org_id: string
        }
        Update: {
          id?: never
          kind?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_lists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_loans: {
        Row: {
          amount: number
          created_at: string | null
          employee_id: number
          id: number
          installment: number | null
          note: string | null
          org_id: string
          start_month: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          employee_id: number
          id?: never
          installment?: number | null
          note?: string | null
          org_id: string
          start_month?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          employee_id?: number
          id?: never
          installment?: number | null
          note?: string | null
          org_id?: string
          start_month?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_loans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_locations: {
        Row: {
          active: boolean
          id: number
          kind: string | null
          lat: number | null
          lng: number | null
          name: string
          org_id: string
          radius_m: number | null
        }
        Insert: {
          active?: boolean
          id?: never
          kind?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          org_id: string
          radius_m?: number | null
        }
        Update: {
          active?: boolean
          id?: never
          kind?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          org_id?: string
          radius_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          employee_id: number | null
          id: number
          kind: string | null
          org_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          employee_id?: number | null
          id?: never
          kind?: string | null
          org_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          employee_id?: number | null
          id?: never
          kind?: string | null
          org_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_onboarding_tasks: {
        Row: {
          done: boolean
          due: string | null
          employee_id: number
          id: number
          org_id: string
          title: string
        }
        Insert: {
          done?: boolean
          due?: string | null
          employee_id: number
          id?: never
          org_id: string
          title: string
        }
        Update: {
          done?: boolean
          due?: string | null
          employee_id?: number
          id?: never
          org_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_onboarding_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_onboarding_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_org_units: {
        Row: {
          created_at: string | null
          head_id: number | null
          id: number
          name: string
          org_id: string
          parent_id: number | null
        }
        Insert: {
          created_at?: string | null
          head_id?: number | null
          id?: never
          name: string
          org_id: string
          parent_id?: number | null
        }
        Update: {
          created_at?: string | null
          head_id?: number | null
          id?: never
          name?: string
          org_id?: string
          parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_org_units_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_org_units_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "awtad_org_units"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json
          slug?: string | null
        }
        Relationships: []
      }
      awtad_path_courses: {
        Row: {
          course_id: number
          id: number
          org_id: string
          path_id: number
          position: number | null
        }
        Insert: {
          course_id: number
          id?: never
          org_id: string
          path_id: number
          position?: number | null
        }
        Update: {
          course_id?: number
          id?: never
          org_id?: string
          path_id?: number
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_path_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "awtad_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_path_courses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_path_courses_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "awtad_learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_petty_cash: {
        Row: {
          amount: number
          employee_id: number
          id: number
          issued_on: string | null
          note: string | null
          org_id: string
        }
        Insert: {
          amount: number
          employee_id: number
          id?: never
          issued_on?: string | null
          note?: string | null
          org_id: string
        }
        Update: {
          amount?: number
          employee_id?: number
          id?: never
          issued_on?: string | null
          note?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_petty_cash_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_petty_cash_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_petty_spend: {
        Row: {
          amount: number
          id: number
          note: string | null
          org_id: string
          petty_id: number
          spent_on: string | null
        }
        Insert: {
          amount: number
          id?: never
          note?: string | null
          org_id: string
          petty_id: number
          spent_on?: string | null
        }
        Update: {
          amount?: number
          id?: never
          note?: string | null
          org_id?: string
          petty_id?: number
          spent_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_petty_spend_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_petty_spend_petty_id_fkey"
            columns: ["petty_id"]
            isOneToOne: false
            referencedRelation: "awtad_petty_cash"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_profiles: {
        Row: {
          email: string | null
          employee_id: number | null
          full_name: string | null
          id: string
          module_access: string[] | null
          org_id: string
          portal_created_at: string | null
          portal_username: string | null
          role: string
        }
        Insert: {
          email?: string | null
          employee_id?: number | null
          full_name?: string | null
          id: string
          module_access?: string[] | null
          org_id: string
          portal_created_at?: string | null
          portal_username?: string | null
          role?: string
        }
        Update: {
          email?: string | null
          employee_id?: number | null
          full_name?: string | null
          id?: string
          module_access?: string[] | null
          org_id?: string
          portal_created_at?: string | null
          portal_username?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_requests: {
        Row: {
          applied: boolean
          approvals: Json
          check_in: string | null
          check_out: string | null
          comment: string | null
          compensation: string | null
          created_at: string | null
          decided_by: string | null
          delegate_to: number | null
          employee_id: number
          end_date: string | null
          hours: number | null
          id: number
          kind: string
          org_id: string
          reason: string | null
          req_date: string | null
          required_levels: number
          shift_id: number | null
          status: string
        }
        Insert: {
          applied?: boolean
          approvals?: Json
          check_in?: string | null
          check_out?: string | null
          comment?: string | null
          compensation?: string | null
          created_at?: string | null
          decided_by?: string | null
          delegate_to?: number | null
          employee_id: number
          end_date?: string | null
          hours?: number | null
          id?: never
          kind: string
          org_id: string
          reason?: string | null
          req_date?: string | null
          required_levels?: number
          shift_id?: number | null
          status?: string
        }
        Update: {
          applied?: boolean
          approvals?: Json
          check_in?: string | null
          check_out?: string | null
          comment?: string | null
          compensation?: string | null
          created_at?: string | null
          decided_by?: string | null
          delegate_to?: number | null
          employee_id?: number
          end_date?: string | null
          hours?: number | null
          id?: never
          kind?: string
          org_id?: string
          reason?: string | null
          req_date?: string | null
          required_levels?: number
          shift_id?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_requests_delegate_to_fkey"
            columns: ["delegate_to"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_requests_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "awtad_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_review_cycles: {
        Row: {
          criteria: string | null
          from_date: string | null
          id: number
          kind: string | null
          name: string
          org_id: string
          status: string
          to_date: string | null
        }
        Insert: {
          criteria?: string | null
          from_date?: string | null
          id?: never
          kind?: string | null
          name: string
          org_id: string
          status?: string
          to_date?: string | null
        }
        Update: {
          criteria?: string | null
          from_date?: string | null
          id?: never
          kind?: string | null
          name?: string
          org_id?: string
          status?: string
          to_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_review_cycles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_reviews: {
        Row: {
          comment: string | null
          cycle: string | null
          cycle_id: number | null
          employee_id: number
          id: number
          org_id: string
          reviewer_type: string | null
          score: number | null
        }
        Insert: {
          comment?: string | null
          cycle?: string | null
          cycle_id?: number | null
          employee_id: number
          id?: never
          org_id: string
          reviewer_type?: string | null
          score?: number | null
        }
        Update: {
          comment?: string | null
          cycle?: string | null
          cycle_id?: number | null
          employee_id?: number
          id?: never
          org_id?: string
          reviewer_type?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_salary_bands: {
        Row: {
          id: number
          job: string
          max_sal: number | null
          mid_sal: number | null
          min_sal: number | null
          org_id: string
        }
        Insert: {
          id?: never
          job: string
          max_sal?: number | null
          mid_sal?: number | null
          min_sal?: number | null
          org_id: string
        }
        Update: {
          id?: never
          job?: string
          max_sal?: number | null
          mid_sal?: number | null
          min_sal?: number | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_salary_bands_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_saved_reports: {
        Row: {
          columns: Json
          created_at: string | null
          dataset: string
          filters: Json
          id: number
          name: string
          org_id: string
        }
        Insert: {
          columns?: Json
          created_at?: string | null
          dataset: string
          filters?: Json
          id?: never
          name: string
          org_id: string
        }
        Update: {
          columns?: Json
          created_at?: string | null
          dataset?: string
          filters?: Json
          id?: never
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_saved_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_seasons: {
        Row: {
          daily_hours: number | null
          from_date: string
          id: number
          name: string
          org_id: string
          shift_end: string | null
          shift_start: string | null
          to_date: string
        }
        Insert: {
          daily_hours?: number | null
          from_date: string
          id?: never
          name: string
          org_id: string
          shift_end?: string | null
          shift_start?: string | null
          to_date: string
        }
        Update: {
          daily_hours?: number | null
          from_date?: string
          id?: never
          name?: string
          org_id?: string
          shift_end?: string | null
          shift_start?: string | null
          to_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_seasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_secrets: {
        Row: {
          config: Json
          has_secret: boolean | null
          org_id: string
          provider: string
          secret: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json
          has_secret?: boolean | null
          org_id: string
          provider: string
          secret?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          has_secret?: boolean | null
          org_id?: string
          provider?: string
          secret?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_secrets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_shift_assign: {
        Row: {
          employee_id: number
          from_date: string
          id: number
          org_id: string
          repeat_rule: string | null
          shift_id: number
          until_date: string | null
        }
        Insert: {
          employee_id: number
          from_date: string
          id?: never
          org_id: string
          repeat_rule?: string | null
          shift_id: number
          until_date?: string | null
        }
        Update: {
          employee_id?: number
          from_date?: string
          id?: never
          org_id?: string
          repeat_rule?: string | null
          shift_id?: number
          until_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_shift_assign_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_shift_assign_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_shift_assign_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "awtad_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_shifts: {
        Row: {
          auto_checkout: string | null
          break_end: string | null
          break_start: string | null
          differential_pct: number | null
          end_time: string | null
          flex_minutes: number | null
          id: number
          kind: string | null
          name: string
          org_id: string
          required_hours: number | null
          start_time: string | null
          work_days: string | null
        }
        Insert: {
          auto_checkout?: string | null
          break_end?: string | null
          break_start?: string | null
          differential_pct?: number | null
          end_time?: string | null
          flex_minutes?: number | null
          id?: never
          kind?: string | null
          name: string
          org_id: string
          required_hours?: number | null
          start_time?: string | null
          work_days?: string | null
        }
        Update: {
          auto_checkout?: string | null
          break_end?: string | null
          break_start?: string | null
          differential_pct?: number | null
          end_time?: string | null
          flex_minutes?: number | null
          id?: never
          kind?: string | null
          name?: string
          org_id?: string
          required_hours?: number | null
          start_time?: string | null
          work_days?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_survey_participation: {
        Row: {
          employee_id: number
          id: number
          org_id: string
          survey_id: number
        }
        Insert: {
          employee_id: number
          id?: never
          org_id: string
          survey_id: number
        }
        Update: {
          employee_id?: number
          id?: never
          org_id?: string
          survey_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "awtad_survey_participation_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_survey_participation_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_survey_participation_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "awtad_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_survey_responses: {
        Row: {
          comment: string | null
          created_at: string | null
          id: number
          org_id: string
          score: number | null
          survey_id: number
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: never
          org_id: string
          score?: number | null
          survey_id: number
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: never
          org_id?: string
          score?: number | null
          survey_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "awtad_survey_responses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "awtad_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_surveys: {
        Row: {
          created_at: string | null
          id: number
          org_id: string
          question: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          org_id: string
          question: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: never
          org_id?: string
          question?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_surveys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_trainings: {
        Row: {
          course_id: number
          employee_id: number
          id: number
          org_id: string
          status: string
        }
        Insert: {
          course_id: number
          employee_id: number
          id?: never
          org_id: string
          status?: string
        }
        Update: {
          course_id?: number
          employee_id?: number
          id?: never
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_trainings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "awtad_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_trainings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_trainings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_trips: {
        Row: {
          daily_allowance: number | null
          destination: string
          employee_id: number
          from_date: string | null
          id: number
          org_id: string
          status: string
          to_date: string | null
        }
        Insert: {
          daily_allowance?: number | null
          destination: string
          employee_id: number
          from_date?: string | null
          id?: never
          org_id: string
          status?: string
          to_date?: string | null
        }
        Update: {
          daily_allowance?: number | null
          destination?: string
          employee_id?: number
          from_date?: string | null
          id?: never
          org_id?: string
          status?: string
          to_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awtad_trips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_trips_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      awtad_verifications: {
        Row: {
          answered_at: string | null
          comment: string | null
          created_at: string | null
          employee_id: number
          id: number
          lat: number | null
          lng: number | null
          org_id: string
          status: string
          title: string
        }
        Insert: {
          answered_at?: string | null
          comment?: string | null
          created_at?: string | null
          employee_id: number
          id?: never
          lat?: number | null
          lng?: number | null
          org_id: string
          status?: string
          title: string
        }
        Update: {
          answered_at?: string | null
          comment?: string | null
          created_at?: string | null
          employee_id?: number
          id?: never
          lat?: number | null
          lng?: number | null
          org_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "awtad_verifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "awtad_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awtad_verifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "awtad_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      benefits: {
        Row: {
          cost: number | null
          id: string
          name: string
          org_id: string | null
          provider: string | null
          rules: Json | null
          type: string | null
        }
        Insert: {
          cost?: number | null
          id?: string
          name: string
          org_id?: string | null
          provider?: string | null
          rules?: Json | null
          type?: string | null
        }
        Update: {
          cost?: number | null
          id?: string
          name?: string
          org_id?: string | null
          provider?: string | null
          rules?: Json | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "benefits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          entity_id: string | null
          id: string
          name: string
          org_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          entity_id?: string | null
          id?: string
          name: string
          org_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          entity_id?: string | null
          id?: string
          name?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          ai_score: number | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          metadata: Json | null
          nationality: string | null
          org_id: string | null
          phone: string | null
          resume_path: string | null
          source: string | null
        }
        Insert: {
          ai_score?: number | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json | null
          nationality?: string | null
          org_id?: string | null
          phone?: string | null
          resume_path?: string | null
          source?: string | null
        }
        Update: {
          ai_score?: number | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json | null
          nationality?: string | null
          org_id?: string | null
          phone?: string | null
          resume_path?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compensation_bands: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          id: string
          job_family: string | null
          level: string | null
          max_salary: number | null
          mid_salary: number | null
          min_salary: number | null
          name: string
          org_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          job_family?: string | null
          level?: string | null
          max_salary?: number | null
          mid_salary?: number | null
          min_salary?: number | null
          name: string
          org_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          id?: string
          job_family?: string | null
          level?: string | null
          max_salary?: number | null
          mid_salary?: number | null
          min_salary?: number | null
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compensation_bands_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          authority: string
          due_date: string | null
          employee_id: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          reference_id: string | null
          requirement: string
          risk: string | null
          status: string | null
        }
        Insert: {
          authority: string
          due_date?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          reference_id?: string | null
          requirement: string
          risk?: string | null
          status?: string | null
        }
        Update: {
          authority?: string
          due_date?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          reference_id?: string | null
          requirement?: string
          risk?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_type: string | null
          employee_id: string | null
          end_date: string | null
          id: string
          number: string | null
          org_id: string | null
          probation_end_date: string | null
          start_date: string | null
          status: string | null
          terms: Json | null
        }
        Insert: {
          contract_type?: string | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          number?: string | null
          org_id?: string | null
          probation_end_date?: string | null
          start_date?: string | null
          status?: string | null
          terms?: Json | null
        }
        Update: {
          contract_type?: string | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          number?: string | null
          org_id?: string | null
          probation_end_date?: string | null
          start_date?: string | null
          status?: string | null
          terms?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          content_url: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          language: string | null
          mandatory: boolean | null
          org_id: string | null
          title: string
        }
        Insert: {
          content_url?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          language?: string | null
          mandatory?: boolean | null
          org_id?: string | null
          title: string
        }
        Update: {
          content_url?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          language?: string | null
          mandatory?: boolean | null
          org_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          id: string
          name: string
          org_id: string | null
          parent_id: string | null
        }
        Insert: {
          code?: string | null
          id?: string
          name: string
          org_id?: string | null
          parent_id?: string | null
        }
        Update: {
          code?: string | null
          id?: string
          name?: string
          org_id?: string | null
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_benefits: {
        Row: {
          benefit_id: string | null
          details: Json | null
          employee_id: string | null
          end_date: string | null
          id: string
          org_id: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          benefit_id?: string | null
          details?: Json | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          org_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          benefit_id?: string | null
          details?: Json | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          org_id?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_benefits_benefit_id_fkey"
            columns: ["benefit_id"]
            isOneToOne: false
            referencedRelation: "benefits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string | null
          employee_id: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          metadata: Json | null
          org_id: string | null
          storage_path: string | null
          title: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          org_id?: string | null
          storage_path?: string | null
          title?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          org_id?: string | null
          storage_path?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          arabic_name: string | null
          bank_name: string | null
          basic_salary: number | null
          branch_id: string | null
          created_at: string | null
          date_of_birth: string | null
          department_id: string | null
          employee_no: string
          entity_id: string | null
          first_name: string | null
          gender: string | null
          hire_date: string | null
          housing_allowance: number | null
          iban: string | null
          id: string
          last_name: string | null
          manager_id: string | null
          mobile: string | null
          national_id: string | null
          nationality: string | null
          org_id: string | null
          other_allowances: number | null
          personal_email: string | null
          position_id: string | null
          status: Database["public"]["Enums"]["employee_status"] | null
          termination_date: string | null
          transport_allowance: number | null
          updated_at: string | null
          user_id: string | null
          work_email: string | null
        }
        Insert: {
          arabic_name?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          branch_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          employee_no: string
          entity_id?: string | null
          first_name?: string | null
          gender?: string | null
          hire_date?: string | null
          housing_allowance?: number | null
          iban?: string | null
          id?: string
          last_name?: string | null
          manager_id?: string | null
          mobile?: string | null
          national_id?: string | null
          nationality?: string | null
          org_id?: string | null
          other_allowances?: number | null
          personal_email?: string | null
          position_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          termination_date?: string | null
          transport_allowance?: number | null
          updated_at?: string | null
          user_id?: string | null
          work_email?: string | null
        }
        Update: {
          arabic_name?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          branch_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          employee_no?: string
          entity_id?: string | null
          first_name?: string | null
          gender?: string | null
          hire_date?: string | null
          housing_allowance?: number | null
          iban?: string | null
          id?: string
          last_name?: string | null
          manager_id?: string | null
          mobile?: string | null
          national_id?: string | null
          nationality?: string | null
          org_id?: string | null
          other_allowances?: number | null
          personal_email?: string | null
          position_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          termination_date?: string | null
          transport_allowance?: number | null
          updated_at?: string | null
          user_id?: string | null
          work_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_surveys: {
        Row: {
          anonymous: boolean
          created_at: string
          id: string
          org_id: string
          period_end: string | null
          period_start: string | null
          question_set: string
          status: string
          title: string
        }
        Insert: {
          anonymous?: boolean
          created_at?: string
          id?: string
          org_id: string
          period_end?: string | null
          period_start?: string | null
          question_set?: string
          status?: string
          title: string
        }
        Update: {
          anonymous?: boolean
          created_at?: string
          id?: string
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          question_set?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_surveys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_id: string | null
          employee_id: string | null
          id: string
          org_id: string | null
          progress: number | null
          status: string | null
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string | null
          employee_id?: string | null
          id?: string
          org_id?: string | null
          progress?: number | null
          status?: string | null
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string | null
          employee_id?: string | null
          id?: string
          org_id?: string | null
          progress?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          active: boolean | null
          cr_number: string | null
          id: string
          legal_name: string | null
          name: string
          org_id: string | null
        }
        Insert: {
          active?: boolean | null
          cr_number?: string | null
          id?: string
          legal_name?: string | null
          name: string
          org_id?: string | null
        }
        Update: {
          active?: boolean | null
          cr_number?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_policies: {
        Row: {
          active: boolean | null
          id: string
          name: string
          org_id: string | null
          rules: Json | null
        }
        Insert: {
          active?: boolean | null
          id?: string
          name: string
          org_id?: string | null
          rules?: Json | null
        }
        Update: {
          active?: boolean | null
          id?: string
          name?: string
          org_id?: string | null
          rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          employee_id: string | null
          expense_date: string | null
          id: string
          merchant: string | null
          ocr_data: Json | null
          org_id: string | null
          paid_at: string | null
          policy_id: string | null
          receipt_path: string | null
          status: Database["public"]["Enums"]["request_status"] | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          employee_id?: string | null
          expense_date?: string | null
          id?: string
          merchant?: string | null
          ocr_data?: Json | null
          org_id?: string | null
          paid_at?: string | null
          policy_id?: string | null
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          employee_id?: string | null
          expense_date?: string | null
          id?: string
          merchant?: string | null
          ocr_data?: Json | null
          org_id?: string | null
          paid_at?: string | null
          policy_id?: string | null
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "expense_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          description: string | null
          due_date: string | null
          employee_id: string | null
          id: string
          org_id: string | null
          progress: number | null
          status: string | null
          target: number | null
          title: string | null
        }
        Insert: {
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          id?: string
          org_id?: string | null
          progress?: number | null
          status?: string | null
          target?: number | null
          title?: string | null
        }
        Update: {
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          id?: string
          org_id?: string | null
          progress?: number | null
          status?: string | null
          target?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string | null
          feedback: string | null
          id: string
          interviewer_id: string | null
          meeting_url: string | null
          org_id: string | null
          scheduled_at: string | null
          score: number | null
          status: string | null
        }
        Insert: {
          application_id?: string | null
          feedback?: string | null
          id?: string
          interviewer_id?: string | null
          meeting_url?: string | null
          org_id?: string | null
          scheduled_at?: string | null
          score?: number | null
          status?: string | null
        }
        Update: {
          application_id?: string | null
          feedback?: string | null
          id?: string
          interviewer_id?: string | null
          meeting_url?: string | null
          org_id?: string | null
          scheduled_at?: string | null
          score?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          approval_status: Database["public"]["Enums"]["request_status"] | null
          closing_at: string | null
          department_id: string | null
          description: string | null
          employment_type: string | null
          id: string
          location: string | null
          org_id: string | null
          position_id: string | null
          published_at: string | null
          status: string | null
          title: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["request_status"] | null
          closing_at?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          org_id?: string | null
          position_id?: string | null
          published_at?: string | null
          status?: string | null
          title: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["request_status"] | null
          closing_at?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          org_id?: string | null
          position_id?: string | null
          published_at?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          employee_id: string | null
          entitlement: number | null
          id: string
          leave_type_id: string | null
          org_id: string | null
          remaining: number | null
          used: number | null
          year: number
        }
        Insert: {
          employee_id?: string | null
          entitlement?: number | null
          id?: string
          leave_type_id?: string | null
          org_id?: string | null
          remaining?: number | null
          used?: number | null
          year: number
        }
        Update: {
          employee_id?: string | null
          entitlement?: number | null
          id?: string
          leave_type_id?: string | null
          org_id?: string | null
          remaining?: number | null
          used?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approver_id: string | null
          attachment_path: string | null
          created_at: string | null
          days: number | null
          employee_id: string | null
          end_date: string
          id: string
          leave_type_id: string | null
          org_id: string | null
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["request_status"] | null
        }
        Insert: {
          approver_id?: string | null
          attachment_path?: string | null
          created_at?: string | null
          days?: number | null
          employee_id?: string | null
          end_date: string
          id?: string
          leave_type_id?: string | null
          org_id?: string | null
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["request_status"] | null
        }
        Update: {
          approver_id?: string | null
          attachment_path?: string | null
          created_at?: string | null
          days?: number | null
          employee_id?: string | null
          end_date?: string
          id?: string
          leave_type_id?: string | null
          org_id?: string | null
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          annual_days: number | null
          id: string
          name: string
          org_id: string | null
          paid: boolean | null
          requires_attachment: boolean | null
        }
        Insert: {
          annual_days?: number | null
          id?: string
          name: string
          org_id?: string | null
          paid?: boolean | null
          requires_attachment?: boolean | null
        }
        Update: {
          annual_days?: number | null
          id?: string
          name?: string
          org_id?: string | null
          paid?: boolean | null
          requires_attachment?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string | null
          id: string
          org_id: string | null
          role: Database["public"]["Enums"]["member_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          org_id: string | null
          read_at: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          read_at?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          read_at?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          employee_id: string | null
          id: string
          org_id: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          id?: string
          org_id: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          id?: string
          org_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string | null
          cr_number: string | null
          created_at: string | null
          currency: string | null
          id: string
          legal_name: string | null
          name: string
          timezone: string | null
        }
        Insert: {
          country?: string | null
          cr_number?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          legal_name?: string | null
          name: string
          timezone?: string | null
        }
        Update: {
          country?: string | null
          cr_number?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          timezone?: string | null
        }
        Relationships: []
      }
      pay_groups: {
        Row: {
          currency: string | null
          frequency: string | null
          id: string
          name: string
          org_id: string | null
          rules: Json | null
        }
        Insert: {
          currency?: string | null
          frequency?: string | null
          id?: string
          name: string
          org_id?: string | null
          rules?: Json | null
        }
        Update: {
          currency?: string | null
          frequency?: string | null
          id?: string
          name?: string
          org_id?: string | null
          rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pay_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          allowances: number | null
          basic: number | null
          deductions: number | null
          details: Json | null
          employee_id: string | null
          id: string
          net: number | null
          org_id: string | null
          overtime: number | null
          run_id: string | null
        }
        Insert: {
          allowances?: number | null
          basic?: number | null
          deductions?: number | null
          details?: Json | null
          employee_id?: string | null
          id?: string
          net?: number | null
          org_id?: string | null
          overtime?: number | null
          run_id?: string | null
        }
        Update: {
          allowances?: number | null
          basic?: number | null
          deductions?: number | null
          details?: Json | null
          employee_id?: string | null
          id?: string
          net?: number | null
          org_id?: string | null
          overtime?: number | null
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string | null
          deductions: number | null
          gross: number | null
          id: string
          net: number | null
          org_id: string | null
          pay_date: string | null
          pay_group_id: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          deductions?: number | null
          gross?: number | null
          id?: string
          net?: number | null
          org_id?: string | null
          pay_date?: string | null
          pay_group_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          deductions?: number | null
          gross?: number | null
          id?: string
          net?: number | null
          org_id?: string | null
          pay_date?: string | null
          pay_group_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_cycles: {
        Row: {
          end_date: string | null
          id: string
          mode: string | null
          name: string
          org_id: string | null
          settings: Json | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          end_date?: string | null
          id?: string
          mode?: string | null
          name: string
          org_id?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          end_date?: string | null
          id?: string
          mode?: string | null
          name?: string
          org_id?: string | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_cycles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          answers: Json | null
          cycle_id: string | null
          employee_id: string | null
          id: string
          org_id: string | null
          reviewer_id: string | null
          score: number | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          answers?: Json | null
          cycle_id?: string | null
          employee_id?: string | null
          id?: string
          org_id?: string | null
          reviewer_id?: string | null
          score?: number | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          answers?: Json | null
          cycle_id?: string | null
          employee_id?: string | null
          id?: string
          org_id?: string | null
          reviewer_id?: string | null
          score?: number | null
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          department_id: string | null
          grade: string | null
          headcount: number | null
          id: string
          org_id: string | null
          title: string
        }
        Insert: {
          department_id?: string | null
          grade?: string | null
          headcount?: number | null
          id?: string
          org_id?: string | null
          title: string
        }
        Update: {
          department_id?: string | null
          grade?: string | null
          headcount?: number | null
          id?: string
          org_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          break_minutes: number | null
          end_time: string | null
          id: string
          name: string | null
          org_id: string | null
          schedule_id: string | null
          start_time: string | null
        }
        Insert: {
          break_minutes?: number | null
          end_time?: string | null
          id?: string
          name?: string | null
          org_id?: string | null
          schedule_id?: string | null
          start_time?: string | null
        }
        Update: {
          break_minutes?: number | null
          end_time?: string | null
          id?: string
          name?: string | null
          org_id?: string | null
          schedule_id?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_requests: {
        Row: {
          actual_cost: number | null
          budget: number | null
          destination: string | null
          details: Json | null
          employee_id: string | null
          end_date: string | null
          estimated_cost: number | null
          id: string
          org_id: string | null
          policy_id: string | null
          purpose: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["request_status"] | null
        }
        Insert: {
          actual_cost?: number | null
          budget?: number | null
          destination?: string | null
          details?: Json | null
          employee_id?: string | null
          end_date?: string | null
          estimated_cost?: number | null
          id?: string
          org_id?: string | null
          policy_id?: string | null
          purpose?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
        }
        Update: {
          actual_cost?: number | null
          budget?: number | null
          destination?: string | null
          details?: Json | null
          employee_id?: string | null
          end_date?: string | null
          estimated_cost?: number | null
          id?: string
          org_id?: string | null
          policy_id?: string | null
          purpose?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "expense_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          id: string
          name: string
          org_id: string | null
          rules: Json | null
          timezone: string | null
          weekly_hours: number | null
        }
        Insert: {
          id?: string
          name: string
          org_id?: string | null
          rules?: Json | null
          timezone?: string | null
          weekly_hours?: number | null
        }
        Update: {
          id?: string
          name?: string
          org_id?: string | null
          rules?: Json | null
          timezone?: string | null
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          context: Json | null
          current_step: number | null
          entity_id: string | null
          entity_type: string | null
          id: string
          org_id: string | null
          started_at: string | null
          status: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          current_step?: number | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          org_id?: string | null
          started_at?: string | null
          status?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          current_step?: number | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          org_id?: string | null
          started_at?: string | null
          status?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          active: boolean | null
          definition: Json
          id: string
          module: string
          name: string
          org_id: string | null
          version: number | null
        }
        Insert: {
          active?: boolean | null
          definition?: Json
          id?: string
          module: string
          name: string
          org_id?: string | null
          version?: number | null
        }
        Update: {
          active?: boolean | null
          definition?: Json
          id?: string
          module?: string
          name?: string
          org_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_plans: {
        Row: {
          assumptions: string | null
          budget: number | null
          created_at: string
          department_id: string | null
          id: string
          name: string
          org_id: string
          period_end: string | null
          period_start: string | null
          status: string
        }
        Insert: {
          assumptions?: string | null
          budget?: number | null
          created_at?: string
          department_id?: string | null
          id?: string
          name: string
          org_id: string
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Update: {
          assumptions?: string | null
          budget?: number | null
          created_at?: string
          department_id?: string | null
          id?: string
          name?: string
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_plans_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      awtad__event: {
        Args: {
          p_amount: number
          p_date: string
          p_dept: string
          p_desc: string
          p_emp: number
          p_event: string
          p_org: string
          p_ref: string
          p_source: string
        }
        Returns: number
      }
      awtad__post: {
        Args: {
          p_date: string
          p_desc: string
          p_lines: Json
          p_org: string
          p_ref: string
          p_source: string
          p_user?: string
        }
        Returns: number
      }
      awtad__seed_chart: { Args: { p_org: string }; Returns: number }
      awtad__tb: {
        Args: { p_from: string; p_org: string; p_to: string }
        Returns: {
          account_id: number
          active: boolean
          code: string
          credit: number
          debit: number
          is_group: boolean
          name: string
          parent_id: number
          type: string
        }[]
      }
      awtad_apply_request: { Args: { p_id: number }; Returns: string }
      awtad_assign_user: {
        Args: { p_email: string; p_employee_id: number; p_role: string }
        Returns: string
      }
      awtad_birthday_greetings: { Args: never; Returns: number }
      awtad_close_year: { Args: { p_year: number }; Returns: number }
      awtad_create_org: {
        Args: { my_name?: string; org_name: string }
        Returns: string
      }
      awtad_cron_activate: { Args: never; Returns: number }
      awtad_cron_birthdays: { Args: never; Returns: number }
      awtad_cron_renewals: { Args: never; Returns: number }
      awtad_cron_shift_reminders: { Args: never; Returns: number }
      awtad_decide_request: {
        Args: { p_approve: boolean; p_comment?: string; p_id: number }
        Returns: string
      }
      awtad_generate_renewals: { Args: { p_days?: number }; Returns: number }
      awtad_ledger: {
        Args: { p_account: number; p_from: string; p_to: string }
        Returns: {
          credit: number
          debit: number
          description: string
          entry_date: string
          entry_no: number
          journal_id: number
          memo: string
          source: string
        }[]
      }
      awtad_my_emp: { Args: never; Returns: number }
      awtad_my_org: { Args: never; Returns: string }
      awtad_my_role: { Args: never; Returns: string }
      awtad_post_journal: {
        Args: {
          p_date: string
          p_desc: string
          p_lines: Json
          p_ref?: string
          p_source?: string
        }
        Returns: number
      }
      awtad_post_payroll: {
        Args: {
          p_gr: number
          p_loan: number
          p_net: number
          p_ot: number
          p_period: string
          p_reimb: number
          p_salary: number
          p_social: number
        }
        Returns: number
      }
      awtad_record_fee: {
        Args: {
          p_amount: number
          p_date: string
          p_employee: number
          p_kind: string
          p_new_expiry: string
          p_note: string
          p_pay_code: string
          p_vat: number
        }
        Returns: number
      }
      awtad_reverse_journal: { Args: { p_id: number }; Returns: number }
      awtad_seed_chart: { Args: never; Returns: number }
      awtad_sign_contract: {
        Args: { p_id: number; p_name: string }
        Returns: string
      }
      awtad_submit_survey: {
        Args: { p_comment?: string; p_score: number; p_survey: number }
        Returns: string
      }
      awtad_trial_balance: {
        Args: { p_from: string; p_to: string }
        Returns: {
          account_id: number
          active: boolean
          code: string
          credit: number
          debit: number
          is_group: boolean
          name: string
          parent_id: number
          type: string
        }[]
      }
      awtad_update_profile: {
        Args: { p_modules: string[]; p_role: string; p_user: string }
        Returns: string
      }
      create_organization_for_current_user: {
        Args: { organization_name: string }
        Returns: string
      }
      current_org_id: { Args: never; Returns: string }
      user_has_org_role: {
        Args: {
          allowed_roles: Database["public"]["Enums"]["member_role"][]
          target_org: string
        }
        Returns: boolean
      }
      user_org_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      employee_status: "active" | "on_leave" | "probation" | "terminated"
      member_role:
        | "owner"
        | "admin"
        | "hr"
        | "finance"
        | "manager"
        | "employee"
        | "recruiter"
      request_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "paid"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      employee_status: ["active", "on_leave", "probation", "terminated"],
      member_role: [
        "owner",
        "admin",
        "hr",
        "finance",
        "manager",
        "employee",
        "recruiter",
      ],
      request_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "paid",
      ],
    },
  },
} as const
