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
      ai_processing_log: {
        Row: {
          alert_id: string | null
          created_at: string | null
          error_detail: string | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          status: Database["public"]["Enums"]["ai_response_status"] | null
        }
        Insert: {
          alert_id?: string | null
          created_at?: string | null
          error_detail?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          status?: Database["public"]["Enums"]["ai_response_status"] | null
        }
        Update: {
          alert_id?: string | null
          created_at?: string | null
          error_detail?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          status?: Database["public"]["Enums"]["ai_response_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_processing_log_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          active: boolean | null
          condition_expr: string | null
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          requires_ai: boolean | null
          rule_key: string
          severity: Database["public"]["Enums"]["alert_severity"]
        }
        Insert: {
          active?: boolean | null
          condition_expr?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          requires_ai?: boolean | null
          rule_key: string
          severity: Database["public"]["Enums"]["alert_severity"]
        }
        Update: {
          active?: boolean | null
          condition_expr?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          requires_ai?: boolean | null
          rule_key?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
        }
        Relationships: []
      }
      alerts: {
        Row: {
          ai_insight: string | null
          ai_model: string | null
          ai_processed: boolean | null
          ai_ready: boolean | null
          ai_response_status:
            | Database["public"]["Enums"]["ai_response_status"]
            | null
          ai_timestamp: string | null
          ai_triggered_at: string | null
          alert_type: string
          animal_id: string | null
          assigned_to: string | null
          closed_timestamp: string | null
          created_at: string | null
          id: string
          kpi_id: string | null
          likely_cause: string | null
          notes: string | null
          notification_sent: boolean | null
          pen_id: string | null
          priority_level: Database["public"]["Enums"]["priority_level"] | null
          recommended_action: string | null
          requires_vet_escalation: boolean | null
          score: number | null
          severity: Database["public"]["Enums"]["alert_severity"]
          short_message: string | null
          site_id: string
          status: Database["public"]["Enums"]["alert_status"] | null
          timestamp: string | null
          trigger_reason: string | null
          updated_at: string | null
        }
        Insert: {
          ai_insight?: string | null
          ai_model?: string | null
          ai_processed?: boolean | null
          ai_ready?: boolean | null
          ai_response_status?:
            | Database["public"]["Enums"]["ai_response_status"]
            | null
          ai_timestamp?: string | null
          ai_triggered_at?: string | null
          alert_type: string
          animal_id?: string | null
          assigned_to?: string | null
          closed_timestamp?: string | null
          created_at?: string | null
          id?: string
          kpi_id?: string | null
          likely_cause?: string | null
          notes?: string | null
          notification_sent?: boolean | null
          pen_id?: string | null
          priority_level?: Database["public"]["Enums"]["priority_level"] | null
          recommended_action?: string | null
          requires_vet_escalation?: boolean | null
          score?: number | null
          severity: Database["public"]["Enums"]["alert_severity"]
          short_message?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["alert_status"] | null
          timestamp?: string | null
          trigger_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_insight?: string | null
          ai_model?: string | null
          ai_processed?: boolean | null
          ai_ready?: boolean | null
          ai_response_status?:
            | Database["public"]["Enums"]["ai_response_status"]
            | null
          ai_timestamp?: string | null
          ai_triggered_at?: string | null
          alert_type?: string
          animal_id?: string | null
          assigned_to?: string | null
          closed_timestamp?: string | null
          created_at?: string | null
          id?: string
          kpi_id?: string | null
          likely_cause?: string | null
          notes?: string | null
          notification_sent?: boolean | null
          pen_id?: string | null
          priority_level?: Database["public"]["Enums"]["priority_level"] | null
          recommended_action?: string | null
          requires_vet_escalation?: boolean | null
          score?: number | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          short_message?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["alert_status"] | null
          timestamp?: string | null
          trigger_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_daily_avg: {
        Row: {
          activity_drop_animals: number | null
          animals_count: number | null
          at_risk_animals: number | null
          avg_activity: number | null
          avg_activity_vs_baseline: number | null
          avg_body_temp: number | null
          avg_feed_intake: number | null
          avg_feed_vs_baseline: number | null
          avg_temp_vs_baseline: number | null
          combined_risk_animals: number | null
          created_at: string | null
          date: string
          feed_drop_animals: number | null
          fever_suspects: number | null
          health_risk_level: Database["public"]["Enums"]["risk_level"] | null
          id: string
          kpi_id: string | null
          max_body_temp: number | null
          min_activity: number | null
          min_feed_intake: number | null
          pen_id: string | null
          sick_animals_count: number | null
          site_id: string
          trend_activity: string | null
          trend_feed: string | null
          trend_temp: string | null
        }
        Insert: {
          activity_drop_animals?: number | null
          animals_count?: number | null
          at_risk_animals?: number | null
          avg_activity?: number | null
          avg_activity_vs_baseline?: number | null
          avg_body_temp?: number | null
          avg_feed_intake?: number | null
          avg_feed_vs_baseline?: number | null
          avg_temp_vs_baseline?: number | null
          combined_risk_animals?: number | null
          created_at?: string | null
          date: string
          feed_drop_animals?: number | null
          fever_suspects?: number | null
          health_risk_level?: Database["public"]["Enums"]["risk_level"] | null
          id?: string
          kpi_id?: string | null
          max_body_temp?: number | null
          min_activity?: number | null
          min_feed_intake?: number | null
          pen_id?: string | null
          sick_animals_count?: number | null
          site_id: string
          trend_activity?: string | null
          trend_feed?: string | null
          trend_temp?: string | null
        }
        Update: {
          activity_drop_animals?: number | null
          animals_count?: number | null
          at_risk_animals?: number | null
          avg_activity?: number | null
          avg_activity_vs_baseline?: number | null
          avg_body_temp?: number | null
          avg_feed_intake?: number | null
          avg_feed_vs_baseline?: number | null
          avg_temp_vs_baseline?: number | null
          combined_risk_animals?: number | null
          created_at?: string | null
          date?: string
          feed_drop_animals?: number | null
          fever_suspects?: number | null
          health_risk_level?: Database["public"]["Enums"]["risk_level"] | null
          id?: string
          kpi_id?: string | null
          max_body_temp?: number | null
          min_activity?: number | null
          min_feed_intake?: number | null
          pen_id?: string | null
          sick_animals_count?: number | null
          site_id?: string
          trend_activity?: string | null
          trend_feed?: string | null
          trend_temp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_daily_avg_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_daily_avg_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_daily_avg_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          active: boolean | null
          birth_date: string | null
          breed: string | null
          created_at: string | null
          deleted_at: string | null
          device_id: string | null
          health_status: Database["public"]["Enums"]["health_status"] | null
          id: string
          notes: string | null
          pen_id: string | null
          sex: string | null
          site_id: string
          tag_number: string
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          active?: boolean | null
          birth_date?: string | null
          breed?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string | null
          health_status?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          notes?: string | null
          pen_id?: string | null
          sex?: string | null
          site_id: string
          tag_number: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          active?: boolean | null
          birth_date?: string | null
          breed?: string | null
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string | null
          health_status?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          notes?: string | null
          pen_id?: string | null
          sex?: string | null
          site_id?: string
          tag_number?: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          active: boolean | null
          api_key_hash: string | null
          battery_status: number | null
          created_at: string | null
          device_type: Database["public"]["Enums"]["device_type"]
          firmware_version: string | null
          id: string
          install_date: string | null
          last_seen: string | null
          model: string | null
          notes: string | null
          pen_id: string | null
          serial_number: string
          signal_status: Database["public"]["Enums"]["signal_status"] | null
          site_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          api_key_hash?: string | null
          battery_status?: number | null
          created_at?: string | null
          device_type: Database["public"]["Enums"]["device_type"]
          firmware_version?: string | null
          id?: string
          install_date?: string | null
          last_seen?: string | null
          model?: string | null
          notes?: string | null
          pen_id?: string | null
          serial_number: string
          signal_status?: Database["public"]["Enums"]["signal_status"] | null
          site_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          api_key_hash?: string | null
          battery_status?: number | null
          created_at?: string | null
          device_type?: Database["public"]["Enums"]["device_type"]
          firmware_version?: string | null
          id?: string
          install_date?: string | null
          last_seen?: string | null
          model?: string | null
          notes?: string | null
          pen_id?: string | null
          serial_number?: string
          signal_status?: Database["public"]["Enums"]["signal_status"] | null
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_action_evidence: {
        Row: {
          action_item_id: string
          caption: string | null
          content_type: string | null
          id: string
          kind: Database["public"]["Enums"]["evidence_kind"]
          site_id: string
          size_bytes: number | null
          storage_path: string | null
          text_content: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          action_item_id: string
          caption?: string | null
          content_type?: string | null
          id?: string
          kind: Database["public"]["Enums"]["evidence_kind"]
          site_id: string
          size_bytes?: number | null
          storage_path?: string | null
          text_content?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          action_item_id?: string
          caption?: string | null
          content_type?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["evidence_kind"]
          site_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          text_content?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digest_action_evidence_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "digest_action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digest_action_evidence_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_action_items: {
        Row: {
          action_text: string
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          site_id: string
          sort_order: number
          status: Database["public"]["Enums"]["action_item_status"]
          summary_id: string
          updated_at: string
        }
        Insert: {
          action_text: string
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          site_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["action_item_status"]
          summary_id: string
          updated_at?: string
        }
        Update: {
          action_text?: string
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          site_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["action_item_status"]
          summary_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_action_items_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digest_action_items_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "site_daily_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digest_action_items_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "site_daily_summaries_latest"
            referencedColumns: ["id"]
          },
        ]
      }
      environment_daily_avg: {
        Row: {
          avg_ambient_temp: number | null
          avg_humidity: number | null
          avg_thi: number | null
          created_at: string | null
          date: string
          environment_risk_level:
            | Database["public"]["Enums"]["risk_level"]
            | null
          heat_stress_hours: number | null
          id: string
          kpi_id: string | null
          max_ambient_temp: number | null
          max_humidity: number | null
          max_thi: number | null
          min_ambient_temp: number | null
          min_humidity: number | null
          pen_id: string | null
          records_count: number | null
          site_id: string
          trend_temp: string | null
          ventilation_issues_count: number | null
        }
        Insert: {
          avg_ambient_temp?: number | null
          avg_humidity?: number | null
          avg_thi?: number | null
          created_at?: string | null
          date: string
          environment_risk_level?:
            | Database["public"]["Enums"]["risk_level"]
            | null
          heat_stress_hours?: number | null
          id?: string
          kpi_id?: string | null
          max_ambient_temp?: number | null
          max_humidity?: number | null
          max_thi?: number | null
          min_ambient_temp?: number | null
          min_humidity?: number | null
          pen_id?: string | null
          records_count?: number | null
          site_id: string
          trend_temp?: string | null
          ventilation_issues_count?: number | null
        }
        Update: {
          avg_ambient_temp?: number | null
          avg_humidity?: number | null
          avg_thi?: number | null
          created_at?: string | null
          date?: string
          environment_risk_level?:
            | Database["public"]["Enums"]["risk_level"]
            | null
          heat_stress_hours?: number | null
          id?: string
          kpi_id?: string | null
          max_ambient_temp?: number | null
          max_humidity?: number | null
          max_thi?: number | null
          min_ambient_temp?: number | null
          min_humidity?: number | null
          pen_id?: string | null
          records_count?: number | null
          site_id?: string
          trend_temp?: string | null
          ventilation_issues_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "environment_daily_avg_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_daily_avg_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_daily_avg_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      environment_raw: {
        Row: {
          ambient_temp_c: number | null
          created_at: string | null
          device_id: string | null
          humidity_pct: number | null
          id: string
          pen_id: string | null
          raw_payload: Json | null
          site_id: string
          thi: number | null
          timestamp: string
          ventilation_score: number | null
        }
        Insert: {
          ambient_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          humidity_pct?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          site_id: string
          thi?: number | null
          timestamp: string
          ventilation_score?: number | null
        }
        Update: {
          ambient_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          humidity_pct?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          site_id?: string
          thi?: number | null
          timestamp?: string
          ventilation_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "environment_raw_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_raw_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_raw_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          animal_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          pen_id: string | null
          site_id: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          pen_id?: string | null
          site_id: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          pen_id?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_overview: {
        Row: {
          animals_at_risk: number | null
          animals_monitored: number | null
          closed_alerts: number | null
          created_at: string | null
          critical_alerts: number | null
          data_freshness_minutes: number | null
          date: string
          devices_low_battery: number | null
          devices_offline: number | null
          environment_risk_index: number | null
          environments_monitored: number | null
          feed_risk_index: number | null
          health_risk_index: number | null
          high_alerts: number | null
          highest_risk_animal: string | null
          highest_risk_pen: string | null
          id: string
          in_progress_alerts: number | null
          lowest_silo_days: number | null
          notes: string | null
          open_alerts: number | null
          operational_risk_index: number | null
          overall_status: Database["public"]["Enums"]["risk_level"] | null
          pens_monitored: number | null
          silos_monitored: number | null
          site_id: string
          sites_monitored: number | null
        }
        Insert: {
          animals_at_risk?: number | null
          animals_monitored?: number | null
          closed_alerts?: number | null
          created_at?: string | null
          critical_alerts?: number | null
          data_freshness_minutes?: number | null
          date: string
          devices_low_battery?: number | null
          devices_offline?: number | null
          environment_risk_index?: number | null
          environments_monitored?: number | null
          feed_risk_index?: number | null
          health_risk_index?: number | null
          high_alerts?: number | null
          highest_risk_animal?: string | null
          highest_risk_pen?: string | null
          id?: string
          in_progress_alerts?: number | null
          lowest_silo_days?: number | null
          notes?: string | null
          open_alerts?: number | null
          operational_risk_index?: number | null
          overall_status?: Database["public"]["Enums"]["risk_level"] | null
          pens_monitored?: number | null
          silos_monitored?: number | null
          site_id: string
          sites_monitored?: number | null
        }
        Update: {
          animals_at_risk?: number | null
          animals_monitored?: number | null
          closed_alerts?: number | null
          created_at?: string | null
          critical_alerts?: number | null
          data_freshness_minutes?: number | null
          date?: string
          devices_low_battery?: number | null
          devices_offline?: number | null
          environment_risk_index?: number | null
          environments_monitored?: number | null
          feed_risk_index?: number | null
          health_risk_index?: number | null
          high_alerts?: number | null
          highest_risk_animal?: string | null
          highest_risk_pen?: string | null
          id?: string
          in_progress_alerts?: number | null
          lowest_silo_days?: number | null
          notes?: string | null
          open_alerts?: number | null
          operational_risk_index?: number | null
          overall_status?: Database["public"]["Enums"]["risk_level"] | null
          pens_monitored?: number | null
          silos_monitored?: number | null
          site_id?: string
          sites_monitored?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_overview_highest_risk_animal_fkey"
            columns: ["highest_risk_animal"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_overview_highest_risk_pen_fkey"
            columns: ["highest_risk_pen"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_overview_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          alert_id: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          error_detail: string | null
          id: string
          message: string | null
          recipient: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          alert_id?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          error_detail?: string | null
          id?: string
          message?: string | null
          recipient: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          alert_id?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          error_detail?: string | null
          id?: string
          message?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          plan: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          plan?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          plan?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pens: {
        Row: {
          active: boolean | null
          capacity: number | null
          created_at: string | null
          current_animals: number | null
          deleted_at: string | null
          feed_type: string | null
          id: string
          notes: string | null
          pen_name: string
          pen_type: Database["public"]["Enums"]["pen_type"]
          site_id: string
          updated_at: string | null
          ventilation_type: string | null
          water_source: string | null
        }
        Insert: {
          active?: boolean | null
          capacity?: number | null
          created_at?: string | null
          current_animals?: number | null
          deleted_at?: string | null
          feed_type?: string | null
          id?: string
          notes?: string | null
          pen_name: string
          pen_type?: Database["public"]["Enums"]["pen_type"]
          site_id: string
          updated_at?: string | null
          ventilation_type?: string | null
          water_source?: string | null
        }
        Update: {
          active?: boolean | null
          capacity?: number | null
          created_at?: string | null
          current_animals?: number | null
          deleted_at?: string | null
          feed_type?: string | null
          id?: string
          notes?: string | null
          pen_name?: string
          pen_type?: Database["public"]["Enums"]["pen_type"]
          site_id?: string
          updated_at?: string | null
          ventilation_type?: string | null
          water_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pens_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_daily_summaries: {
        Row: {
          confidence: number | null
          created_at: string
          date: string
          error_detail: string | null
          generated_at: string | null
          headline: string | null
          id: string
          input_tokens: number | null
          key_points: Json
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          overall_tone: Database["public"]["Enums"]["digest_tone"] | null
          raw_response: Json | null
          site_id: string
          status: Database["public"]["Enums"]["digest_status"]
          telegram_message: string | null
          telegram_sent: boolean
          telegram_sent_at: string | null
          things_to_check: Json
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          date: string
          error_detail?: string | null
          generated_at?: string | null
          headline?: string | null
          id?: string
          input_tokens?: number | null
          key_points?: Json
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          overall_tone?: Database["public"]["Enums"]["digest_tone"] | null
          raw_response?: Json | null
          site_id: string
          status?: Database["public"]["Enums"]["digest_status"]
          telegram_message?: string | null
          telegram_sent?: boolean
          telegram_sent_at?: string | null
          things_to_check?: Json
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          date?: string
          error_detail?: string | null
          generated_at?: string | null
          headline?: string | null
          id?: string
          input_tokens?: number | null
          key_points?: Json
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          overall_tone?: Database["public"]["Enums"]["digest_tone"] | null
          raw_response?: Json | null
          site_id?: string
          status?: Database["public"]["Enums"]["digest_status"]
          telegram_message?: string | null
          telegram_sent?: boolean
          telegram_sent_at?: string | null
          things_to_check?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_daily_summaries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_notification_channels: {
        Row: {
          active: boolean | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          id: string
          min_severity: Database["public"]["Enums"]["alert_severity"]
          recipient: string
          site_id: string
        }
        Insert: {
          active?: boolean | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          id?: string
          min_severity?: Database["public"]["Enums"]["alert_severity"]
          recipient: string
          site_id: string
        }
        Update: {
          active?: boolean | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          id?: string
          min_severity?: Database["public"]["Enums"]["alert_severity"]
          recipient?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_notification_channels_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          active: boolean | null
          created_at: string | null
          deleted_at: string | null
          id: string
          latitude: number | null
          location_address: string | null
          longitude: number | null
          manager_name: string | null
          manager_phone: string | null
          notes: string | null
          organization_id: string
          owner_name: string | null
          site_name: string
          timezone: string | null
          total_animals: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          manager_name?: string | null
          manager_phone?: string | null
          notes?: string | null
          organization_id: string
          owner_name?: string | null
          site_name: string
          timezone?: string | null
          total_animals?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          manager_name?: string | null
          manager_phone?: string | null
          notes?: string | null
          organization_id?: string
          owner_name?: string | null
          site_name?: string
          timezone?: string | null
          total_animals?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_raw: {
        Row: {
          activity: number | null
          animal_id: string | null
          battery: number | null
          body_temp_c: number | null
          created_at: string | null
          device_id: string | null
          feed_intake_g: number | null
          feed_visits: number | null
          id: string
          pen_id: string | null
          raw_payload: Json | null
          signal: number | null
          site_id: string
          timestamp: string
          water_intake_ml: number | null
        }
        Insert: {
          activity?: number | null
          animal_id?: string | null
          battery?: number | null
          body_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          feed_intake_g?: number | null
          feed_visits?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          signal?: number | null
          site_id: string
          timestamp: string
          water_intake_ml?: number | null
        }
        Update: {
          activity?: number | null
          animal_id?: string | null
          battery?: number | null
          body_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          feed_intake_g?: number | null
          feed_visits?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          signal?: number | null
          site_id?: string
          timestamp?: string
          water_intake_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_raw_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_raw_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_raw_pen_id_fkey"
            columns: ["pen_id"]
            isOneToOne: false
            referencedRelation: "pens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_raw_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_raw_2026_02: {
        Row: {
          activity: number | null
          animal_id: string | null
          battery: number | null
          body_temp_c: number | null
          created_at: string | null
          device_id: string | null
          feed_intake_g: number | null
          feed_visits: number | null
          id: string
          pen_id: string | null
          raw_payload: Json | null
          signal: number | null
          site_id: string
          timestamp: string
          water_intake_ml: number | null
        }
        Insert: {
          activity?: number | null
          animal_id?: string | null
          battery?: number | null
          body_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          feed_intake_g?: number | null
          feed_visits?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          signal?: number | null
          site_id: string
          timestamp: string
          water_intake_ml?: number | null
        }
        Update: {
          activity?: number | null
          animal_id?: string | null
          battery?: number | null
          body_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          feed_intake_g?: number | null
          feed_visits?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          signal?: number | null
          site_id?: string
          timestamp?: string
          water_intake_ml?: number | null
        }
        Relationships: []
      }
      telemetry_raw_2026_03: {
        Row: {
          activity: number | null
          animal_id: string | null
          battery: number | null
          body_temp_c: number | null
          created_at: string | null
          device_id: string | null
          feed_intake_g: number | null
          feed_visits: number | null
          id: string
          pen_id: string | null
          raw_payload: Json | null
          signal: number | null
          site_id: string
          timestamp: string
          water_intake_ml: number | null
        }
        Insert: {
          activity?: number | null
          animal_id?: string | null
          battery?: number | null
          body_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          feed_intake_g?: number | null
          feed_visits?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          signal?: number | null
          site_id: string
          timestamp: string
          water_intake_ml?: number | null
        }
        Update: {
          activity?: number | null
          animal_id?: string | null
          battery?: number | null
          body_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          feed_intake_g?: number | null
          feed_visits?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          signal?: number | null
          site_id?: string
          timestamp?: string
          water_intake_ml?: number | null
        }
        Relationships: []
      }
      telemetry_raw_2026_04: {
        Row: {
          activity: number | null
          animal_id: string | null
          battery: number | null
          body_temp_c: number | null
          created_at: string | null
          device_id: string | null
          feed_intake_g: number | null
          feed_visits: number | null
          id: string
          pen_id: string | null
          raw_payload: Json | null
          signal: number | null
          site_id: string
          timestamp: string
          water_intake_ml: number | null
        }
        Insert: {
          activity?: number | null
          animal_id?: string | null
          battery?: number | null
          body_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          feed_intake_g?: number | null
          feed_visits?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          signal?: number | null
          site_id: string
          timestamp: string
          water_intake_ml?: number | null
        }
        Update: {
          activity?: number | null
          animal_id?: string | null
          battery?: number | null
          body_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          feed_intake_g?: number | null
          feed_visits?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          signal?: number | null
          site_id?: string
          timestamp?: string
          water_intake_ml?: number | null
        }
        Relationships: []
      }
      telemetry_raw_2026_05: {
        Row: {
          activity: number | null
          animal_id: string | null
          battery: number | null
          body_temp_c: number | null
          created_at: string | null
          device_id: string | null
          feed_intake_g: number | null
          feed_visits: number | null
          id: string
          pen_id: string | null
          raw_payload: Json | null
          signal: number | null
          site_id: string
          timestamp: string
          water_intake_ml: number | null
        }
        Insert: {
          activity?: number | null
          animal_id?: string | null
          battery?: number | null
          body_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          feed_intake_g?: number | null
          feed_visits?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          signal?: number | null
          site_id: string
          timestamp: string
          water_intake_ml?: number | null
        }
        Update: {
          activity?: number | null
          animal_id?: string | null
          battery?: number | null
          body_temp_c?: number | null
          created_at?: string | null
          device_id?: string | null
          feed_intake_g?: number | null
          feed_visits?: number | null
          id?: string
          pen_id?: string | null
          raw_payload?: Json | null
          signal?: number | null
          site_id?: string
          timestamp?: string
          water_intake_ml?: number | null
        }
        Relationships: []
      }
      users_organizations: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kpi_risk_drivers: {
        Row: {
          alert_type: string | null
          category: string | null
          critical_count: number | null
          high_count: number | null
          low_count: number | null
          medium_count: number | null
          site_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_daily_summaries_latest: {
        Row: {
          confidence: number | null
          created_at: string | null
          date: string | null
          generated_at: string | null
          headline: string | null
          id: string | null
          key_points: Json | null
          model: string | null
          overall_tone: Database["public"]["Enums"]["digest_tone"] | null
          site_id: string | null
          status: Database["public"]["Enums"]["digest_status"] | null
          telegram_sent: boolean | null
          things_to_check: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "site_daily_summaries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_user_org_members: {
        Args: never
        Returns: {
          email: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      auth_user_orgs: { Args: never; Returns: string[] }
      auth_user_sites: { Args: never; Returns: string[] }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sp_compute_daily_kpis: {
        Args: { p_date: string; p_site_id: string }
        Returns: undefined
      }
      sp_generate_alerts: {
        Args: { p_date: string; p_site_id: string }
        Returns: number
      }
    }
    Enums: {
      action_item_status: "open" | "in_progress" | "done" | "skipped"
      ai_response_status: "pending" | "success" | "failed" | "skipped"
      alert_severity: "Low" | "Medium" | "High" | "Critical"
      alert_status: "Open" | "In Progress" | "Closed" | "Snoozed"
      device_type:
        | "ear_tag"
        | "env_probe"
        | "silo_sensor"
        | "water_flow"
        | "camera"
        | "gateway"
      digest_status: "pending" | "success" | "failed"
      digest_tone: "all_good" | "watch" | "action_required"
      evidence_kind: "photo" | "document" | "text"
      health_status:
        | "healthy"
        | "monitoring"
        | "sick"
        | "recovering"
        | "deceased"
      notification_channel: "telegram" | "whatsapp" | "email" | "sms"
      pen_type:
        | "gestation"
        | "farrowing"
        | "nursery"
        | "grower"
        | "finisher"
        | "boar"
        | "isolation"
      priority_level: "Routine" | "Attention" | "Urgent" | "Immediate"
      risk_level: "Low" | "Moderate" | "High" | "Severe"
      signal_status: "online" | "degraded" | "offline"
      user_role: "owner" | "manager" | "vet" | "operator" | "viewer"
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
      action_item_status: ["open", "in_progress", "done", "skipped"],
      ai_response_status: ["pending", "success", "failed", "skipped"],
      alert_severity: ["Low", "Medium", "High", "Critical"],
      alert_status: ["Open", "In Progress", "Closed", "Snoozed"],
      device_type: [
        "ear_tag",
        "env_probe",
        "silo_sensor",
        "water_flow",
        "camera",
        "gateway",
      ],
      digest_status: ["pending", "success", "failed"],
      digest_tone: ["all_good", "watch", "action_required"],
      evidence_kind: ["photo", "document", "text"],
      health_status: [
        "healthy",
        "monitoring",
        "sick",
        "recovering",
        "deceased",
      ],
      notification_channel: ["telegram", "whatsapp", "email", "sms"],
      pen_type: [
        "gestation",
        "farrowing",
        "nursery",
        "grower",
        "finisher",
        "boar",
        "isolation",
      ],
      priority_level: ["Routine", "Attention", "Urgent", "Immediate"],
      risk_level: ["Low", "Moderate", "High", "Severe"],
      signal_status: ["online", "degraded", "offline"],
      user_role: ["owner", "manager", "vet", "operator", "viewer"],
    },
  },
} as const
