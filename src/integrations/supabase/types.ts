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
      access_audit_log: {
        Row: {
          action: string
          actor_name: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          section_key: string
          target_name: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          section_key: string
          target_name?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          section_key?: string
          target_name?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      account_activity_log: {
        Row: {
          action: string
          actor: string | null
          actor_user_id: string | null
          created_at: string
          customer_id: string
          field_changed: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          actor_user_id?: string | null
          created_at?: string
          customer_id: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          actor_user_id?: string | null
          created_at?: string
          customer_id?: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      account_strategies: {
        Row: {
          account_types: Json
          created_at: string
          current_position: Database["public"]["Enums"]["strategy_position"]
          customer_id: string
          focus_added_at: string | null
          focus_added_by: string | null
          focus_quarter: string | null
          focus_reason: string | null
          id: string
          is_focus: boolean
          last_reviewed_at: string | null
          north_star: string | null
          owner: string | null
          status: Database["public"]["Enums"]["strategy_status"]
          strategic_value: string | null
          updated_at: string
        }
        Insert: {
          account_types?: Json
          created_at?: string
          current_position?: Database["public"]["Enums"]["strategy_position"]
          customer_id: string
          focus_added_at?: string | null
          focus_added_by?: string | null
          focus_quarter?: string | null
          focus_reason?: string | null
          id?: string
          is_focus?: boolean
          last_reviewed_at?: string | null
          north_star?: string | null
          owner?: string | null
          status?: Database["public"]["Enums"]["strategy_status"]
          strategic_value?: string | null
          updated_at?: string
        }
        Update: {
          account_types?: Json
          created_at?: string
          current_position?: Database["public"]["Enums"]["strategy_position"]
          customer_id?: string
          focus_added_at?: string | null
          focus_added_by?: string | null
          focus_quarter?: string | null
          focus_reason?: string | null
          id?: string
          is_focus?: boolean
          last_reviewed_at?: string | null
          north_star?: string | null
          owner?: string | null
          status?: Database["public"]["Enums"]["strategy_status"]
          strategic_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_strategies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "account_strategies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_date: string
          created_at: string
          deal_id: string | null
          id: string
          logged_by_user_id: string | null
          next_step: string | null
          next_step_date: string | null
          outcome: string | null
          partner_id: string
          stakeholder_id: string | null
          summary: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          activity_date?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          logged_by_user_id?: string | null
          next_step?: string | null
          next_step_date?: string | null
          outcome?: string | null
          partner_id: string
          stakeholder_id?: string | null
          summary?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          logged_by_user_id?: string | null
          next_step?: string | null
          next_step_date?: string | null
          outcome?: string | null
          partner_id?: string
          stakeholder_id?: string | null
          summary?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "activities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_outputs: {
        Row: {
          agent_name: string
          content: Json
          deal_id: string
          generated_at: string
          generated_by: string | null
          id: string
          output_type: string
        }
        Insert: {
          agent_name: string
          content?: Json
          deal_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          output_type: string
        }
        Update: {
          agent_name?: string
          content?: Json
          deal_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          output_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_outputs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_prompts: {
        Row: {
          agent_id: string
          config: Json
          created_at: string
          description: string
          id: string
          max_tokens: number
          model: string
          name: string
          status: string
          temperature: number
          template: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          config?: Json
          created_at?: string
          description?: string
          id?: string
          max_tokens?: number
          model?: string
          name: string
          status?: string
          temperature?: number
          template?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          config?: Json
          created_at?: string
          description?: string
          id?: string
          max_tokens?: number
          model?: string
          name?: string
          status?: string
          temperature?: number
          template?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_execution_log: {
        Row: {
          agent_id: string
          confidence_score: number | null
          created_at: string
          execution_time_ms: number | null
          id: string
          input_data: Json | null
          output_data: Json | null
          status: string
          ticket_id: string | null
          tokens_used: number | null
        }
        Insert: {
          agent_id: string
          confidence_score?: number | null
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          status?: string
          ticket_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          agent_id?: string
          confidence_score?: number | null
          created_at?: string
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          status?: string
          ticket_id?: string | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      ai_knowledge_sources: {
        Row: {
          category: string
          created_at: string
          id: string
          relevance_score: number | null
          searched_at: string
          source_url: string | null
          summary: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          relevance_score?: number | null
          searched_at?: string
          source_url?: string | null
          summary: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          relevance_score?: number | null
          searched_at?: string
          source_url?: string | null
          summary?: string
          title?: string
        }
        Relationships: []
      }
      ai_learning_patterns: {
        Row: {
          confidence_boost: number | null
          created_at: string
          environmental_factor: string | null
          id: string
          pattern_name: string
          recommended_swi: string | null
          sample_count: number | null
          symptom_cluster: string[] | null
          updated_at: string
        }
        Insert: {
          confidence_boost?: number | null
          created_at?: string
          environmental_factor?: string | null
          id?: string
          pattern_name: string
          recommended_swi?: string | null
          sample_count?: number | null
          symptom_cluster?: string[] | null
          updated_at?: string
        }
        Update: {
          confidence_boost?: number | null
          created_at?: string
          environmental_factor?: string | null
          id?: string
          pattern_name?: string
          recommended_swi?: string | null
          sample_count?: number | null
          symptom_cluster?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      assessment_chargers: {
        Row: {
          brand: string
          charger_type: string
          created_at: string
          id: string
          installation_location: string | null
          known_issues: string | null
          location_descriptor: string | null
          photo_urls: string[] | null
          serial_number: string | null
          service_needed: boolean | null
          status: string
          submission_id: string
        }
        Insert: {
          brand: string
          charger_type: string
          created_at?: string
          id?: string
          installation_location?: string | null
          known_issues?: string | null
          location_descriptor?: string | null
          photo_urls?: string[] | null
          serial_number?: string | null
          service_needed?: boolean | null
          status?: string
          submission_id: string
        }
        Update: {
          brand?: string
          charger_type?: string
          created_at?: string
          id?: string
          installation_location?: string | null
          known_issues?: string | null
          location_descriptor?: string | null
          photo_urls?: string[] | null
          serial_number?: string | null
          service_needed?: boolean | null
          status?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_chargers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "noch_plus_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_reports: {
        Row: {
          ai_summary: string
          charger_count: number
          city: string
          company_name: string
          created_at: string
          customer_name: string
          id: string
          pdf_storage_path: string | null
          risk_level: string
          state: string
          submission_display_id: string
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string
          charger_count?: number
          city?: string
          company_name: string
          created_at?: string
          customer_name: string
          id?: string
          pdf_storage_path?: string | null
          risk_level?: string
          state?: string
          submission_display_id: string
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string
          charger_count?: number
          city?: string
          company_name?: string
          created_at?: string
          customer_name?: string
          id?: string
          pdf_storage_path?: string | null
          risk_level?: string
          state?: string
          submission_display_id?: string
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_reports_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "noch_plus_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      autoheal_config: {
        Row: {
          agent_settings: Json
          created_at: string
          execution_rules: Json
          id: string
          model_config: Json
          output_formatting: Json
          retry_logic: Json
          token_controls: Json
          updated_at: string
        }
        Insert: {
          agent_settings?: Json
          created_at?: string
          execution_rules?: Json
          id?: string
          model_config?: Json
          output_formatting?: Json
          retry_logic?: Json
          token_controls?: Json
          updated_at?: string
        }
        Update: {
          agent_settings?: Json
          created_at?: string
          execution_rules?: Json
          id?: string
          model_config?: Json
          output_formatting?: Json
          retry_logic?: Json
          token_controls?: Json
          updated_at?: string
        }
        Relationships: []
      }
      campaign_chargers: {
        Row: {
          campaign_id: string
          charger_id: string
          created_at: string
          estimated_hours: number | null
          id: string
          in_scope: boolean
          priority: string
          scan_notes: string | null
          sequence_order: number | null
          status: string
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          charger_id: string
          created_at?: string
          estimated_hours?: number | null
          id?: string
          in_scope?: boolean
          priority?: string
          scan_notes?: string | null
          sequence_order?: number | null
          status?: string
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          charger_id?: string
          created_at?: string
          estimated_hours?: number | null
          id?: string
          in_scope?: boolean
          priority?: string
          scan_notes?: string | null
          sequence_order?: number | null
          status?: string
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_chargers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_chargers_charger_id_fkey"
            columns: ["charger_id"]
            isOneToOne: false
            referencedRelation: "charger_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_chargers_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_cost_assumptions: {
        Row: {
          airfare_buffer_pct: number
          base_labor_rate: number
          campaign_id: string
          created_at: string
          custom_overrides: Json | null
          ev_rental_daily: number
          hotel_nightly_rate: number
          hotel_tax_pct: number
          id: string
          luggage_per_flight: number
          meal_per_diem: number
          overtime_daily_threshold: number
          overtime_rate: number
          overtime_weekly_threshold: number
          portal_to_portal_rate: number
          rate_card_id: string | null
          rate_source: string
          updated_at: string
        }
        Insert: {
          airfare_buffer_pct?: number
          base_labor_rate?: number
          campaign_id: string
          created_at?: string
          custom_overrides?: Json | null
          ev_rental_daily?: number
          hotel_nightly_rate?: number
          hotel_tax_pct?: number
          id?: string
          luggage_per_flight?: number
          meal_per_diem?: number
          overtime_daily_threshold?: number
          overtime_rate?: number
          overtime_weekly_threshold?: number
          portal_to_portal_rate?: number
          rate_card_id?: string | null
          rate_source?: string
          updated_at?: string
        }
        Update: {
          airfare_buffer_pct?: number
          base_labor_rate?: number
          campaign_id?: string
          created_at?: string
          custom_overrides?: Json | null
          ev_rental_daily?: number
          hotel_nightly_rate?: number
          hotel_tax_pct?: number
          id?: string
          luggage_per_flight?: number
          meal_per_diem?: number
          overtime_daily_threshold?: number
          overtime_rate?: number
          overtime_weekly_threshold?: number
          portal_to_portal_rate?: number
          rate_card_id?: string | null
          rate_source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_cost_assumptions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_cost_assumptions_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_escalations: {
        Row: {
          assigned_to: string | null
          campaign_id: string
          charger_id: string | null
          created_at: string
          description: string | null
          id: string
          issue_type: string
          resolution_notes: string | null
          severity: string
          site_name: string | null
          status: string
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          campaign_id: string
          charger_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: string
          resolution_notes?: string | null
          severity?: string
          site_name?: string | null
          status?: string
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          campaign_id?: string
          charger_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: string
          resolution_notes?: string | null
          severity?: string
          site_name?: string | null
          status?: string
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_escalations_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_field_reports: {
        Row: {
          arrival_time: string | null
          campaign_id: string
          charger_ids: string[] | null
          created_at: string
          departure_time: string | null
          hours_logged: number | null
          id: string
          is_unscheduled: boolean | null
          notes: string | null
          photo_urls: string[] | null
          site_name: string
          status: string
          technician_id: string | null
          updated_at: string
          work_performed: string | null
        }
        Insert: {
          arrival_time?: string | null
          campaign_id: string
          charger_ids?: string[] | null
          created_at?: string
          departure_time?: string | null
          hours_logged?: number | null
          id?: string
          is_unscheduled?: boolean | null
          notes?: string | null
          photo_urls?: string[] | null
          site_name?: string
          status?: string
          technician_id?: string | null
          updated_at?: string
          work_performed?: string | null
        }
        Update: {
          arrival_time?: string | null
          campaign_id?: string
          charger_ids?: string[] | null
          created_at?: string
          departure_time?: string | null
          hours_logged?: number | null
          id?: string
          is_unscheduled?: boolean | null
          notes?: string | null
          photo_urls?: string[] | null
          site_name?: string
          status?: string
          technician_id?: string | null
          updated_at?: string
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_field_reports_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_plan_chargers: {
        Row: {
          charger_id: string
          created_at: string
          estimated_hours: number
          id: string
          notes: string | null
          plan_id: string
          priority: string
          sequence_order: number | null
          status: string
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          charger_id: string
          created_at?: string
          estimated_hours?: number
          id?: string
          notes?: string | null
          plan_id: string
          priority?: string
          sequence_order?: number | null
          status?: string
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          charger_id?: string
          created_at?: string
          estimated_hours?: number
          id?: string
          notes?: string | null
          plan_id?: string
          priority?: string
          sequence_order?: number | null
          status?: string
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_plan_chargers_charger_id_fkey"
            columns: ["charger_id"]
            isOneToOne: false
            referencedRelation: "charger_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_plan_chargers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "campaign_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_plan_chargers_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_plan_schedule: {
        Row: {
          created_at: string
          day_number: number
          day_type: string
          id: string
          notes: string | null
          overnight_city: string | null
          plan_id: string
          schedule_date: string
          sites: Json
          technician_id: string
          total_drive_miles: number
          total_travel_hours: number
          total_work_hours: number
          travel_segments: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number?: number
          day_type?: string
          id?: string
          notes?: string | null
          overnight_city?: string | null
          plan_id: string
          schedule_date: string
          sites?: Json
          technician_id: string
          total_drive_miles?: number
          total_travel_hours?: number
          total_work_hours?: number
          travel_segments?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number
          day_type?: string
          id?: string
          notes?: string | null
          overnight_city?: string | null
          plan_id?: string
          schedule_date?: string
          sites?: Json
          technician_id?: string
          total_drive_miles?: number
          total_travel_hours?: number
          total_work_hours?: number
          travel_segments?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_plan_schedule_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "campaign_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_plan_schedule_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_plan_technicians: {
        Row: {
          assigned_regions: Json | null
          created_at: string
          home_base_city: string
          home_base_lat: number | null
          home_base_lng: number | null
          id: string
          plan_id: string
          technician_id: string
          updated_at: string
        }
        Insert: {
          assigned_regions?: Json | null
          created_at?: string
          home_base_city?: string
          home_base_lat?: number | null
          home_base_lng?: number | null
          id?: string
          plan_id: string
          technician_id: string
          updated_at?: string
        }
        Update: {
          assigned_regions?: Json | null
          created_at?: string
          home_base_city?: string
          home_base_lat?: number | null
          home_base_lng?: number | null
          id?: string
          plan_id?: string
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_plan_technicians_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "campaign_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_plan_technicians_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_plans: {
        Row: {
          break_hrs: number
          campaign_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          deadline: string | null
          end_date: string | null
          hrs_per_charger: number
          hrs_per_day: number
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: string
          travel_time_min: number
          updated_at: string
          working_days: Json
        }
        Insert: {
          break_hrs?: number
          campaign_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deadline?: string | null
          end_date?: string | null
          hrs_per_charger?: number
          hrs_per_day?: number
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          travel_time_min?: number
          updated_at?: string
          working_days?: Json
        }
        Update: {
          break_hrs?: number
          campaign_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deadline?: string | null
          end_date?: string | null
          hrs_per_charger?: number
          hrs_per_day?: number
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          travel_time_min?: number
          updated_at?: string
          working_days?: Json
        }
        Relationships: [
          {
            foreignKeyName: "campaign_plans_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "campaign_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_quote_line_items: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          quantity: number
          quote_id: string
          sort_order: number
          technician_id: string | null
          unit_rate: number
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quote_id: string
          sort_order?: number
          technician_id?: string | null
          unit_rate?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quote_id?: string
          sort_order?: number
          technician_id?: string | null
          unit_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "campaign_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_quote_line_items_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_quotes: {
        Row: {
          campaign_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          is_manually_adjusted: boolean
          notes: string | null
          plan_id: string
          quote_number: string | null
          rate_card_id: string | null
          status: string
          total_amount: number
          updated_at: string
          valid_until: string | null
          version: number
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_manually_adjusted?: boolean
          notes?: string | null
          plan_id: string
          quote_number?: string | null
          rate_card_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_manually_adjusted?: boolean
          notes?: string | null
          plan_id?: string
          quote_number?: string | null
          rate_card_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_quotes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "campaign_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_quotes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "campaign_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_quotes_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_reports: {
        Row: {
          ai_executive_summary: string | null
          campaign_id: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          customer_id: string | null
          expires_at: string
          id: string
          intro_note: string | null
          pdf_storage_path: string | null
          public_token: string
          report_name: string
          require_email_to_view: boolean
          revoked_at: string | null
          revoked_by: string | null
          sections_included: Json
          snapshot_data: Json
          status: Database["public"]["Enums"]["campaign_report_status"]
          updated_at: string
          version: number
        }
        Insert: {
          ai_executive_summary?: string | null
          campaign_id: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          expires_at?: string
          id?: string
          intro_note?: string | null
          pdf_storage_path?: string | null
          public_token: string
          report_name: string
          require_email_to_view?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          sections_included?: Json
          snapshot_data?: Json
          status?: Database["public"]["Enums"]["campaign_report_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          ai_executive_summary?: string | null
          campaign_id?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          expires_at?: string
          id?: string
          intro_note?: string | null
          pdf_storage_path?: string | null
          public_token?: string
          report_name?: string
          require_email_to_view?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          sections_included?: Json
          snapshot_data?: Json
          status?: Database["public"]["Enums"]["campaign_report_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_reports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "campaign_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_schedule: {
        Row: {
          campaign_id: string
          created_at: string
          day_number: number
          day_type: string
          id: string
          notes: string | null
          overnight_city: string | null
          schedule_date: string
          sites: Json
          technician_id: string
          total_drive_miles: number
          total_travel_hours: number
          total_work_hours: number
          travel_segments: Json
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          day_number?: number
          day_type?: string
          id?: string
          notes?: string | null
          overnight_city?: string | null
          schedule_date: string
          sites?: Json
          technician_id: string
          total_drive_miles?: number
          total_travel_hours?: number
          total_work_hours?: number
          travel_segments?: Json
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          day_number?: number
          day_type?: string
          id?: string
          notes?: string | null
          overnight_city?: string | null
          schedule_date?: string
          sites?: Json
          technician_id?: string
          total_drive_miles?: number
          total_travel_hours?: number
          total_work_hours?: number
          travel_segments?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_schedule_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_schedule_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_technicians: {
        Row: {
          assigned_regions: Json | null
          campaign_id: string
          created_at: string
          home_base_airport: string | null
          home_base_city: string
          home_base_lat: number | null
          home_base_lng: number | null
          id: string
          technician_id: string
          updated_at: string
        }
        Insert: {
          assigned_regions?: Json | null
          campaign_id: string
          created_at?: string
          home_base_airport?: string | null
          home_base_city?: string
          home_base_lat?: number | null
          home_base_lng?: number | null
          id?: string
          technician_id: string
          updated_at?: string
        }
        Update: {
          assigned_regions?: Json | null
          campaign_id?: string
          created_at?: string
          home_base_airport?: string | null
          home_base_city?: string
          home_base_lat?: number | null
          home_base_lng?: number | null
          id?: string
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_technicians_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_technicians_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          break_hrs: number
          created_at: string
          critical_count: number | null
          customer: string
          customer_id: string | null
          data: Json | null
          deadline: string | null
          degraded_count: number | null
          end_date: string | null
          health_score: number | null
          hrs_per_charger: number
          hrs_per_day: number
          id: string
          name: string
          optimal_count: number | null
          quarter: string | null
          stage_status: Json
          start_date: string | null
          status: string | null
          total_chargers: number | null
          total_serviced: number | null
          travel_time_min: number
          updated_at: string
          user_id: string | null
          working_days: Json
          year: number | null
        }
        Insert: {
          break_hrs?: number
          created_at?: string
          critical_count?: number | null
          customer: string
          customer_id?: string | null
          data?: Json | null
          deadline?: string | null
          degraded_count?: number | null
          end_date?: string | null
          health_score?: number | null
          hrs_per_charger?: number
          hrs_per_day?: number
          id?: string
          name: string
          optimal_count?: number | null
          quarter?: string | null
          stage_status?: Json
          start_date?: string | null
          status?: string | null
          total_chargers?: number | null
          total_serviced?: number | null
          travel_time_min?: number
          updated_at?: string
          user_id?: string | null
          working_days?: Json
          year?: number | null
        }
        Update: {
          break_hrs?: number
          created_at?: string
          critical_count?: number | null
          customer?: string
          customer_id?: string | null
          data?: Json | null
          deadline?: string | null
          degraded_count?: number | null
          end_date?: string | null
          health_score?: number | null
          hrs_per_charger?: number
          hrs_per_day?: number
          id?: string
          name?: string
          optimal_count?: number | null
          quarter?: string | null
          stage_status?: Json
          start_date?: string | null
          status?: string | null
          total_chargers?: number | null
          total_serviced?: number | null
          travel_time_min?: number
          updated_at?: string
          user_id?: string | null
          working_days?: Json
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "campaigns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      charger_customer_relationships: {
        Row: {
          charger_id: string
          created_at: string
          customer_id: string
          id: string
          is_primary: boolean
          notes: string | null
          relationship_type: Database["public"]["Enums"]["charger_relationship_type"]
        }
        Insert: {
          charger_id: string
          created_at?: string
          customer_id: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          relationship_type: Database["public"]["Enums"]["charger_relationship_type"]
        }
        Update: {
          charger_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          relationship_type?: Database["public"]["Enums"]["charger_relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "charger_customer_relationships_charger_id_fkey"
            columns: ["charger_id"]
            isOneToOne: false
            referencedRelation: "charger_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charger_customer_relationships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "charger_customer_relationships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      charger_health_scores: {
        Row: {
          charger_id: string | null
          communication_score: number | null
          connector_wear_score: number | null
          cvs_score: number
          error_recurrence_index: number | null
          firmware_currency_score: number | null
          id: string
          last_calculated_at: string
          predicted_failure_days: number | null
          session_completion_rate: number | null
          thermal_stress_index: number | null
        }
        Insert: {
          charger_id?: string | null
          communication_score?: number | null
          connector_wear_score?: number | null
          cvs_score?: number
          error_recurrence_index?: number | null
          firmware_currency_score?: number | null
          id?: string
          last_calculated_at?: string
          predicted_failure_days?: number | null
          session_completion_rate?: number | null
          thermal_stress_index?: number | null
        }
        Update: {
          charger_id?: string | null
          communication_score?: number | null
          connector_wear_score?: number | null
          cvs_score?: number
          error_recurrence_index?: number | null
          firmware_currency_score?: number | null
          id?: string
          last_calculated_at?: string
          predicted_failure_days?: number | null
          session_completion_rate?: number | null
          thermal_stress_index?: number | null
        }
        Relationships: []
      }
      charger_locations: {
        Row: {
          created_at: string
          descriptor: string
          id: string
          location_id: string
        }
        Insert: {
          created_at?: string
          descriptor: string
          id?: string
          location_id: string
        }
        Update: {
          created_at?: string
          descriptor?: string
          id?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charger_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      charger_records: {
        Row: {
          address: string | null
          app_issue: boolean | null
          campaign_id: string
          cc_reader_issue: boolean | null
          ccs_cable_issue: boolean | null
          chademo_cable_issue: boolean | null
          circuit_board_issue: boolean | null
          city: string | null
          created_at: string
          holster_issue: boolean | null
          id: string
          latitude: number | null
          longitude: number | null
          max_power: number | null
          model: string | null
          other_issue: boolean | null
          power_cabinet_report_url: string | null
          power_cabinet_status: string | null
          power_cabinet_summary: string | null
          power_supply_issue: boolean | null
          report_url: string | null
          rfid_reader_issue: boolean | null
          screen_damage: boolean | null
          serial_number: string | null
          service_date: string | null
          service_required: number | null
          serviced_qty: number | null
          site_name: string | null
          start_date: string | null
          state: string | null
          station_id: string
          station_name: string | null
          status: string | null
          summary: string | null
          ticket_created_date: string | null
          ticket_group: string | null
          ticket_id: string | null
          ticket_reporting_source: string | null
          ticket_solved_date: string | null
          ticket_subject: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          app_issue?: boolean | null
          campaign_id: string
          cc_reader_issue?: boolean | null
          ccs_cable_issue?: boolean | null
          chademo_cable_issue?: boolean | null
          circuit_board_issue?: boolean | null
          city?: string | null
          created_at?: string
          holster_issue?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          max_power?: number | null
          model?: string | null
          other_issue?: boolean | null
          power_cabinet_report_url?: string | null
          power_cabinet_status?: string | null
          power_cabinet_summary?: string | null
          power_supply_issue?: boolean | null
          report_url?: string | null
          rfid_reader_issue?: boolean | null
          screen_damage?: boolean | null
          serial_number?: string | null
          service_date?: string | null
          service_required?: number | null
          serviced_qty?: number | null
          site_name?: string | null
          start_date?: string | null
          state?: string | null
          station_id: string
          station_name?: string | null
          status?: string | null
          summary?: string | null
          ticket_created_date?: string | null
          ticket_group?: string | null
          ticket_id?: string | null
          ticket_reporting_source?: string | null
          ticket_solved_date?: string | null
          ticket_subject?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          app_issue?: boolean | null
          campaign_id?: string
          cc_reader_issue?: boolean | null
          ccs_cable_issue?: boolean | null
          chademo_cable_issue?: boolean | null
          circuit_board_issue?: boolean | null
          city?: string | null
          created_at?: string
          holster_issue?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          max_power?: number | null
          model?: string | null
          other_issue?: boolean | null
          power_cabinet_report_url?: string | null
          power_cabinet_status?: string | null
          power_cabinet_summary?: string | null
          power_supply_issue?: boolean | null
          report_url?: string | null
          rfid_reader_issue?: boolean | null
          screen_damage?: boolean | null
          serial_number?: string | null
          service_date?: string | null
          service_required?: number | null
          serviced_qty?: number | null
          site_name?: string | null
          start_date?: string | null
          state?: string | null
          station_id?: string
          station_name?: string | null
          status?: string | null
          summary?: string | null
          ticket_created_date?: string | null
          ticket_group?: string | null
          ticket_id?: string | null
          ticket_reporting_source?: string | null
          ticket_solved_date?: string | null
          ticket_subject?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charger_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      charger_submissions: {
        Row: {
          brand: string
          charger_type: string
          created_at: string
          id: string
          installation_location: string | null
          known_issues: string | null
          photo_urls: string[] | null
          serial_number: string | null
          service_needed: boolean | null
          staff_notes: string | null
          status: string
          submission_id: string
        }
        Insert: {
          brand: string
          charger_type: string
          created_at?: string
          id?: string
          installation_location?: string | null
          known_issues?: string | null
          photo_urls?: string[] | null
          serial_number?: string | null
          service_needed?: boolean | null
          staff_notes?: string | null
          status?: string
          submission_id: string
        }
        Update: {
          brand?: string
          charger_type?: string
          created_at?: string
          id?: string
          installation_location?: string | null
          known_issues?: string | null
          photo_urls?: string[] | null
          serial_number?: string | null
          service_needed?: boolean | null
          staff_notes?: string | null
          status?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charger_submissions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_type: string | null
          created_at: string
          customer_id: string
          email: string
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          phone: string
          role: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          contact_type?: string | null
          created_at?: string
          customer_id: string
          email?: string
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          phone?: string
          role?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          contact_type?: string | null
          created_at?: string
          customer_id?: string
          email?: string
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          phone?: string
          role?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_rate_overrides: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          notes: string | null
          override_items: Json
          rate_card_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          notes?: string | null
          override_items?: Json
          rate_card_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          notes?: string | null
          override_items?: Json
          rate_card_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_rate_overrides_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_rate_overrides_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_rate_overrides_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_rate_sheets: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string
          description: string | null
          effective_date: string | null
          expiration_date: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name: string
          description?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          description?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_rate_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_rate_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          categories: Json
          company: string
          contact_name: string
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          customer_type_other: string | null
          deleted_at: string | null
          description: string | null
          domain: string | null
          duplicate_confirmed_distinct_of: string[] | null
          email: string
          headquarters_address: string | null
          hq_city: string | null
          hq_region: string | null
          id: string
          industry: string | null
          internal_notes: string | null
          last_service_date: string | null
          logo_url: string | null
          notes: string
          phone: string
          pricing_type: string
          relationship_type:
            | Database["public"]["Enums"]["account_relationship_type"]
            | null
          source: Database["public"]["Enums"]["account_source"] | null
          status: string
          ticket_count: number
          total_revenue: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string
          categories?: Json
          company: string
          contact_name: string
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          customer_type_other?: string | null
          deleted_at?: string | null
          description?: string | null
          domain?: string | null
          duplicate_confirmed_distinct_of?: string[] | null
          email: string
          headquarters_address?: string | null
          hq_city?: string | null
          hq_region?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          last_service_date?: string | null
          logo_url?: string | null
          notes?: string
          phone?: string
          pricing_type?: string
          relationship_type?:
            | Database["public"]["Enums"]["account_relationship_type"]
            | null
          source?: Database["public"]["Enums"]["account_source"] | null
          status?: string
          ticket_count?: number
          total_revenue?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string
          categories?: Json
          company?: string
          contact_name?: string
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          customer_type_other?: string | null
          deleted_at?: string | null
          description?: string | null
          domain?: string | null
          duplicate_confirmed_distinct_of?: string[] | null
          email?: string
          headquarters_address?: string | null
          hq_city?: string | null
          hq_region?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          last_service_date?: string | null
          logo_url?: string | null
          notes?: string
          phone?: string
          pricing_type?: string
          relationship_type?:
            | Database["public"]["Enums"]["account_relationship_type"]
            | null
          source?: Database["public"]["Enums"]["account_source"] | null
          status?: string
          ticket_count?: number
          total_revenue?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      deal_stakeholders: {
        Row: {
          created_at: string
          deal_id: string
          stakeholder_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          stakeholder_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          stakeholder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stakeholders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stakeholders_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_arr: number | null
          actual_close_date: string | null
          competitor: string | null
          connector_count: number | null
          contract_length_months: number
          created_at: string
          deal_health: string | null
          deal_name: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          description: string | null
          expected_close_date: string | null
          fit_score: number | null
          id: string
          last_activity_at: string | null
          loss_reason: string | null
          model_close_probability: number | null
          monthly_rate: number | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          one_time_description: string | null
          one_time_value: number | null
          owner: string | null
          owner_user_id: string | null
          partner_id: string
          predicted_arr: number | null
          predicted_close_date: string | null
          probability: number
          rate_per_connector: number | null
          recurring_model: Database["public"]["Enums"]["recurring_model"] | null
          stage: Database["public"]["Enums"]["deal_stage"]
          updated_at: string
          value: number
        }
        Insert: {
          actual_arr?: number | null
          actual_close_date?: string | null
          competitor?: string | null
          connector_count?: number | null
          contract_length_months?: number
          created_at?: string
          deal_health?: string | null
          deal_name: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          description?: string | null
          expected_close_date?: string | null
          fit_score?: number | null
          id?: string
          last_activity_at?: string | null
          loss_reason?: string | null
          model_close_probability?: number | null
          monthly_rate?: number | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          one_time_description?: string | null
          one_time_value?: number | null
          owner?: string | null
          owner_user_id?: string | null
          partner_id: string
          predicted_arr?: number | null
          predicted_close_date?: string | null
          probability?: number
          rate_per_connector?: number | null
          recurring_model?:
            | Database["public"]["Enums"]["recurring_model"]
            | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
          value?: number
        }
        Update: {
          actual_arr?: number | null
          actual_close_date?: string | null
          competitor?: string | null
          connector_count?: number | null
          contract_length_months?: number
          created_at?: string
          deal_health?: string | null
          deal_name?: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          description?: string | null
          expected_close_date?: string | null
          fit_score?: number | null
          id?: string
          last_activity_at?: string | null
          loss_reason?: string | null
          model_close_probability?: number | null
          monthly_rate?: number | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          one_time_description?: string | null
          one_time_value?: number | null
          owner?: string | null
          owner_user_id?: string | null
          partner_id?: string
          predicted_arr?: number | null
          predicted_close_date?: string | null
          probability?: number
          rate_per_connector?: number | null
          recurring_model?:
            | Database["public"]["Enums"]["recurring_model"]
            | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "deals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      deep_learning_uploads: {
        Row: {
          error_message: string | null
          file_size_kb: number
          file_type: string
          filename: string
          id: string
          notes: string | null
          patterns_added: number | null
          quality_score: number | null
          records_extracted: number | null
          status: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          error_message?: string | null
          file_size_kb?: number
          file_type?: string
          filename: string
          id?: string
          notes?: string | null
          patterns_added?: number | null
          quality_score?: number | null
          records_extracted?: number | null
          status?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Update: {
          error_message?: string | null
          file_size_kb?: number
          file_type?: string
          filename?: string
          id?: string
          notes?: string | null
          patterns_added?: number | null
          quality_score?: number | null
          records_extracted?: number | null
          status?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      environmental_correlations: {
        Row: {
          altitude_modifier: number | null
          coastal_corrosion_risk: number | null
          heat_vulnerability_index: number | null
          id: string
          last_updated_at: string
          last_weather_event_at: string | null
          location_id: string | null
          seasonal_drift_active: boolean | null
          storm_impact_score: number | null
          uv_exposure_index: number | null
        }
        Insert: {
          altitude_modifier?: number | null
          coastal_corrosion_risk?: number | null
          heat_vulnerability_index?: number | null
          id?: string
          last_updated_at?: string
          last_weather_event_at?: string | null
          location_id?: string | null
          seasonal_drift_active?: boolean | null
          storm_impact_score?: number | null
          uv_exposure_index?: number | null
        }
        Update: {
          altitude_modifier?: number | null
          coastal_corrosion_risk?: number | null
          heat_vulnerability_index?: number | null
          id?: string
          last_updated_at?: string
          last_weather_event_at?: string | null
          location_id?: string | null
          seasonal_drift_active?: boolean | null
          storm_impact_score?: number | null
          uv_exposure_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "environmental_correlations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          account_manager: string | null
          campaign_id: string | null
          charger_record_id: string | null
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          estimate_number: string | null
          id: string
          line_items: Json
          notes: string | null
          po_number: string | null
          sent_at: string | null
          service_date_range: string | null
          site_name: string | null
          station_id: string | null
          status: string
          subtotal: number
          tax: number
          tax_rate: number
          terms: string
          ticket_id: string | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          account_manager?: string | null
          campaign_id?: string | null
          charger_record_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          estimate_number?: string | null
          id?: string
          line_items?: Json
          notes?: string | null
          po_number?: string | null
          sent_at?: string | null
          service_date_range?: string | null
          site_name?: string | null
          station_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tax_rate?: number
          terms?: string
          ticket_id?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          account_manager?: string | null
          campaign_id?: string | null
          charger_record_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          estimate_number?: string | null
          id?: string
          line_items?: Json
          notes?: string | null
          po_number?: string | null
          sent_at?: string | null
          service_date_range?: string | null
          site_name?: string | null
          station_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tax_rate?: number
          terms?: string
          ticket_id?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_charger_record_id_fkey"
            columns: ["charger_record_id"]
            isOneToOne: false
            referencedRelation: "charger_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_history: {
        Row: {
          added_at: string
          added_by: string | null
          created_at: string
          customer_id: string | null
          focus_quarter: string
          focus_reason: string | null
          id: string
          removed_at: string | null
          removed_by: string | null
          strategy_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          created_at?: string
          customer_id?: string | null
          focus_quarter: string
          focus_reason?: string | null
          id?: string
          removed_at?: string | null
          removed_by?: string | null
          strategy_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          created_at?: string
          customer_id?: string | null
          focus_quarter?: string
          focus_reason?: string | null
          id?: string
          removed_at?: string | null
          removed_by?: string | null
          strategy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_history_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "account_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          access_notes: string | null
          address: string
          charger_count: number
          city: string
          country: string
          created_at: string
          customer_id: string
          id: string
          site_name: string
          state: string
          updated_at: string
          zip: string
        }
        Insert: {
          access_notes?: string | null
          address?: string
          charger_count?: number
          city?: string
          country?: string
          created_at?: string
          customer_id: string
          id?: string
          site_name: string
          state?: string
          updated_at?: string
          zip?: string
        }
        Update: {
          access_notes?: string | null
          address?: string
          charger_count?: number
          city?: string
          country?: string
          created_at?: string
          customer_id?: string
          id?: string
          site_name?: string
          state?: string
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "locations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      noch_plus_enterprise_inquiries: {
        Row: {
          company_name: string
          created_at: string
          email: string
          estimated_charger_count: number | null
          id: string
          message: string | null
          partner_name: string
          phone: string | null
          status: Database["public"]["Enums"]["enterprise_inquiry_status"]
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          email: string
          estimated_charger_count?: number | null
          id?: string
          message?: string | null
          partner_name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["enterprise_inquiry_status"]
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string
          estimated_charger_count?: number | null
          id?: string
          message?: string | null
          partner_name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["enterprise_inquiry_status"]
          updated_at?: string
        }
        Relationships: []
      }
      noch_plus_knowledge_base: {
        Row: {
          answer: string
          category: string
          created_at: string
          created_by: string
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      noch_plus_members: {
        Row: {
          billing_cycle: string
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          monthly_amount: number
          phone: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          company_name: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          monthly_amount?: number
          phone?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          monthly_amount?: number
          phone?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      noch_plus_partnership_plans: {
        Row: {
          activated_at: string | null
          billing_cycle: string
          company_name: string
          contact_email: string
          created_at: string
          expires_at: string
          id: string
          member_id: string | null
          plan_data: Json
          plan_token: string
          shared_at: string
          status: string
          total_annual: number
          total_monthly: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          activated_at?: string | null
          billing_cycle?: string
          company_name?: string
          contact_email?: string
          created_at?: string
          expires_at?: string
          id?: string
          member_id?: string | null
          plan_data?: Json
          plan_token?: string
          shared_at?: string
          status?: string
          total_annual?: number
          total_monthly?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          activated_at?: string | null
          billing_cycle?: string
          company_name?: string
          contact_email?: string
          created_at?: string
          expires_at?: string
          id?: string
          member_id?: string | null
          plan_data?: Json
          plan_token?: string
          shared_at?: string
          status?: string
          total_annual?: number
          total_monthly?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "noch_plus_partnership_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "noch_plus_members"
            referencedColumns: ["id"]
          },
        ]
      }
      noch_plus_sites: {
        Row: {
          created_at: string
          dc_charger_count: number
          id: string
          l2_charger_count: number
          member_id: string
          monthly_cost: number
          site_name: string
          tier: string
        }
        Insert: {
          created_at?: string
          dc_charger_count?: number
          id?: string
          l2_charger_count?: number
          member_id: string
          monthly_cost?: number
          site_name?: string
          tier?: string
        }
        Update: {
          created_at?: string
          dc_charger_count?: number
          id?: string
          l2_charger_count?: number
          member_id?: string
          monthly_cost?: number
          site_name?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "noch_plus_sites_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "noch_plus_members"
            referencedColumns: ["id"]
          },
        ]
      }
      noch_plus_sla_credits: {
        Row: {
          actual_response_hours: number
          applied_to_invoice: boolean
          created_at: string
          credit_amount: number
          credit_percentage: number
          id: string
          member_id: string
          service_call_id: string | null
          sla_target_hours: number
        }
        Insert: {
          actual_response_hours?: number
          applied_to_invoice?: boolean
          created_at?: string
          credit_amount?: number
          credit_percentage?: number
          id?: string
          member_id: string
          service_call_id?: string | null
          sla_target_hours?: number
        }
        Update: {
          actual_response_hours?: number
          applied_to_invoice?: boolean
          created_at?: string
          credit_amount?: number
          credit_percentage?: number
          id?: string
          member_id?: string
          service_call_id?: string | null
          sla_target_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "noch_plus_sla_credits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "noch_plus_members"
            referencedColumns: ["id"]
          },
        ]
      }
      noch_plus_submissions: {
        Row: {
          assessment_needs: string[] | null
          city: string
          company_id: string | null
          company_name: string
          created_at: string
          customer_notes: string | null
          email: string
          full_name: string
          id: string
          location_id: string | null
          noch_plus_member: boolean
          phone: string
          referral_source: string | null
          service_urgency: string | null
          staff_notes: string | null
          state: string
          status: string
          street_address: string
          submission_id: string
          submission_type: string
          tickets_created: boolean | null
          tickets_created_at: string | null
          updated_at: string
          zip_code: string
        }
        Insert: {
          assessment_needs?: string[] | null
          city: string
          company_id?: string | null
          company_name: string
          created_at?: string
          customer_notes?: string | null
          email: string
          full_name: string
          id?: string
          location_id?: string | null
          noch_plus_member?: boolean
          phone: string
          referral_source?: string | null
          service_urgency?: string | null
          staff_notes?: string | null
          state: string
          status?: string
          street_address: string
          submission_id: string
          submission_type?: string
          tickets_created?: boolean | null
          tickets_created_at?: string | null
          updated_at?: string
          zip_code: string
        }
        Update: {
          assessment_needs?: string[] | null
          city?: string
          company_id?: string | null
          company_name?: string
          created_at?: string
          customer_notes?: string | null
          email?: string
          full_name?: string
          id?: string
          location_id?: string | null
          noch_plus_member?: boolean
          phone?: string
          referral_source?: string | null
          service_urgency?: string | null
          staff_notes?: string | null
          state?: string
          status?: string
          street_address?: string
          submission_id?: string
          submission_type?: string
          tickets_created?: boolean | null
          tickets_created_at?: string | null
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "noch_plus_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "noch_plus_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noch_plus_submissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      ocpp_events: {
        Row: {
          charger_id: string | null
          customer_id: string | null
          error_code: string
          error_description: string
          id: string
          location_id: string | null
          max_action_taken: string | null
          max_confidence: number | null
          ocpp_status: string
          received_at: string
          resolution_type: string | null
          resolved_at: string | null
          severity: string
          ticket_id: string | null
        }
        Insert: {
          charger_id?: string | null
          customer_id?: string | null
          error_code?: string
          error_description?: string
          id?: string
          location_id?: string | null
          max_action_taken?: string | null
          max_confidence?: number | null
          ocpp_status?: string
          received_at?: string
          resolution_type?: string | null
          resolved_at?: string | null
          severity?: string
          ticket_id?: string | null
        }
        Update: {
          charger_id?: string | null
          customer_id?: string | null
          error_code?: string
          error_description?: string
          id?: string
          location_id?: string | null
          max_action_taken?: string | null
          max_confidence?: number | null
          ocpp_status?: string
          received_at?: string
          resolution_type?: string | null
          resolved_at?: string | null
          severity?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocpp_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "ocpp_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocpp_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocpp_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          category: string
          created_at: string
          id: string
          label: string
          sort_order: number
          value: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          value?: string
        }
        Relationships: []
      }
      partners_meta: {
        Row: {
          annual_run_rate: number | null
          charger_footprint_estimate: number | null
          charger_footprint_notes: string | null
          created_at: string
          expansion_thesis: string | null
          hardware_brands: Json
          id: string
          motion: Database["public"]["Enums"]["growth_motion"] | null
          network_type:
            | Database["public"]["Enums"]["growth_network_type"]
            | null
          nochplus_fit_score: number | null
          nochplus_timing:
            | Database["public"]["Enums"]["growth_nochplus_timing"]
            | null
          partner_id: string
          regions: Json
          services_not_provided: Json
          services_provided: Json
          share_of_wallet_pct: number | null
          strategic_notes: string | null
          tier: Database["public"]["Enums"]["growth_tier"] | null
          updated_at: string
          white_space_notes: string | null
        }
        Insert: {
          annual_run_rate?: number | null
          charger_footprint_estimate?: number | null
          charger_footprint_notes?: string | null
          created_at?: string
          expansion_thesis?: string | null
          hardware_brands?: Json
          id?: string
          motion?: Database["public"]["Enums"]["growth_motion"] | null
          network_type?:
            | Database["public"]["Enums"]["growth_network_type"]
            | null
          nochplus_fit_score?: number | null
          nochplus_timing?:
            | Database["public"]["Enums"]["growth_nochplus_timing"]
            | null
          partner_id: string
          regions?: Json
          services_not_provided?: Json
          services_provided?: Json
          share_of_wallet_pct?: number | null
          strategic_notes?: string | null
          tier?: Database["public"]["Enums"]["growth_tier"] | null
          updated_at?: string
          white_space_notes?: string | null
        }
        Update: {
          annual_run_rate?: number | null
          charger_footprint_estimate?: number | null
          charger_footprint_notes?: string | null
          created_at?: string
          expansion_thesis?: string | null
          hardware_brands?: Json
          id?: string
          motion?: Database["public"]["Enums"]["growth_motion"] | null
          network_type?:
            | Database["public"]["Enums"]["growth_network_type"]
            | null
          nochplus_fit_score?: number | null
          nochplus_timing?:
            | Database["public"]["Enums"]["growth_nochplus_timing"]
            | null
          partner_id?: string
          regions?: Json
          services_not_provided?: Json
          services_provided?: Json
          share_of_wallet_pct?: number | null
          strategic_notes?: string | null
          tier?: Database["public"]["Enums"]["growth_tier"] | null
          updated_at?: string
          white_space_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_meta_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "partners_meta_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          active: boolean
          category: string
          charger_type: string
          compatible_models: string[] | null
          compatible_swis: string[] | null
          created_at: string
          datasheet_url: string | null
          description: string | null
          dimensions: string | null
          id: string
          last_price_update: string | null
          last_used_date: string | null
          lead_time_days: number | null
          location_bin: string | null
          manufacturer: string
          notes: string | null
          part_name: string
          part_number: string
          photo_url: string | null
          qty_in_stock: number
          reorder_point: number
          reorder_quantity: number
          supplier: string | null
          supplier_part_number: string | null
          tags: string[] | null
          unit_cost: number
          updated_at: string
          usage_count_30d: number | null
          weight_lbs: number | null
        }
        Insert: {
          active?: boolean
          category?: string
          charger_type?: string
          compatible_models?: string[] | null
          compatible_swis?: string[] | null
          created_at?: string
          datasheet_url?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          last_price_update?: string | null
          last_used_date?: string | null
          lead_time_days?: number | null
          location_bin?: string | null
          manufacturer?: string
          notes?: string | null
          part_name: string
          part_number: string
          photo_url?: string | null
          qty_in_stock?: number
          reorder_point?: number
          reorder_quantity?: number
          supplier?: string | null
          supplier_part_number?: string | null
          tags?: string[] | null
          unit_cost?: number
          updated_at?: string
          usage_count_30d?: number | null
          weight_lbs?: number | null
        }
        Update: {
          active?: boolean
          category?: string
          charger_type?: string
          compatible_models?: string[] | null
          compatible_swis?: string[] | null
          created_at?: string
          datasheet_url?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          last_price_update?: string | null
          last_used_date?: string | null
          lead_time_days?: number | null
          location_bin?: string | null
          manufacturer?: string
          notes?: string | null
          part_name?: string
          part_number?: string
          photo_url?: string | null
          qty_in_stock?: number
          reorder_point?: number
          reorder_quantity?: number
          supplier?: string | null
          supplier_part_number?: string | null
          tags?: string[] | null
          unit_cost?: number
          updated_at?: string
          usage_count_30d?: number | null
          weight_lbs?: number | null
        }
        Relationships: []
      }
      parts_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          description: string
          id: string
          last_used_at: string | null
          manufacturer: string | null
          notes: string | null
          part_number: string | null
          unit: string | null
          unit_price: number
          updated_at: string | null
          usage_count: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          last_used_at?: string | null
          manufacturer?: string | null
          notes?: string | null
          part_number?: string | null
          unit?: string | null
          unit_price?: number
          updated_at?: string | null
          usage_count?: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          last_used_at?: string | null
          manufacturer?: string | null
          notes?: string | null
          part_number?: string | null
          unit?: string | null
          unit_price?: number
          updated_at?: string | null
          usage_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          display_name: string | null
          email: string
          focus_mode_enabled: boolean
          focus_mode_quarter: string | null
          has_completed_strategy_tour: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          focus_mode_enabled?: boolean
          focus_mode_quarter?: string | null
          has_completed_strategy_tour?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          focus_mode_enabled?: boolean
          focus_mode_quarter?: string | null
          has_completed_strategy_tour?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          actual_delivery: string | null
          created_at: string
          created_by: string | null
          expected_delivery: string | null
          id: string
          line_items: Json
          notes: string | null
          order_date: string | null
          po_number: string
          shipping: number
          status: string
          subtotal: number
          supplier: string
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          actual_delivery?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          line_items?: Json
          notes?: string | null
          order_date?: string | null
          po_number: string
          shipping?: number
          status?: string
          subtotal?: number
          supplier: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          actual_delivery?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          line_items?: Json
          notes?: string | null
          order_date?: string | null
          po_number?: string
          shipping?: number
          status?: string
          subtotal?: number
          supplier?: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      qbr_financial_data: {
        Row: {
          avg_monthly_burn: number | null
          cash_end: number | null
          cash_start: number | null
          entered_at: string | null
          entered_by: string | null
          id: string
          net_income: number | null
          notes: string | null
          qbr_id: string
          quarterly_expenses: number | null
          quarterly_revenue: number | null
          runway_months: number | null
          source: string | null
          supporting_document_path: string | null
        }
        Insert: {
          avg_monthly_burn?: number | null
          cash_end?: number | null
          cash_start?: number | null
          entered_at?: string | null
          entered_by?: string | null
          id?: string
          net_income?: number | null
          notes?: string | null
          qbr_id: string
          quarterly_expenses?: number | null
          quarterly_revenue?: number | null
          runway_months?: number | null
          source?: string | null
          supporting_document_path?: string | null
        }
        Update: {
          avg_monthly_burn?: number | null
          cash_end?: number | null
          cash_start?: number | null
          entered_at?: string | null
          entered_by?: string | null
          id?: string
          net_income?: number | null
          notes?: string | null
          qbr_id?: string
          quarterly_expenses?: number | null
          quarterly_revenue?: number | null
          runway_months?: number | null
          source?: string | null
          supporting_document_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qbr_financial_data_qbr_id_fkey"
            columns: ["qbr_id"]
            isOneToOne: true
            referencedRelation: "quarterly_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      qbr_focus_accounts: {
        Row: {
          account_name: string
          end_of_quarter_state: string | null
          id: string
          order_index: number
          qbr_id: string
          strategy_id: string | null
          what_we_achieved: string | null
          why_it_mattered: string | null
        }
        Insert: {
          account_name: string
          end_of_quarter_state?: string | null
          id?: string
          order_index?: number
          qbr_id: string
          strategy_id?: string | null
          what_we_achieved?: string | null
          why_it_mattered?: string | null
        }
        Update: {
          account_name?: string
          end_of_quarter_state?: string | null
          id?: string
          order_index?: number
          qbr_id?: string
          strategy_id?: string | null
          what_we_achieved?: string | null
          why_it_mattered?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qbr_focus_accounts_qbr_id_fkey"
            columns: ["qbr_id"]
            isOneToOne: false
            referencedRelation: "quarterly_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qbr_focus_accounts_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "account_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      qbr_sections: {
        Row: {
          content: Json
          data_source: Database["public"]["Enums"]["qbr_data_source"]
          id: string
          last_updated_by: string | null
          qbr_id: string
          section_key: string
          updated_at: string
        }
        Insert: {
          content?: Json
          data_source?: Database["public"]["Enums"]["qbr_data_source"]
          id?: string
          last_updated_by?: string | null
          qbr_id: string
          section_key: string
          updated_at?: string
        }
        Update: {
          content?: Json
          data_source?: Database["public"]["Enums"]["qbr_data_source"]
          id?: string
          last_updated_by?: string | null
          qbr_id?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qbr_sections_qbr_id_fkey"
            columns: ["qbr_id"]
            isOneToOne: false
            referencedRelation: "quarterly_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_reviews: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          created_retroactively: boolean
          end_date: string
          entry_mode: Database["public"]["Enums"]["qbr_entry_mode"]
          id: string
          quarter: Database["public"]["Enums"]["qbr_quarter"]
          source_document_path: string | null
          start_date: string
          status: Database["public"]["Enums"]["qbr_status"]
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          created_retroactively?: boolean
          end_date: string
          entry_mode?: Database["public"]["Enums"]["qbr_entry_mode"]
          id?: string
          quarter: Database["public"]["Enums"]["qbr_quarter"]
          source_document_path?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["qbr_status"]
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          created_retroactively?: boolean
          end_date?: string
          entry_mode?: Database["public"]["Enums"]["qbr_entry_mode"]
          id?: string
          quarter?: Database["public"]["Enums"]["qbr_quarter"]
          source_document_path?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["qbr_status"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      quote_rules: {
        Row: {
          action_type: string
          action_value: string
          category: string
          condition_operator: string
          condition_type: string
          condition_value: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          action_type: string
          action_value: string
          category: string
          condition_operator: string
          condition_type: string
          condition_value: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          action_type?: string
          action_value?: string
          category?: string
          condition_operator?: string
          condition_type?: string
          condition_value?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_card_items: {
        Row: {
          category: string
          created_at: string
          id: string
          label: string
          rate: number
          rate_card_id: string
          sort_order: number
          unit: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          label: string
          rate?: number
          rate_card_id: string
          sort_order?: number
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          label?: string
          rate?: number
          rate_card_id?: string
          sort_order?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_card_items_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_cards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_sheet_items: {
        Row: {
          created_at: string
          hours: number | null
          id: string
          notes: string | null
          rate_192h: number | null
          rate_24h: number | null
          rate_48h: number | null
          rate_72h: number | null
          rate_96h: number | null
          rate_sheet_id: string
          scope_code: string
          scope_name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          hours?: number | null
          id?: string
          notes?: string | null
          rate_192h?: number | null
          rate_24h?: number | null
          rate_48h?: number | null
          rate_72h?: number | null
          rate_96h?: number | null
          rate_sheet_id: string
          scope_code: string
          scope_name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          hours?: number | null
          id?: string
          notes?: string | null
          rate_192h?: number | null
          rate_24h?: number | null
          rate_48h?: number | null
          rate_72h?: number | null
          rate_96h?: number | null
          rate_sheet_id?: string
          scope_code?: string
          scope_name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_sheet_items_rate_sheet_id_fkey"
            columns: ["rate_sheet_id"]
            isOneToOne: false
            referencedRelation: "rate_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_sheet_scopes: {
        Row: {
          created_at: string
          exhibit: string
          hours_to_complete: number | null
          id: string
          price_192hr: number | null
          price_24hr: number | null
          price_48hr: number | null
          price_72hr: number | null
          price_96hr: number | null
          rate_sheet_id: string
          requires_ev_rental: boolean
          scope_code: string
          scope_name: string
          sort_order: number
          travel_note: string | null
        }
        Insert: {
          created_at?: string
          exhibit?: string
          hours_to_complete?: number | null
          id?: string
          price_192hr?: number | null
          price_24hr?: number | null
          price_48hr?: number | null
          price_72hr?: number | null
          price_96hr?: number | null
          rate_sheet_id: string
          requires_ev_rental?: boolean
          scope_code: string
          scope_name: string
          sort_order?: number
          travel_note?: string | null
        }
        Update: {
          created_at?: string
          exhibit?: string
          hours_to_complete?: number | null
          id?: string
          price_192hr?: number | null
          price_24hr?: number | null
          price_48hr?: number | null
          price_72hr?: number | null
          price_96hr?: number | null
          rate_sheet_id?: string
          requires_ev_rental?: boolean
          scope_code?: string
          scope_name?: string
          sort_order?: number
          travel_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_sheet_scopes_rate_sheet_id_fkey"
            columns: ["rate_sheet_id"]
            isOneToOne: false
            referencedRelation: "customer_rate_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_sheet_travel_fees: {
        Row: {
          created_at: string
          fee_type: string
          id: string
          label: string
          notes: string | null
          rate: number
          rate_sheet_id: string
          sort_order: number
          threshold: number | null
          unit: string
        }
        Insert: {
          created_at?: string
          fee_type: string
          id?: string
          label: string
          notes?: string | null
          rate?: number
          rate_sheet_id: string
          sort_order?: number
          threshold?: number | null
          unit?: string
        }
        Update: {
          created_at?: string
          fee_type?: string
          id?: string
          label?: string
          notes?: string | null
          rate?: number
          rate_sheet_id?: string
          sort_order?: number
          threshold?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_sheet_travel_fees_rate_sheet_id_fkey"
            columns: ["rate_sheet_id"]
            isOneToOne: false
            referencedRelation: "customer_rate_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_sheet_volume_discounts: {
        Row: {
          created_at: string
          discount_percent: number
          discount_type: string
          id: string
          max_stations: number | null
          min_stations: number
          rate_sheet_id: string
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          discount_type?: string
          id?: string
          max_stations?: number | null
          min_stations?: number
          rate_sheet_id: string
        }
        Update: {
          created_at?: string
          discount_percent?: number
          discount_type?: string
          id?: string
          max_stations?: number | null
          min_stations?: number
          rate_sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_sheet_volume_discounts_rate_sheet_id_fkey"
            columns: ["rate_sheet_id"]
            isOneToOne: false
            referencedRelation: "customer_rate_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_sheets: {
        Row: {
          created_at: string
          customer: string
          customer_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer: string
          customer_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer?: string
          customer_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rate_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_changes: {
        Row: {
          change_summary: string | null
          change_type: string
          detected_at: string
          document_id: string
          id: string
          new_hash: string | null
          previous_hash: string | null
          region_id: string
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          change_summary?: string | null
          change_type: string
          detected_at?: string
          document_id: string
          id?: string
          new_hash?: string | null
          previous_hash?: string | null
          region_id: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          change_summary?: string | null
          change_type?: string
          detected_at?: string
          document_id?: string
          id?: string
          new_hash?: string | null
          previous_hash?: string | null
          region_id?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_changes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "regulatory_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_changes_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regulatory_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_documents: {
        Row: {
          category: string
          content_summary: string | null
          effective_date: string | null
          fetched_at: string
          full_text: string | null
          id: string
          is_current: boolean
          region_id: string
          source_name: string | null
          source_url: string | null
          title: string
          version_hash: string | null
        }
        Insert: {
          category: string
          content_summary?: string | null
          effective_date?: string | null
          fetched_at?: string
          full_text?: string | null
          id?: string
          is_current?: boolean
          region_id: string
          source_name?: string | null
          source_url?: string | null
          title: string
          version_hash?: string | null
        }
        Update: {
          category?: string
          content_summary?: string | null
          effective_date?: string | null
          fetched_at?: string
          full_text?: string | null
          id?: string
          is_current?: boolean
          region_id?: string
          source_name?: string | null
          source_url?: string | null
          title?: string
          version_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_documents_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regulatory_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_regions: {
        Row: {
          city: string | null
          county: string | null
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          name: string
          next_sync_at: string | null
          region_type: string
          state_code: string
        }
        Insert: {
          city?: string | null
          county?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          name: string
          next_sync_at?: string | null
          region_type?: string
          state_code: string
        }
        Update: {
          city?: string | null
          county?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          name?: string
          next_sync_at?: string | null
          region_type?: string
          state_code?: string
        }
        Relationships: []
      }
      regulatory_sync_log: {
        Row: {
          changes_detected: number
          completed_at: string | null
          documents_added: number
          id: string
          regions_updated: number
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          changes_detected?: number
          completed_at?: string | null
          documents_added?: number
          id?: string
          regions_updated?: number
          started_at?: string
          status?: string
          sync_type?: string
        }
        Update: {
          changes_detected?: number
          completed_at?: string | null
          documents_added?: number
          id?: string
          regions_updated?: number
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      report_audit_log: {
        Row: {
          action: string
          id: string
          metadata: Json | null
          performed_at: string
          performed_by: string | null
          performed_by_name: string | null
          report_id: string
        }
        Insert: {
          action: string
          id?: string
          metadata?: Json | null
          performed_at?: string
          performed_by?: string | null
          performed_by_name?: string | null
          report_id: string
        }
        Update: {
          action?: string
          id?: string
          metadata?: Json | null
          performed_at?: string
          performed_by?: string | null
          performed_by_name?: string | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_audit_log_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "campaign_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_views: {
        Row: {
          country: string | null
          downloaded_pdf: boolean
          id: string
          last_heartbeat_at: string
          max_scroll_depth_percent: number
          report_id: string
          sections_viewed: Json
          session_duration_seconds: number
          session_id: string
          user_agent: string | null
          viewed_at: string
          viewer_email: string | null
          viewer_ip_hash: string | null
        }
        Insert: {
          country?: string | null
          downloaded_pdf?: boolean
          id?: string
          last_heartbeat_at?: string
          max_scroll_depth_percent?: number
          report_id: string
          sections_viewed?: Json
          session_duration_seconds?: number
          session_id: string
          user_agent?: string | null
          viewed_at?: string
          viewer_email?: string | null
          viewer_ip_hash?: string | null
        }
        Update: {
          country?: string | null
          downloaded_pdf?: boolean
          id?: string
          last_heartbeat_at?: string
          max_scroll_depth_percent?: number
          report_id?: string
          sections_viewed?: Json
          session_duration_seconds?: number
          session_id?: string
          user_agent?: string | null
          viewed_at?: string
          viewer_email?: string | null
          viewer_ip_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_views_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "campaign_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_briefings_log: {
        Row: {
          area_secured_confirmed: boolean
          briefing_completed_at: string
          briefing_started_at: string
          briefing_type: Database["public"]["Enums"]["briefing_type"]
          created_at: string
          duration_seconds: number
          id: string
          loto_performed: boolean
          ppe_confirmed: boolean
          sow_reviewed_confirmed: boolean
          technician_id: string
          work_order_id: string
          zero_energy_verified: boolean
        }
        Insert: {
          area_secured_confirmed?: boolean
          briefing_completed_at?: string
          briefing_started_at?: string
          briefing_type: Database["public"]["Enums"]["briefing_type"]
          created_at?: string
          duration_seconds?: number
          id?: string
          loto_performed?: boolean
          ppe_confirmed?: boolean
          sow_reviewed_confirmed?: boolean
          technician_id: string
          work_order_id: string
          zero_energy_verified?: boolean
        }
        Update: {
          area_secured_confirmed?: boolean
          briefing_completed_at?: string
          briefing_started_at?: string
          briefing_type?: Database["public"]["Enums"]["briefing_type"]
          created_at?: string
          duration_seconds?: number
          id?: string
          loto_performed?: boolean
          ppe_confirmed?: boolean
          sow_reviewed_confirmed?: boolean
          technician_id?: string
          work_order_id?: string
          zero_energy_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "safety_briefings_log_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_regions: {
        Row: {
          cities: string[] | null
          created_at: string
          description: string | null
          id: string
          name: string
          technician_ids: string[] | null
          updated_at: string
        }
        Insert: {
          cities?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          technician_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          cities?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          technician_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      service_tickets: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          assessment_data: Json | null
          assessment_status: Database["public"]["Enums"]["ticket_assessment_status"]
          charger_count: number | null
          city: string
          company_id: string | null
          company_name: string
          created_at: string
          customer_notes: string | null
          email: string
          full_name: string
          id: string
          is_parent: boolean | null
          location_id: string | null
          oem_ticket_exists: string | null
          oem_ticket_number: string | null
          parent_ticket_id: string | null
          phone: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          revert_reason: string | null
          reverted_at: string | null
          reverted_by: string | null
          sent_to_customer_at: string | null
          sent_to_customer_by: string | null
          sent_to_customer_email: string | null
          service_urgency: string | null
          source: string
          staff_notes: string | null
          state: string
          status: string
          street_address: string | null
          submission_id: string | null
          swi_match_data: Json | null
          technician_id: string | null
          ticket_id: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          assessment_data?: Json | null
          assessment_status?: Database["public"]["Enums"]["ticket_assessment_status"]
          charger_count?: number | null
          city: string
          company_id?: string | null
          company_name: string
          created_at?: string
          customer_notes?: string | null
          email: string
          full_name: string
          id?: string
          is_parent?: boolean | null
          location_id?: string | null
          oem_ticket_exists?: string | null
          oem_ticket_number?: string | null
          parent_ticket_id?: string | null
          phone: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          revert_reason?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          sent_to_customer_at?: string | null
          sent_to_customer_by?: string | null
          sent_to_customer_email?: string | null
          service_urgency?: string | null
          source?: string
          staff_notes?: string | null
          state: string
          status?: string
          street_address?: string | null
          submission_id?: string | null
          swi_match_data?: Json | null
          technician_id?: string | null
          ticket_id: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          assessment_data?: Json | null
          assessment_status?: Database["public"]["Enums"]["ticket_assessment_status"]
          charger_count?: number | null
          city?: string
          company_id?: string | null
          company_name?: string
          created_at?: string
          customer_notes?: string | null
          email?: string
          full_name?: string
          id?: string
          is_parent?: boolean | null
          location_id?: string | null
          oem_ticket_exists?: string | null
          oem_ticket_number?: string | null
          parent_ticket_id?: string | null
          phone?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          revert_reason?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          sent_to_customer_at?: string | null
          sent_to_customer_by?: string | null
          sent_to_customer_email?: string | null
          service_urgency?: string | null
          source?: string
          staff_notes?: string | null
          state?: string
          status?: string
          street_address?: string | null
          submission_id?: string | null
          swi_match_data?: Json | null
          technician_id?: string | null
          ticket_id?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "service_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      site_contacts: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string
          role: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone: string
          role?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string
          role?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "site_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_contacts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_touch_date: string | null
          name: string
          notes: string | null
          owner_user_id: string | null
          partner_id: string
          phone: string | null
          relationship_status: Database["public"]["Enums"]["relationship_status"]
          role: Database["public"]["Enums"]["stakeholder_role"]
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_touch_date?: string | null
          name: string
          notes?: string | null
          owner_user_id?: string | null
          partner_id: string
          phone?: string | null
          relationship_status?: Database["public"]["Enums"]["relationship_status"]
          role?: Database["public"]["Enums"]["stakeholder_role"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_touch_date?: string | null
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          partner_id?: string
          phone?: string | null
          relationship_status?: Database["public"]["Enums"]["relationship_status"]
          role?: Database["public"]["Enums"]["stakeholder_role"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "stakeholders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          part_id: string
          purchase_order_id: string | null
          quantity: number
          reason: string
          technician: string | null
          technician_id: string | null
          ticket_id: string | null
        }
        Insert: {
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          part_id: string
          purchase_order_id?: string | null
          quantity?: number
          reason?: string
          technician?: string | null
          technician_id?: string | null
          ticket_id?: string | null
        }
        Update: {
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          part_id?: string
          purchase_order_id?: string | null
          quantity?: number
          reason?: string
          technician?: string | null
          technician_id?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_decision_map: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["strategy_decision_role"]
          strategy_id: string
          temperature: Database["public"]["Enums"]["strategy_temperature"]
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          role: Database["public"]["Enums"]["strategy_decision_role"]
          strategy_id: string
          temperature?: Database["public"]["Enums"]["strategy_temperature"]
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["strategy_decision_role"]
          strategy_id?: string
          temperature?: Database["public"]["Enums"]["strategy_temperature"]
        }
        Relationships: [
          {
            foreignKeyName: "strategy_decision_map_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_decision_map_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "account_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_kpis: {
        Row: {
          created_at: string
          current_value: number
          deferred_reason: string | null
          id: string
          is_deferred: boolean
          is_primary: boolean
          kpi_template_origin: string | null
          name: string
          notes: string | null
          strategy_id: string
          target_date: string | null
          target_value: number | null
          unit: Database["public"]["Enums"]["strategy_kpi_unit"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          deferred_reason?: string | null
          id?: string
          is_deferred?: boolean
          is_primary?: boolean
          kpi_template_origin?: string | null
          name: string
          notes?: string | null
          strategy_id: string
          target_date?: string | null
          target_value?: number | null
          unit?: Database["public"]["Enums"]["strategy_kpi_unit"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          deferred_reason?: string | null
          id?: string
          is_deferred?: boolean
          is_primary?: boolean
          kpi_template_origin?: string | null
          name?: string
          notes?: string | null
          strategy_id?: string
          target_date?: string | null
          target_value?: number | null
          unit?: Database["public"]["Enums"]["strategy_kpi_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_kpis_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "account_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_plays: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          owner: string | null
          quarter: string | null
          status: Database["public"]["Enums"]["strategy_play_status"]
          strategy_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner?: string | null
          quarter?: string | null
          status?: Database["public"]["Enums"]["strategy_play_status"]
          strategy_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner?: string | null
          quarter?: string | null
          status?: Database["public"]["Enums"]["strategy_play_status"]
          strategy_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_plays_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "account_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_risks: {
        Row: {
          created_at: string
          id: string
          risk_text: string
          severity: Database["public"]["Enums"]["strategy_risk_severity"]
          strategy_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          risk_text: string
          severity?: Database["public"]["Enums"]["strategy_risk_severity"]
          strategy_id: string
        }
        Update: {
          created_at?: string
          id?: string
          risk_text?: string
          severity?: Database["public"]["Enums"]["strategy_risk_severity"]
          strategy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_risks_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "account_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assessment_needs: string[] | null
          city: string
          company_name: string
          created_at: string
          customer_notes: string | null
          email: string
          full_name: string
          id: string
          noch_plus_member: boolean
          phone: string
          referral_source: string | null
          service_urgency: string | null
          staff_notes: string | null
          state: string
          status: string
          street_address: string
          submission_id: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          assessment_needs?: string[] | null
          city: string
          company_name: string
          created_at?: string
          customer_notes?: string | null
          email: string
          full_name: string
          id?: string
          noch_plus_member?: boolean
          phone: string
          referral_source?: string | null
          service_urgency?: string | null
          staff_notes?: string | null
          state: string
          status?: string
          street_address: string
          submission_id: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          assessment_needs?: string[] | null
          city?: string
          company_name?: string
          created_at?: string
          customer_notes?: string | null
          email?: string
          full_name?: string
          id?: string
          noch_plus_member?: boolean
          phone?: string
          referral_source?: string | null
          service_urgency?: string | null
          staff_notes?: string | null
          state?: string
          status?: string
          street_address?: string
          submission_id?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      swi_catalog_entries: {
        Row: {
          charger_models: string[] | null
          created_at: string
          description: string | null
          estimated_time: string | null
          filename: string
          folder: string
          id: string
          issue_types: string[] | null
          oem_id: string
          priority: string[] | null
          required_parts: string[] | null
          service_categories: string[] | null
          title: string
        }
        Insert: {
          charger_models?: string[] | null
          created_at?: string
          description?: string | null
          estimated_time?: string | null
          filename: string
          folder?: string
          id?: string
          issue_types?: string[] | null
          oem_id: string
          priority?: string[] | null
          required_parts?: string[] | null
          service_categories?: string[] | null
          title: string
        }
        Update: {
          charger_models?: string[] | null
          created_at?: string
          description?: string | null
          estimated_time?: string | null
          filename?: string
          folder?: string
          id?: string
          issue_types?: string[] | null
          oem_id?: string
          priority?: string[] | null
          required_parts?: string[] | null
          service_categories?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "swi_catalog_entries_oem_id_fkey"
            columns: ["oem_id"]
            isOneToOne: false
            referencedRelation: "swi_oems"
            referencedColumns: ["id"]
          },
        ]
      }
      swi_oems: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      technician_achievements: {
        Row: {
          achievement_data: Json
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          id: string
          is_visible: boolean
          technician_id: string
          unlocked_at: string
        }
        Insert: {
          achievement_data?: Json
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          id?: string
          is_visible?: boolean
          technician_id: string
          unlocked_at?: string
        }
        Update: {
          achievement_data?: Json
          achievement_type?: Database["public"]["Enums"]["achievement_type"]
          id?: string
          is_visible?: boolean
          technician_id?: string
          unlocked_at?: string
        }
        Relationships: []
      }
      technician_performance_snapshots: {
        Row: {
          chargers_captured_today: number
          created_at: string
          efficiency_rating: number
          id: string
          jobs_completed_today: number
          jobs_on_time_today: number
          parts_swaps_today: number
          photos_uploaded_today: number
          snapshot_date: string
          technician_id: string
          total_minutes_allocated_today: number
          total_minutes_worked_today: number
        }
        Insert: {
          chargers_captured_today?: number
          created_at?: string
          efficiency_rating?: number
          id?: string
          jobs_completed_today?: number
          jobs_on_time_today?: number
          parts_swaps_today?: number
          photos_uploaded_today?: number
          snapshot_date: string
          technician_id: string
          total_minutes_allocated_today?: number
          total_minutes_worked_today?: number
        }
        Update: {
          chargers_captured_today?: number
          created_at?: string
          efficiency_rating?: number
          id?: string
          jobs_completed_today?: number
          jobs_on_time_today?: number
          parts_swaps_today?: number
          photos_uploaded_today?: number
          snapshot_date?: string
          technician_id?: string
          total_minutes_allocated_today?: number
          total_minutes_worked_today?: number
        }
        Relationships: []
      }
      technician_stats_cache: {
        Row: {
          best_efficiency_month: number
          current_month_efficiency: number
          current_month_jobs: number
          current_month_on_time: number
          current_on_time_streak: number
          efficiency_trend: number
          fastest_job_minutes: number | null
          last_30_days_efficiency: number
          lifetime_efficiency_rating: number
          longest_on_time_streak: number
          mastery_score: number
          most_chargers_one_day: number
          most_photos_one_job: number
          noch_pro_score: number
          previous_30_days_efficiency: number
          previous_noch_pro_score: number
          quality_score: number
          reliability_score: number
          technician_id: string
          total_chargers_captured: number
          total_jobs_completed: number
          total_minutes_worked: number
          total_parts_swaps: number
          total_photos_uploaded: number
          updated_at: string
        }
        Insert: {
          best_efficiency_month?: number
          current_month_efficiency?: number
          current_month_jobs?: number
          current_month_on_time?: number
          current_on_time_streak?: number
          efficiency_trend?: number
          fastest_job_minutes?: number | null
          last_30_days_efficiency?: number
          lifetime_efficiency_rating?: number
          longest_on_time_streak?: number
          mastery_score?: number
          most_chargers_one_day?: number
          most_photos_one_job?: number
          noch_pro_score?: number
          previous_30_days_efficiency?: number
          previous_noch_pro_score?: number
          quality_score?: number
          reliability_score?: number
          technician_id: string
          total_chargers_captured?: number
          total_jobs_completed?: number
          total_minutes_worked?: number
          total_parts_swaps?: number
          total_photos_uploaded?: number
          updated_at?: string
        }
        Update: {
          best_efficiency_month?: number
          current_month_efficiency?: number
          current_month_jobs?: number
          current_month_on_time?: number
          current_on_time_streak?: number
          efficiency_trend?: number
          fastest_job_minutes?: number | null
          last_30_days_efficiency?: number
          lifetime_efficiency_rating?: number
          longest_on_time_streak?: number
          mastery_score?: number
          most_chargers_one_day?: number
          most_photos_one_job?: number
          noch_pro_score?: number
          previous_30_days_efficiency?: number
          previous_noch_pro_score?: number
          quality_score?: number
          reliability_score?: number
          technician_id?: string
          total_chargers_captured?: number
          total_jobs_completed?: number
          total_minutes_worked?: number
          total_parts_swaps?: number
          total_photos_uploaded?: number
          updated_at?: string
        }
        Relationships: []
      }
      technicians: {
        Row: {
          active: boolean
          active_jobs_count: number
          charger_types: string[] | null
          company_name: string | null
          contract_terms: string | null
          coverage_radius_miles: number
          created_at: string
          email: string
          employee_type: string
          first_name: string
          home_base_city: string
          home_base_lat: number | null
          home_base_lng: number | null
          home_base_state: string
          hourly_rate: number
          hours_logged_30d: number
          id: string
          insurance_expiration: string | null
          jobs_completed_30d: number
          last_name: string
          level: string
          max_jobs_per_day: number
          payment_terms: string | null
          phone: string
          photo_url: string | null
          preferred_contact: string
          revenue_generated_30d: number
          service_regions: string[] | null
          status: string
          travel_rate: number
          updated_at: string
          work_schedule: Json
        }
        Insert: {
          active?: boolean
          active_jobs_count?: number
          charger_types?: string[] | null
          company_name?: string | null
          contract_terms?: string | null
          coverage_radius_miles?: number
          created_at?: string
          email: string
          employee_type?: string
          first_name: string
          home_base_city?: string
          home_base_lat?: number | null
          home_base_lng?: number | null
          home_base_state?: string
          hourly_rate?: number
          hours_logged_30d?: number
          id?: string
          insurance_expiration?: string | null
          jobs_completed_30d?: number
          last_name: string
          level?: string
          max_jobs_per_day?: number
          payment_terms?: string | null
          phone?: string
          photo_url?: string | null
          preferred_contact?: string
          revenue_generated_30d?: number
          service_regions?: string[] | null
          status?: string
          travel_rate?: number
          updated_at?: string
          work_schedule?: Json
        }
        Update: {
          active?: boolean
          active_jobs_count?: number
          charger_types?: string[] | null
          company_name?: string | null
          contract_terms?: string | null
          coverage_radius_miles?: number
          created_at?: string
          email?: string
          employee_type?: string
          first_name?: string
          home_base_city?: string
          home_base_lat?: number | null
          home_base_lng?: number | null
          home_base_state?: string
          hourly_rate?: number
          hours_logged_30d?: number
          id?: string
          insurance_expiration?: string | null
          jobs_completed_30d?: number
          last_name?: string
          level?: string
          max_jobs_per_day?: number
          payment_terms?: string | null
          phone?: string
          photo_url?: string | null
          preferred_contact?: string
          revenue_generated_30d?: number
          service_regions?: string[] | null
          status?: string
          travel_rate?: number
          updated_at?: string
          work_schedule?: Json
        }
        Relationships: []
      }
      ticket_audit_log: {
        Row: {
          action: string
          id: string
          metadata: Json | null
          notes: string | null
          performed_at: string
          performed_by: string | null
          performed_by_name: string | null
          ticket_id: string
        }
        Insert: {
          action: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          performed_by_name?: string | null
          ticket_id: string
        }
        Update: {
          action?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          performed_by_name?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_audit_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_chargers: {
        Row: {
          brand: string
          charger_type: string
          created_at: string
          id: string
          installation_location: string | null
          is_working: string | null
          known_issues: string | null
          location_descriptor: string | null
          photo_urls: string[] | null
          serial_number: string | null
          ticket_id: string
          under_warranty: string | null
        }
        Insert: {
          brand: string
          charger_type: string
          created_at?: string
          id?: string
          installation_location?: string | null
          is_working?: string | null
          known_issues?: string | null
          location_descriptor?: string | null
          photo_urls?: string[] | null
          serial_number?: string | null
          ticket_id: string
          under_warranty?: string | null
        }
        Update: {
          brand?: string
          charger_type?: string
          created_at?: string
          id?: string
          installation_location?: string | null
          is_working?: string | null
          known_issues?: string | null
          location_descriptor?: string | null
          photo_urls?: string[] | null
          serial_number?: string | null
          ticket_id?: string
          under_warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_chargers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_invoices: {
        Row: {
          bill_to: Json | null
          confidence_score: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          line_items: Json | null
          notes: string | null
          pdf_path: string | null
          source: string
          source_label: string | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          ticket_db_id: string | null
          ticket_text_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          bill_to?: Json | null
          confidence_score?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          line_items?: Json | null
          notes?: string | null
          pdf_path?: string | null
          source: string
          source_label?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          ticket_db_id?: string | null
          ticket_text_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          bill_to?: Json | null
          confidence_score?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          line_items?: Json | null
          notes?: string | null
          pdf_path?: string | null
          source?: string
          source_label?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          ticket_db_id?: string | null
          ticket_text_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_regulatory_context: {
        Row: {
          applicable_docs: string[] | null
          available_incentives: string | null
          compliance_flags: string[] | null
          context_injected_at: string
          id: string
          licensing_requirement: string | null
          max_prompt_version: string | null
          permit_authority: string | null
          region_id: string
          requires_licensed_contractor: boolean | null
          requires_permit: boolean | null
          ticket_id: string
        }
        Insert: {
          applicable_docs?: string[] | null
          available_incentives?: string | null
          compliance_flags?: string[] | null
          context_injected_at?: string
          id?: string
          licensing_requirement?: string | null
          max_prompt_version?: string | null
          permit_authority?: string | null
          region_id: string
          requires_licensed_contractor?: boolean | null
          requires_permit?: boolean | null
          ticket_id: string
        }
        Update: {
          applicable_docs?: string[] | null
          available_incentives?: string | null
          compliance_flags?: string[] | null
          context_injected_at?: string
          id?: string
          licensing_requirement?: string | null
          max_prompt_version?: string | null
          permit_authority?: string | null
          region_id?: string
          requires_licensed_contractor?: boolean | null
          requires_permit?: boolean | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_regulatory_context_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regulatory_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_regulatory_context_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action_name: string | null
          created_at: string
          duration_seconds: number | null
          event_type: string
          id: string
          metadata: Json | null
          page_path: string | null
          page_title: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          action_name?: string | null
          created_at?: string
          duration_seconds?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          page_title?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          action_name?: string | null
          created_at?: string
          duration_seconds?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          page_title?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_section_access: {
        Row: {
          created_at: string
          granted_by: string | null
          has_access: boolean
          id: string
          section_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          has_access?: boolean
          id?: string
          section_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          has_access?: boolean
          id?: string
          section_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_review_notes: {
        Row: {
          action_status:
            | Database["public"]["Enums"]["weekly_review_action_status"]
            | null
          author: string
          author_user_id: string | null
          created_at: string
          due_date: string | null
          edited_at: string | null
          id: string
          is_pre_meeting: boolean
          linked_to_id: string | null
          linked_to_type: Database["public"]["Enums"]["weekly_review_link_type"]
          locked: boolean
          note_text: string
          note_type: Database["public"]["Enums"]["weekly_review_note_type"]
          owner: string | null
          weekly_review_id: string
        }
        Insert: {
          action_status?:
            | Database["public"]["Enums"]["weekly_review_action_status"]
            | null
          author: string
          author_user_id?: string | null
          created_at?: string
          due_date?: string | null
          edited_at?: string | null
          id?: string
          is_pre_meeting?: boolean
          linked_to_id?: string | null
          linked_to_type?: Database["public"]["Enums"]["weekly_review_link_type"]
          locked?: boolean
          note_text: string
          note_type: Database["public"]["Enums"]["weekly_review_note_type"]
          owner?: string | null
          weekly_review_id: string
        }
        Update: {
          action_status?:
            | Database["public"]["Enums"]["weekly_review_action_status"]
            | null
          author?: string
          author_user_id?: string | null
          created_at?: string
          due_date?: string | null
          edited_at?: string | null
          id?: string
          is_pre_meeting?: boolean
          linked_to_id?: string | null
          linked_to_type?: Database["public"]["Enums"]["weekly_review_link_type"]
          locked?: boolean
          note_text?: string
          note_type?: Database["public"]["Enums"]["weekly_review_note_type"]
          owner?: string | null
          weekly_review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_review_notes_weekly_review_id_fkey"
            columns: ["weekly_review_id"]
            isOneToOne: false
            referencedRelation: "weekly_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          skip_reason:
            | Database["public"]["Enums"]["weekly_review_skip_reason"]
            | null
          skip_reason_notes: string | null
          skipped_at: string | null
          skipped_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["weekly_review_status"]
          summary: string | null
          updated_at: string
          week_number: number
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          skip_reason?:
            | Database["public"]["Enums"]["weekly_review_skip_reason"]
            | null
          skip_reason_notes?: string | null
          skipped_at?: string | null
          skipped_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["weekly_review_status"]
          summary?: string | null
          updated_at?: string
          week_number: number
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          skip_reason?:
            | Database["public"]["Enums"]["weekly_review_skip_reason"]
            | null
          skip_reason_notes?: string | null
          skipped_at?: string | null
          skipped_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["weekly_review_status"]
          summary?: string | null
          updated_at?: string
          week_number?: number
          year?: number
        }
        Relationships: []
      }
      work_description_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_fallback: boolean
          issue_category:
            | Database["public"]["Enums"]["charger_issue_category"]
            | null
          priority: number
          root_cause: Database["public"]["Enums"]["charger_root_cause"] | null
          template_text: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_fallback?: boolean
          issue_category?:
            | Database["public"]["Enums"]["charger_issue_category"]
            | null
          priority?: number
          root_cause?: Database["public"]["Enums"]["charger_root_cause"] | null
          template_text: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_fallback?: boolean
          issue_category?:
            | Database["public"]["Enums"]["charger_issue_category"]
            | null
          priority?: number
          root_cause?: Database["public"]["Enums"]["charger_root_cause"] | null
          template_text?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      work_order_activity: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          details: Json
          id: string
          work_order_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          details?: Json
          id?: string
          work_order_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          details?: Json
          id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_activity_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_chargers: {
        Row: {
          added_on_site: boolean
          capture_completed_at: string | null
          capture_started_at: string | null
          charger_position: number
          charger_status_post_work:
            | Database["public"]["Enums"]["charger_post_work_status"]
            | null
          created_at: string
          current_step: number
          id: string
          is_recurring_issue: boolean
          issue_category:
            | Database["public"]["Enums"]["charger_issue_category"]
            | null
          issue_description: string | null
          make_model: string | null
          new_serial_number: string | null
          old_serial_number: string | null
          parts_swap_performed: boolean
          reported_description: string | null
          reported_issue_category:
            | Database["public"]["Enums"]["charger_issue_category"]
            | null
          reported_recurring: boolean
          reported_root_cause:
            | Database["public"]["Enums"]["charger_root_cause"]
            | null
          resolution: string | null
          root_cause: Database["public"]["Enums"]["charger_root_cause"] | null
          serial_number: string | null
          status: Database["public"]["Enums"]["charger_capture_status"]
          updated_at: string
          work_order_id: string
          work_performed: string | null
        }
        Insert: {
          added_on_site?: boolean
          capture_completed_at?: string | null
          capture_started_at?: string | null
          charger_position?: number
          charger_status_post_work?:
            | Database["public"]["Enums"]["charger_post_work_status"]
            | null
          created_at?: string
          current_step?: number
          id?: string
          is_recurring_issue?: boolean
          issue_category?:
            | Database["public"]["Enums"]["charger_issue_category"]
            | null
          issue_description?: string | null
          make_model?: string | null
          new_serial_number?: string | null
          old_serial_number?: string | null
          parts_swap_performed?: boolean
          reported_description?: string | null
          reported_issue_category?:
            | Database["public"]["Enums"]["charger_issue_category"]
            | null
          reported_recurring?: boolean
          reported_root_cause?:
            | Database["public"]["Enums"]["charger_root_cause"]
            | null
          resolution?: string | null
          root_cause?: Database["public"]["Enums"]["charger_root_cause"] | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["charger_capture_status"]
          updated_at?: string
          work_order_id: string
          work_performed?: string | null
        }
        Update: {
          added_on_site?: boolean
          capture_completed_at?: string | null
          capture_started_at?: string | null
          charger_position?: number
          charger_status_post_work?:
            | Database["public"]["Enums"]["charger_post_work_status"]
            | null
          created_at?: string
          current_step?: number
          id?: string
          is_recurring_issue?: boolean
          issue_category?:
            | Database["public"]["Enums"]["charger_issue_category"]
            | null
          issue_description?: string | null
          make_model?: string | null
          new_serial_number?: string | null
          old_serial_number?: string | null
          parts_swap_performed?: boolean
          reported_description?: string | null
          reported_issue_category?:
            | Database["public"]["Enums"]["charger_issue_category"]
            | null
          reported_recurring?: boolean
          reported_root_cause?:
            | Database["public"]["Enums"]["charger_root_cause"]
            | null
          resolution?: string | null
          root_cause?: Database["public"]["Enums"]["charger_root_cause"] | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["charger_capture_status"]
          updated_at?: string
          work_order_id?: string
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_chargers_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_photos: {
        Row: {
          charger_id: string | null
          file_size_bytes: number | null
          id: string
          photo_type: Database["public"]["Enums"]["field_photo_type"]
          photo_url: string
          storage_path: string | null
          uploaded_at: string
          uploaded_by: string | null
          work_order_id: string
        }
        Insert: {
          charger_id?: string | null
          file_size_bytes?: number | null
          id?: string
          photo_type: Database["public"]["Enums"]["field_photo_type"]
          photo_url: string
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          work_order_id: string
        }
        Update: {
          charger_id?: string | null
          file_size_bytes?: number | null
          id?: string
          photo_type?: Database["public"]["Enums"]["field_photo_type"]
          photo_url?: string
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_photos_charger_id_fkey"
            columns: ["charger_id"]
            isOneToOne: false
            referencedRelation: "work_order_chargers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_photos_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          access_time_minutes: number | null
          archived_at: string | null
          archived_by: string | null
          arrival_timestamp: string | null
          assigned_technician_id: string
          client_name: string
          created_at: string
          created_by: string | null
          departure_timestamp: string | null
          gps_location: string | null
          id: string
          is_archived: boolean
          job_notes: string | null
          job_type: Database["public"]["Enums"]["work_order_job_type"]
          partner_id: string | null
          poc_email: string | null
          poc_id: string | null
          poc_name: string | null
          poc_phone: string | null
          scheduled_date: string
          site_address: string
          site_id: string | null
          site_name: string
          sow_document_name: string | null
          sow_document_url: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          support_time_minutes: number | null
          updated_at: string
          work_order_number: string | null
        }
        Insert: {
          access_time_minutes?: number | null
          archived_at?: string | null
          archived_by?: string | null
          arrival_timestamp?: string | null
          assigned_technician_id: string
          client_name: string
          created_at?: string
          created_by?: string | null
          departure_timestamp?: string | null
          gps_location?: string | null
          id?: string
          is_archived?: boolean
          job_notes?: string | null
          job_type?: Database["public"]["Enums"]["work_order_job_type"]
          partner_id?: string | null
          poc_email?: string | null
          poc_id?: string | null
          poc_name?: string | null
          poc_phone?: string | null
          scheduled_date?: string
          site_address: string
          site_id?: string | null
          site_name: string
          sow_document_name?: string | null
          sow_document_url?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          support_time_minutes?: number | null
          updated_at?: string
          work_order_number?: string | null
        }
        Update: {
          access_time_minutes?: number | null
          archived_at?: string | null
          archived_by?: string | null
          arrival_timestamp?: string | null
          assigned_technician_id?: string
          client_name?: string
          created_at?: string
          created_by?: string | null
          departure_timestamp?: string | null
          gps_location?: string | null
          id?: string
          is_archived?: boolean
          job_notes?: string | null
          job_type?: Database["public"]["Enums"]["work_order_job_type"]
          partner_id?: string | null
          poc_email?: string | null
          poc_id?: string | null
          poc_name?: string | null
          poc_phone?: string | null
          scheduled_date?: string
          site_address?: string
          site_id?: string | null
          site_name?: string
          sow_document_name?: string | null
          sow_document_url?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          support_time_minutes?: number | null
          updated_at?: string
          work_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "account_ops_snapshot"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "work_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_poc_id_fkey"
            columns: ["poc_id"]
            isOneToOne: false
            referencedRelation: "site_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_ops_snapshot: {
        Row: {
          charger_count: number | null
          customer_id: string | null
          estimated_monthly_savings: number | null
          incidents_30d: number | null
          relationship_count: number | null
          relationship_types: string[] | null
          sites_count: number | null
          truck_rolls_30d: number | null
          uptime_pct: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_and_run_assessment: {
        Args: {
          _assessment_data: Json
          _notes?: string
          _performer_name?: string
          _swi_match_data: Json
          _ticket_id: string
        }
        Returns: {
          assessed_at: string | null
          assessed_by: string | null
          assessment_data: Json | null
          assessment_status: Database["public"]["Enums"]["ticket_assessment_status"]
          charger_count: number | null
          city: string
          company_id: string | null
          company_name: string
          created_at: string
          customer_notes: string | null
          email: string
          full_name: string
          id: string
          is_parent: boolean | null
          location_id: string | null
          oem_ticket_exists: string | null
          oem_ticket_number: string | null
          parent_ticket_id: string | null
          phone: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          revert_reason: string | null
          reverted_at: string | null
          reverted_by: string | null
          sent_to_customer_at: string | null
          sent_to_customer_by: string | null
          sent_to_customer_email: string | null
          service_urgency: string | null
          source: string
          staff_notes: string | null
          state: string
          status: string
          street_address: string | null
          submission_id: string | null
          swi_match_data: Json | null
          technician_id: string | null
          ticket_id: string
          updated_at: string
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auto_advance_weekly_review_statuses: { Args: never; Returns: undefined }
      close_weekly_review: {
        Args: { _closed_by?: string; _id: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          skip_reason:
            | Database["public"]["Enums"]["weekly_review_skip_reason"]
            | null
          skip_reason_notes: string | null
          skipped_at: string | null
          skipped_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["weekly_review_status"]
          summary: string | null
          updated_at: string
          week_number: number
          year: number
        }
        SetofOptions: {
          from: "*"
          to: "weekly_reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_current_weekly_review: {
        Args: never
        Returns: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          skip_reason:
            | Database["public"]["Enums"]["weekly_review_skip_reason"]
            | null
          skip_reason_notes: string | null
          skipped_at: string | null
          skipped_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["weekly_review_status"]
          summary: string | null
          updated_at: string
          week_number: number
          year: number
        }
        SetofOptions: {
          from: "*"
          to: "weekly_reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_section_access: {
        Args: { _section_key: string; _user_id: string }
        Returns: boolean
      }
      is_field_capture_admin: { Args: { _user_id: string }; Returns: boolean }
      is_technician: { Args: { _user_id: string }; Returns: boolean }
      is_ticket_overrider: { Args: { _user_id: string }; Returns: boolean }
      mark_assessment_sent: {
        Args: { _email: string; _performer_name?: string; _ticket_id: string }
        Returns: {
          assessed_at: string | null
          assessed_by: string | null
          assessment_data: Json | null
          assessment_status: Database["public"]["Enums"]["ticket_assessment_status"]
          charger_count: number | null
          city: string
          company_id: string | null
          company_name: string
          created_at: string
          customer_notes: string | null
          email: string
          full_name: string
          id: string
          is_parent: boolean | null
          location_id: string | null
          oem_ticket_exists: string | null
          oem_ticket_number: string | null
          parent_ticket_id: string | null
          phone: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          revert_reason: string | null
          reverted_at: string | null
          reverted_by: string | null
          sent_to_customer_at: string | null
          sent_to_customer_by: string | null
          sent_to_customer_email: string | null
          service_urgency: string | null
          source: string
          staff_notes: string | null
          state: string
          status: string
          street_address: string | null
          submission_id: string | null
          swi_match_data: Json | null
          technician_id: string | null
          ticket_id: string
          updated_at: string
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_ticket: {
        Args: { _performer_name?: string; _reason: string; _ticket_id: string }
        Returns: {
          assessed_at: string | null
          assessed_by: string | null
          assessment_data: Json | null
          assessment_status: Database["public"]["Enums"]["ticket_assessment_status"]
          charger_count: number | null
          city: string
          company_id: string | null
          company_name: string
          created_at: string
          customer_notes: string | null
          email: string
          full_name: string
          id: string
          is_parent: boolean | null
          location_id: string | null
          oem_ticket_exists: string | null
          oem_ticket_number: string | null
          parent_ticket_id: string | null
          phone: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          revert_reason: string | null
          reverted_at: string | null
          reverted_by: string | null
          sent_to_customer_at: string | null
          sent_to_customer_by: string | null
          sent_to_customer_email: string | null
          service_urgency: string | null
          source: string
          staff_notes: string | null
          state: string
          status: string
          street_address: string | null
          submission_id: string | null
          swi_match_data: Json | null
          technician_id: string | null
          ticket_id: string
          updated_at: string
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rerun_assessment: {
        Args: {
          _assessment_data: Json
          _performer_name?: string
          _swi_match_data: Json
          _ticket_id: string
        }
        Returns: {
          assessed_at: string | null
          assessed_by: string | null
          assessment_data: Json | null
          assessment_status: Database["public"]["Enums"]["ticket_assessment_status"]
          charger_count: number | null
          city: string
          company_id: string | null
          company_name: string
          created_at: string
          customer_notes: string | null
          email: string
          full_name: string
          id: string
          is_parent: boolean | null
          location_id: string | null
          oem_ticket_exists: string | null
          oem_ticket_number: string | null
          parent_ticket_id: string | null
          phone: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          revert_reason: string | null
          reverted_at: string | null
          reverted_by: string | null
          sent_to_customer_at: string | null
          sent_to_customer_by: string | null
          sent_to_customer_email: string | null
          service_urgency: string | null
          source: string
          staff_notes: string | null
          state: string
          status: string
          street_address: string | null
          submission_id: string | null
          swi_match_data: Json | null
          technician_id: string | null
          ticket_id: string
          updated_at: string
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resend_assessment: {
        Args: {
          _email: string
          _note: string
          _performer_name?: string
          _ticket_id: string
        }
        Returns: {
          assessed_at: string | null
          assessed_by: string | null
          assessment_data: Json | null
          assessment_status: Database["public"]["Enums"]["ticket_assessment_status"]
          charger_count: number | null
          city: string
          company_id: string | null
          company_name: string
          created_at: string
          customer_notes: string | null
          email: string
          full_name: string
          id: string
          is_parent: boolean | null
          location_id: string | null
          oem_ticket_exists: string | null
          oem_ticket_number: string | null
          parent_ticket_id: string | null
          phone: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          revert_reason: string | null
          reverted_at: string | null
          reverted_by: string | null
          sent_to_customer_at: string | null
          sent_to_customer_by: string | null
          sent_to_customer_email: string | null
          service_urgency: string | null
          source: string
          staff_notes: string | null
          state: string
          status: string
          street_address: string | null
          submission_id: string | null
          swi_match_data: Json | null
          technician_id: string | null
          ticket_id: string
          updated_at: string
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revert_rejection: {
        Args: {
          _performer_name?: string
          _revert_reason: string
          _ticket_id: string
        }
        Returns: {
          assessed_at: string | null
          assessed_by: string | null
          assessment_data: Json | null
          assessment_status: Database["public"]["Enums"]["ticket_assessment_status"]
          charger_count: number | null
          city: string
          company_id: string | null
          company_name: string
          created_at: string
          customer_notes: string | null
          email: string
          full_name: string
          id: string
          is_parent: boolean | null
          location_id: string | null
          oem_ticket_exists: string | null
          oem_ticket_number: string | null
          parent_ticket_id: string | null
          phone: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          revert_reason: string | null
          reverted_at: string | null
          reverted_by: string | null
          sent_to_customer_at: string | null
          sent_to_customer_by: string | null
          sent_to_customer_email: string | null
          service_urgency: string | null
          source: string
          staff_notes: string | null
          state: string
          status: string
          street_address: string | null
          submission_id: string | null
          swi_match_data: Json | null
          technician_id: string | null
          ticket_id: string
          updated_at: string
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      skip_weekly_review: {
        Args: {
          _id: string
          _notes?: string
          _reason: Database["public"]["Enums"]["weekly_review_skip_reason"]
          _skipped_by?: string
        }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          skip_reason:
            | Database["public"]["Enums"]["weekly_review_skip_reason"]
            | null
          skip_reason_notes: string | null
          skipped_at: string | null
          skipped_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["weekly_review_status"]
          summary: string | null
          updated_at: string
          week_number: number
          year: number
        }
        SetofOptions: {
          from: "*"
          to: "weekly_reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_relationship_type: "partner" | "customer" | "prospect" | "both"
      account_source:
        | "inbound"
        | "outbound"
        | "referral"
        | "conference"
        | "investor_network"
        | "other"
      achievement_type:
        | "first_job"
        | "ten_jobs"
        | "fifty_jobs"
        | "century_club"
        | "five_hundred"
        | "first_charger"
        | "ten_chargers"
        | "fifty_chargers"
        | "charger_variety"
        | "charger_master"
        | "photo_documentarian"
        | "photo_master"
        | "photo_legend"
        | "first_swap"
        | "swap_specialist"
        | "swap_master"
        | "week_of_excellence"
        | "month_of_excellence"
        | "speed_demon"
        | "under_budget"
        | "thorough_documenter"
        | "detailed_writer"
        | "early_adopter"
        | "perfect_month"
        | "versatility"
      activity_type:
        | "Call"
        | "Email"
        | "Meeting"
        | "LinkedIn"
        | "InPerson"
        | "Other"
      app_role:
        | "super_admin"
        | "admin"
        | "employee"
        | "customer"
        | "manager"
        | "partner"
        | "technician"
        | "account_manager"
        | "billing"
      briefing_type: "full_briefing" | "condensed_briefing"
      campaign_report_status: "active" | "revoked" | "expired"
      charger_capture_status: "not_started" | "in_progress" | "complete"
      charger_issue_category:
        | "power_issue"
        | "screen_display"
        | "connector"
        | "payment_processing"
        | "network_connectivity"
        | "physical_damage"
        | "other"
      charger_post_work_status:
        | "operational"
        | "partially_functional"
        | "non_operational_followup"
        | "requires_parts_ordered"
      charger_relationship_type:
        | "owner"
        | "cpo"
        | "cms"
        | "oem"
        | "service_partner"
      charger_root_cause:
        | "hardware_fault"
        | "firmware"
        | "network"
        | "power_supply"
        | "physical_damage"
        | "wear"
        | "unknown"
      customer_type:
        | "cpo"
        | "cms"
        | "oem"
        | "site_host"
        | "fleet_operator"
        | "other"
      deal_stage:
        | "Account Mapped"
        | "Relationship Warmed"
        | "Expansion Opportunity Identified"
        | "Proposal Out"
        | "NOCH+ Introduced"
        | "Pilot / Contract Signed"
        | "Expanded & Recurring"
        | "In Negotiation"
        | "Closed Won"
        | "Closed Lost"
        | "Engaged"
        | "Qualified"
      deal_type: "recurring" | "one_time" | "hybrid"
      enterprise_inquiry_status: "new" | "contacted" | "qualified" | "closed"
      field_photo_type:
        | "before"
        | "during"
        | "after"
        | "old_serial"
        | "new_serial"
        | "return_receipt"
        | "loto_verification"
      growth_motion:
        | "Volume"
        | "Strategic"
        | "Government"
        | "OEM"
        | "New_Logo"
        | "Maintain"
      growth_network_type:
        | "CPO"
        | "CMS"
        | "OEM"
        | "Government"
        | "Fleet"
        | "Utility"
        | "Other"
      growth_nochplus_timing:
        | "Live"
        | "0-3 months"
        | "3-6 months"
        | "6-12 months"
        | "12+ months"
        | "Never"
      growth_tier: "A" | "B" | "C"
      qbr_data_source: "auto" | "document" | "manual" | "quickbooks"
      qbr_entry_mode: "auto" | "document_upload" | "manual" | "hybrid"
      qbr_quarter: "Q1" | "Q2" | "Q3" | "Q4"
      qbr_status: "in_progress" | "prep_open" | "active" | "closed"
      recurring_model: "per_connector" | "flat_monthly"
      relationship_status: "Cold" | "Warm" | "Hot" | "Champion"
      stakeholder_role:
        | "Decision Maker"
        | "Influencer"
        | "Champion"
        | "Blocker"
        | "Operational"
        | "Unknown"
      strategy_account_type:
        | "revenue"
        | "strategic_partner"
        | "reference"
        | "beachhead"
        | "defensive"
      strategy_decision_role:
        | "champion"
        | "decision_maker"
        | "blocker"
        | "influencer"
      strategy_kpi_unit:
        | "dollar"
        | "percent"
        | "count"
        | "yes_no"
        | "multiplier"
        | "days"
        | "months"
        | "custom"
      strategy_play_status:
        | "not_started"
        | "in_progress"
        | "complete"
        | "abandoned"
      strategy_position:
        | "pre_engagement"
        | "active_dialogue"
        | "pilot"
        | "contracted"
        | "at_risk"
        | "champion"
      strategy_risk_severity: "watch" | "risk" | "critical"
      strategy_status: "needs_review" | "active" | "archived"
      strategy_temperature: "cold" | "warm" | "hot"
      ticket_assessment_status: "pending_review" | "assessed" | "rejected"
      weekly_review_action_status: "open" | "complete" | "abandoned"
      weekly_review_link_type: "deal" | "strategy" | "account" | "none"
      weekly_review_note_type:
        | "update"
        | "decision"
        | "action_item"
        | "risk"
        | "need"
      weekly_review_skip_reason:
        | "holiday"
        | "trade_show"
        | "team_travel"
        | "sprint_week"
        | "other"
      weekly_review_status:
        | "pre_meeting"
        | "open"
        | "closed"
        | "skipped"
        | "missed"
        | "pending_close"
      work_order_job_type:
        | "repair"
        | "troubleshooting"
        | "installation"
        | "maintenance"
        | "commissioning"
        | "decommissioning"
      work_order_status:
        | "scheduled"
        | "in_progress"
        | "submitted"
        | "pending_review"
        | "flagged"
        | "approved"
        | "closed"
        | "cancelled"
        | "archived"
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
    Enums: {
      account_relationship_type: ["partner", "customer", "prospect", "both"],
      account_source: [
        "inbound",
        "outbound",
        "referral",
        "conference",
        "investor_network",
        "other",
      ],
      achievement_type: [
        "first_job",
        "ten_jobs",
        "fifty_jobs",
        "century_club",
        "five_hundred",
        "first_charger",
        "ten_chargers",
        "fifty_chargers",
        "charger_variety",
        "charger_master",
        "photo_documentarian",
        "photo_master",
        "photo_legend",
        "first_swap",
        "swap_specialist",
        "swap_master",
        "week_of_excellence",
        "month_of_excellence",
        "speed_demon",
        "under_budget",
        "thorough_documenter",
        "detailed_writer",
        "early_adopter",
        "perfect_month",
        "versatility",
      ],
      activity_type: [
        "Call",
        "Email",
        "Meeting",
        "LinkedIn",
        "InPerson",
        "Other",
      ],
      app_role: [
        "super_admin",
        "admin",
        "employee",
        "customer",
        "manager",
        "partner",
        "technician",
        "account_manager",
        "billing",
      ],
      briefing_type: ["full_briefing", "condensed_briefing"],
      campaign_report_status: ["active", "revoked", "expired"],
      charger_capture_status: ["not_started", "in_progress", "complete"],
      charger_issue_category: [
        "power_issue",
        "screen_display",
        "connector",
        "payment_processing",
        "network_connectivity",
        "physical_damage",
        "other",
      ],
      charger_post_work_status: [
        "operational",
        "partially_functional",
        "non_operational_followup",
        "requires_parts_ordered",
      ],
      charger_relationship_type: [
        "owner",
        "cpo",
        "cms",
        "oem",
        "service_partner",
      ],
      charger_root_cause: [
        "hardware_fault",
        "firmware",
        "network",
        "power_supply",
        "physical_damage",
        "wear",
        "unknown",
      ],
      customer_type: [
        "cpo",
        "cms",
        "oem",
        "site_host",
        "fleet_operator",
        "other",
      ],
      deal_stage: [
        "Account Mapped",
        "Relationship Warmed",
        "Expansion Opportunity Identified",
        "Proposal Out",
        "NOCH+ Introduced",
        "Pilot / Contract Signed",
        "Expanded & Recurring",
        "In Negotiation",
        "Closed Won",
        "Closed Lost",
        "Engaged",
        "Qualified",
      ],
      deal_type: ["recurring", "one_time", "hybrid"],
      enterprise_inquiry_status: ["new", "contacted", "qualified", "closed"],
      field_photo_type: [
        "before",
        "during",
        "after",
        "old_serial",
        "new_serial",
        "return_receipt",
        "loto_verification",
      ],
      growth_motion: [
        "Volume",
        "Strategic",
        "Government",
        "OEM",
        "New_Logo",
        "Maintain",
      ],
      growth_network_type: [
        "CPO",
        "CMS",
        "OEM",
        "Government",
        "Fleet",
        "Utility",
        "Other",
      ],
      growth_nochplus_timing: [
        "Live",
        "0-3 months",
        "3-6 months",
        "6-12 months",
        "12+ months",
        "Never",
      ],
      growth_tier: ["A", "B", "C"],
      qbr_data_source: ["auto", "document", "manual", "quickbooks"],
      qbr_entry_mode: ["auto", "document_upload", "manual", "hybrid"],
      qbr_quarter: ["Q1", "Q2", "Q3", "Q4"],
      qbr_status: ["in_progress", "prep_open", "active", "closed"],
      recurring_model: ["per_connector", "flat_monthly"],
      relationship_status: ["Cold", "Warm", "Hot", "Champion"],
      stakeholder_role: [
        "Decision Maker",
        "Influencer",
        "Champion",
        "Blocker",
        "Operational",
        "Unknown",
      ],
      strategy_account_type: [
        "revenue",
        "strategic_partner",
        "reference",
        "beachhead",
        "defensive",
      ],
      strategy_decision_role: [
        "champion",
        "decision_maker",
        "blocker",
        "influencer",
      ],
      strategy_kpi_unit: [
        "dollar",
        "percent",
        "count",
        "yes_no",
        "multiplier",
        "days",
        "months",
        "custom",
      ],
      strategy_play_status: [
        "not_started",
        "in_progress",
        "complete",
        "abandoned",
      ],
      strategy_position: [
        "pre_engagement",
        "active_dialogue",
        "pilot",
        "contracted",
        "at_risk",
        "champion",
      ],
      strategy_risk_severity: ["watch", "risk", "critical"],
      strategy_status: ["needs_review", "active", "archived"],
      strategy_temperature: ["cold", "warm", "hot"],
      ticket_assessment_status: ["pending_review", "assessed", "rejected"],
      weekly_review_action_status: ["open", "complete", "abandoned"],
      weekly_review_link_type: ["deal", "strategy", "account", "none"],
      weekly_review_note_type: [
        "update",
        "decision",
        "action_item",
        "risk",
        "need",
      ],
      weekly_review_skip_reason: [
        "holiday",
        "trade_show",
        "team_travel",
        "sprint_week",
        "other",
      ],
      weekly_review_status: [
        "pre_meeting",
        "open",
        "closed",
        "skipped",
        "missed",
        "pending_close",
      ],
      work_order_job_type: [
        "repair",
        "troubleshooting",
        "installation",
        "maintenance",
        "commissioning",
        "decommissioning",
      ],
      work_order_status: [
        "scheduled",
        "in_progress",
        "submitted",
        "pending_review",
        "flagged",
        "approved",
        "closed",
        "cancelled",
        "archived",
      ],
    },
  },
} as const
