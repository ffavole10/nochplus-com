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
      campaigns: {
        Row: {
          created_at: string
          critical_count: number | null
          customer: string
          data: Json | null
          degraded_count: number | null
          end_date: string | null
          health_score: number | null
          id: string
          name: string
          optimal_count: number | null
          quarter: string | null
          start_date: string | null
          status: string | null
          total_chargers: number | null
          total_serviced: number | null
          updated_at: string
          user_id: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          critical_count?: number | null
          customer: string
          data?: Json | null
          degraded_count?: number | null
          end_date?: string | null
          health_score?: number | null
          id?: string
          name: string
          optimal_count?: number | null
          quarter?: string | null
          start_date?: string | null
          status?: string | null
          total_chargers?: number | null
          total_serviced?: number | null
          updated_at?: string
          user_id?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          critical_count?: number | null
          customer?: string
          data?: Json | null
          degraded_count?: number | null
          end_date?: string | null
          health_score?: number | null
          id?: string
          name?: string
          optimal_count?: number | null
          quarter?: string | null
          start_date?: string | null
          status?: string | null
          total_chargers?: number | null
          total_serviced?: number | null
          updated_at?: string
          user_id?: string | null
          year?: number | null
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
          created_at: string
          customer_id: string
          email: string
          id: string
          is_primary: boolean
          name: string
          phone: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string
          id?: string
          is_primary?: boolean
          name: string
          phone?: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
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
          customer_name: string
          id: string
          notes: string | null
          override_items: Json
          rate_card_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          notes?: string | null
          override_items?: Json
          rate_card_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          notes?: string | null
          override_items?: Json
          rate_card_id?: string
          updated_at?: string
        }
        Relationships: [
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
          customer_name?: string
          description?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string
          company: string
          contact_name: string
          created_at: string
          description: string | null
          email: string
          headquarters_address: string | null
          id: string
          industry: string | null
          last_service_date: string | null
          logo_url: string | null
          notes: string
          phone: string
          pricing_type: string
          status: string
          ticket_count: number
          total_revenue: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string
          company: string
          contact_name: string
          created_at?: string
          description?: string | null
          email: string
          headquarters_address?: string | null
          id?: string
          industry?: string | null
          last_service_date?: string | null
          logo_url?: string | null
          notes?: string
          phone?: string
          pricing_type?: string
          status?: string
          ticket_count?: number
          total_revenue?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string
          company?: string
          contact_name?: string
          created_at?: string
          description?: string | null
          email?: string
          headquarters_address?: string | null
          id?: string
          industry?: string | null
          last_service_date?: string | null
          logo_url?: string | null
          notes?: string
          phone?: string
          pricing_type?: string
          status?: string
          ticket_count?: number
          total_revenue?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      estimates: {
        Row: {
          account_manager: string | null
          campaign_id: string | null
          charger_record_id: string | null
          created_at: string
          customer_address: string | null
          customer_email: string | null
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
        ]
      }
      locations: {
        Row: {
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
            referencedRelation: "customers"
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
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          service_urgency: string | null
          source: string
          staff_notes: string | null
          state: string
          status: string
          street_address: string | null
          submission_id: string | null
          ticket_id: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
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
          service_urgency?: string | null
          source?: string
          staff_notes?: string | null
          state: string
          status?: string
          street_address?: string | null
          submission_id?: string | null
          ticket_id: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
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
          service_urgency?: string | null
          source?: string
          staff_notes?: string | null
          state?: string
          status?: string
          street_address?: string | null
          submission_id?: string | null
          ticket_id?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "employee"
        | "customer"
        | "manager"
        | "partner"
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
      app_role: [
        "super_admin",
        "admin",
        "employee",
        "customer",
        "manager",
        "partner",
      ],
    },
  },
} as const
