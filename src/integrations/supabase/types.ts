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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      cron_status: {
        Row: {
          last_message: string | null
          last_ok: boolean | null
          last_run_at: string | null
          name: string
        }
        Insert: {
          last_message?: string | null
          last_ok?: boolean | null
          last_run_at?: string | null
          name: string
        }
        Update: {
          last_message?: string | null
          last_ok?: boolean | null
          last_run_at?: string | null
          name?: string
        }
        Relationships: []
      }
      event_logs: {
        Row: {
          context: Json | null
          event: string
          id: string
          ip: unknown | null
          level: string | null
          page: string | null
          ts: string | null
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          context?: Json | null
          event: string
          id?: string
          ip?: unknown | null
          level?: string | null
          page?: string | null
          ts?: string | null
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          context?: Json | null
          event?: string
          id?: string
          ip?: unknown | null
          level?: string | null
          page?: string | null
          ts?: string | null
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      models: {
        Row: {
          apify_task_id: string | null
          backfill_completed: boolean
          created_at: string
          display_name: string | null
          id: string
          last_backfill_at: string | null
          last_daily_scrape_at: string | null
          last_scraped_at: string | null
          secure_blob: Json | null
          status: Database["public"]["Enums"]["model_status"]
          updated_at: string
          username: string
          workspace_id: string
        }
        Insert: {
          apify_task_id?: string | null
          backfill_completed?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          last_backfill_at?: string | null
          last_daily_scrape_at?: string | null
          last_scraped_at?: string | null
          secure_blob?: Json | null
          status?: Database["public"]["Enums"]["model_status"]
          updated_at?: string
          username: string
          workspace_id: string
        }
        Update: {
          apify_task_id?: string | null
          backfill_completed?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          last_backfill_at?: string | null
          last_daily_scrape_at?: string | null
          last_scraped_at?: string | null
          secure_blob?: Json | null
          status?: Database["public"]["Enums"]["model_status"]
          updated_at?: string
          username?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          comfort_mode: boolean
          created_at: string
          email: string | null
          full_name: string | null
          high_contrast: boolean
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          comfort_mode?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          high_contrast?: boolean
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          comfort_mode?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          high_contrast?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reel_metrics_daily: {
        Row: {
          comments: number | null
          completion_rate: number | null
          created_at: string
          day: string
          id: string
          likes: number | null
          reel_id: string
          saves: number | null
          shares: number | null
          updated_at: string
          views: number | null
          watch_time_seconds: number | null
          workspace_id: string
        }
        Insert: {
          comments?: number | null
          completion_rate?: number | null
          created_at?: string
          day: string
          id?: string
          likes?: number | null
          reel_id: string
          saves?: number | null
          shares?: number | null
          updated_at?: string
          views?: number | null
          watch_time_seconds?: number | null
          workspace_id: string
        }
        Update: {
          comments?: number | null
          completion_rate?: number | null
          created_at?: string
          day?: string
          id?: string
          likes?: number | null
          reel_id?: string
          saves?: number | null
          shares?: number | null
          updated_at?: string
          views?: number | null
          watch_time_seconds?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_metrics_daily_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_metrics_daily_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string | null
          created_at: string
          duration_seconds: number | null
          hashtags: string[] | null
          id: string
          instagram_id: string
          model_id: string
          platform_post_id: string | null
          posted_at: string
          thumbnail_url: string | null
          url: string
          workspace_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          hashtags?: string[] | null
          id?: string
          instagram_id: string
          model_id: string
          platform_post_id?: string | null
          posted_at: string
          thumbnail_url?: string | null
          url: string
          workspace_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          hashtags?: string[] | null
          id?: string
          instagram_id?: string
          model_id?: string
          platform_post_id?: string | null
          posted_at?: string
          thumbnail_url?: string | null
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reels_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_inbox: {
        Row: {
          created_at: string
          dedupe_key: string | null
          hash: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          source: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          hash: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          source: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          hash?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          source?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_model: {
        Args: { display_name_param?: string; username_param: string }
        Returns: string
      }
      api_dashboard_bundle: {
        Args: { model_ids?: string[] }
        Returns: Json
      }
      ensure_user_workspace: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_workspace_member: {
        Args: { user_id: string; workspace_id: string }
        Returns: boolean
      }
      refresh_materialized_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_in_workspace: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      member_role: "owner" | "admin" | "member"
      model_status: "enabled" | "disabled" | "pending"
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
      member_role: ["owner", "admin", "member"],
      model_status: ["enabled", "disabled", "pending"],
    },
  },
} as const
