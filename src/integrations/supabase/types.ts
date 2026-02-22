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
      estimates: {
        Row: {
          account_manager: string | null
          campaign_id: string | null
          charger_record_id: string | null
          created_at: string
          customer_email: string | null
          id: string
          line_items: Json
          notes: string | null
          sent_at: string | null
          site_name: string | null
          station_id: string | null
          status: string
          subtotal: number
          tax: number
          tax_rate: number
          ticket_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          account_manager?: string | null
          campaign_id?: string | null
          charger_record_id?: string | null
          created_at?: string
          customer_email?: string | null
          id?: string
          line_items?: Json
          notes?: string | null
          sent_at?: string | null
          site_name?: string | null
          station_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tax_rate?: number
          ticket_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          account_manager?: string | null
          campaign_id?: string | null
          charger_record_id?: string | null
          created_at?: string
          customer_email?: string | null
          id?: string
          line_items?: Json
          notes?: string | null
          sent_at?: string | null
          site_name?: string | null
          station_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tax_rate?: number
          ticket_id?: string | null
          total?: number
          updated_at?: string
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
