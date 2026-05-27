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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          is_important: boolean
          publish_date: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_important?: boolean
          publish_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_important?: boolean
          publish_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_verses: {
        Row: {
          created_at: string
          display_date: string
          id: string
          reference: string
          text: string
        }
        Insert: {
          created_at?: string
          display_date?: string
          id?: string
          reference: string
          text: string
        }
        Update: {
          created_at?: string
          display_date?: string
          id?: string
          reference?: string
          text?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_activities: {
        Row: {
          id: string
          month: string
          day: number
          time_slot: string
          title: string
          dirigente: string | null
          leitura: string | null
          texto: string | null
          pregacao: string | null
          estudo: string | null
          local: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          month: string
          day: number
          time_slot: string
          title: string
          dirigente?: string | null
          leitura?: string | null
          texto?: string | null
          pregacao?: string | null
          estudo?: string | null
          local?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          month?: string
          day?: number
          time_slot?: string
          title?: string
          dirigente?: string | null
          leitura?: string | null
          texto?: string | null
          pregacao?: string | null
          estudo?: string | null
          local?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          baptism_date: string | null
          birth_date: string | null
          children: string | null
          conversion_year: number | null
          created_at: string
          email: string | null
          family_id: string | null
          full_name: string
          id: string
          internal_notes: string | null
          is_child: boolean
          is_converted: boolean | null
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          ministry: string | null
          phone: string | null
          photo_url: string | null
          spouse: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          baptism_date?: string | null
          birth_date?: string | null
          children?: string | null
          conversion_year?: number | null
          created_at?: string
          email?: string | null
          family_id?: string | null
          full_name: string
          id?: string
          internal_notes?: string | null
          is_child?: boolean
          is_converted?: boolean | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          ministry?: string | null
          phone?: string | null
          photo_url?: string | null
          spouse?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          baptism_date?: string | null
          birth_date?: string | null
          children?: string | null
          conversion_year?: number | null
          created_at?: string
          email?: string | null
          family_id?: string | null
          full_name?: string
          id?: string
          internal_notes?: string | null
          is_child?: boolean
          is_converted?: boolean | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          ministry?: string | null
          phone?: string | null
          photo_url?: string | null
          spouse?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          author_id: string | null
          category: Database["public"]["Enums"]["prayer_category"]
          created_at: string
          description: string
          display_name: string | null
          family_id: string | null
          id: string
          is_anonymous: boolean
          is_whole_family: boolean
          member_id: string | null
          status: Database["public"]["Enums"]["prayer_status"]
          title: string
          type: Database["public"]["Enums"]["prayer_type"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          author_id?: string | null
          category?: Database["public"]["Enums"]["prayer_category"]
          created_at?: string
          description: string
          display_name?: string | null
          family_id?: string | null
          id?: string
          is_anonymous?: boolean
          is_whole_family?: boolean
          member_id?: string | null
          status?: Database["public"]["Enums"]["prayer_status"]
          title: string
          type?: Database["public"]["Enums"]["prayer_type"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          author_id?: string | null
          category?: Database["public"]["Enums"]["prayer_category"]
          created_at?: string
          description?: string
          display_name?: string | null
          family_id?: string | null
          id?: string
          is_anonymous?: boolean
          is_whole_family?: boolean
          member_id?: string | null
          status?: Database["public"]["Enums"]["prayer_status"]
          title?: string
          type?: Database["public"]["Enums"]["prayer_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          prayer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prayer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prayer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      services_schedule: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string | null
          id: string
          is_recurring: boolean
          location: string | null
          start_time: string | null
          title: string
          type: Database["public"]["Enums"]["service_type"]
          updated_at: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          id?: string
          is_recurring?: boolean
          location?: string | null
          start_time?: string | null
          title: string
          type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          id?: string
          is_recurring?: boolean
          location?: string | null
          start_time?: string | null
          title?: string
          type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          weekday?: number | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "member"
      marital_status: "solteiro" | "casado" | "viuvo" | "divorciado" | "outro"
      prayer_category:
        | "saude"
        | "trabalho"
        | "familia"
        | "espiritual"
        | "viagens"
        | "gratidao"
        | "outros"
      prayer_status: "pendente" | "aprovado" | "rejeitado" | "arquivado"
      prayer_type: "pedido" | "agradecimento"
      service_type: "culto" | "oracao" | "estudo" | "evento" | "outro"
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
      app_role: ["admin", "member"],
      marital_status: ["solteiro", "casado", "viuvo", "divorciado", "outro"],
      prayer_category: [
        "saude",
        "trabalho",
        "familia",
        "espiritual",
        "viagens",
        "gratidao",
        "outros",
      ],
      prayer_status: ["pendente", "aprovado", "rejeitado", "arquivado"],
      prayer_type: ["pedido", "agradecimento"],
      service_type: ["culto", "oracao", "estudo", "evento", "outro"],
    },
  },
} as const
