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
          degraded_count: number | null
          end_date: string | null
          health_score: number | null
          id: string
          name: string
          optimal_count: number | null
          quarter: string | null
          start_date: string | null
          total_chargers: number | null
          total_serviced: number | null
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          critical_count?: number | null
          customer: string
          degraded_count?: number | null
          end_date?: string | null
          health_score?: number | null
          id?: string
          name: string
          optimal_count?: number | null
          quarter?: string | null
          start_date?: string | null
          total_chargers?: number | null
          total_serviced?: number | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          critical_count?: number | null
          customer?: string
          degraded_count?: number | null
          end_date?: string | null
          health_score?: number | null
          id?: string
          name?: string
          optimal_count?: number | null
          quarter?: string | null
          start_date?: string | null
          total_chargers?: number | null
          total_serviced?: number | null
          updated_at?: string
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
