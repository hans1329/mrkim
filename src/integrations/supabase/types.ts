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
      ai_call_logs: {
        Row: {
          call_type: string
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_name: string | null
          recipient_phone: string
          script: string
          status: string
          tts_audio_url: string | null
          twilio_call_sid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          call_type?: string
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_name?: string | null
          recipient_phone: string
          script: string
          status?: string
          tts_audio_url?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          call_type?: string
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_name?: string | null
          recipient_phone?: string
          script?: string
          status?: string
          tts_audio_url?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          created_at: string
          data_snapshot: Json | null
          description: string
          expires_at: string
          generated_at: string
          id: string
          impact: string | null
          priority: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_snapshot?: Json | null
          description: string
          expires_at?: string
          generated_at?: string
          id?: string
          impact?: string | null
          priority: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_snapshot?: Json | null
          description?: string
          expires_at?: string
          generated_at?: string
          id?: string
          impact?: string | null
          priority?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          end_at: string | null
          id: string
          is_active: boolean
          is_popup: boolean
          start_at: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          is_popup?: boolean
          start_at?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          is_popup?: boolean
          start_at?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          cost_estimate: number | null
          created_at: string
          duration_ms: number | null
          endpoint: string | null
          id: string
          metadata: Json | null
          service: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          id?: string
          metadata?: Json | null
          service: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string | null
          id?: string
          metadata?: Json | null
          service?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      auto_transfers: {
        Row: {
          amount: number
          amount_percentage: number | null
          condition: string
          created_at: string
          description: string | null
          hyphen_transfer_id: string | null
          id: string
          is_active: boolean
          last_executed_at: string | null
          linked_deposit_id: string | null
          name: string
          next_execution_at: string | null
          recipient: string
          schedule_day: number | null
          schedule_type: string
          source_account_id: string | null
          status: string
          target_account_number: string | null
          target_bank_name: string | null
          transfer_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          amount_percentage?: number | null
          condition?: string
          created_at?: string
          description?: string | null
          hyphen_transfer_id?: string | null
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          linked_deposit_id?: string | null
          name: string
          next_execution_at?: string | null
          recipient: string
          schedule_day?: number | null
          schedule_type?: string
          source_account_id?: string | null
          status?: string
          target_account_number?: string | null
          target_bank_name?: string | null
          transfer_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_percentage?: number | null
          condition?: string
          created_at?: string
          description?: string | null
          hyphen_transfer_id?: string | null
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          linked_deposit_id?: string | null
          name?: string
          next_execution_at?: string | null
          recipient?: string
          schedule_day?: number | null
          schedule_type?: string
          source_account_id?: string | null
          status?: string
          target_account_number?: string | null
          target_bank_name?: string | null
          transfer_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_transfers_linked_deposit_id_fkey"
            columns: ["linked_deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      connected_accounts: {
        Row: {
          account_alias: string | null
          account_holder: string | null
          account_number: string
          account_type: string
          bank_code: string
          bank_name: string
          codef_account_id: string | null
          codef_connected: boolean | null
          created_at: string
          hyphen_connected: boolean | null
          hyphen_consent_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_alias?: string | null
          account_holder?: string | null
          account_number: string
          account_type?: string
          bank_code: string
          bank_name: string
          codef_account_id?: string | null
          codef_connected?: boolean | null
          created_at?: string
          hyphen_connected?: boolean | null
          hyphen_consent_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_alias?: string | null
          account_holder?: string | null
          account_number?: string
          account_type?: string
          bank_code?: string
          bank_name?: string
          codef_account_id?: string | null
          codef_connected?: boolean | null
          created_at?: string
          hyphen_connected?: boolean | null
          hyphen_consent_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connector_instances: {
        Row: {
          connected_id: string | null
          connector_id: string
          created_at: string
          credentials_meta: Json | null
          id: string
          last_sync_at: string | null
          next_sync_at: string | null
          status: Database["public"]["Enums"]["connector_status"]
          status_message: string | null
          sync_interval_minutes: number | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_id?: string | null
          connector_id: string
          created_at?: string
          credentials_meta?: Json | null
          id?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          status?: Database["public"]["Enums"]["connector_status"]
          status_message?: string | null
          sync_interval_minutes?: number | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_id?: string | null
          connector_id?: string
          created_at?: string
          credentials_meta?: Json | null
          id?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          status?: Database["public"]["Enums"]["connector_status"]
          status_message?: string | null
          sync_interval_minutes?: number | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_instances_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      connectors: {
        Row: {
          category: string
          config_schema: Json | null
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          provider: string
        }
        Insert: {
          category: string
          config_schema?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id: string
          is_active?: boolean
          name: string
          provider?: string
        }
        Update: {
          category?: string
          config_schema?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          provider?: string
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          ad_fee: number | null
          add_tax: number | null
          card_fee: number | null
          created_at: string
          delivery_amt: number | null
          delivery_type: string | null
          detail_list: Json | null
          discnt_amt: number | null
          id: string
          mfd_discount_amount: number | null
          order_div: string | null
          order_dt: string | null
          order_fee: number | null
          order_name: string | null
          order_no: string
          order_tm: string | null
          platform: string
          raw_data: Json | null
          settle_amt: number | null
          settle_dt: string | null
          store_id: string | null
          synced_at: string
          total_amt: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_fee?: number | null
          add_tax?: number | null
          card_fee?: number | null
          created_at?: string
          delivery_amt?: number | null
          delivery_type?: string | null
          detail_list?: Json | null
          discnt_amt?: number | null
          id?: string
          mfd_discount_amount?: number | null
          order_div?: string | null
          order_dt?: string | null
          order_fee?: number | null
          order_name?: string | null
          order_no: string
          order_tm?: string | null
          platform?: string
          raw_data?: Json | null
          settle_amt?: number | null
          settle_dt?: string | null
          store_id?: string | null
          synced_at?: string
          total_amt?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_fee?: number | null
          add_tax?: number | null
          card_fee?: number | null
          created_at?: string
          delivery_amt?: number | null
          delivery_type?: string | null
          detail_list?: Json | null
          discnt_amt?: number | null
          id?: string
          mfd_discount_amount?: number | null
          order_div?: string | null
          order_dt?: string | null
          order_fee?: number | null
          order_name?: string | null
          order_no?: string
          order_tm?: string | null
          platform?: string
          raw_data?: Json | null
          settle_amt?: number | null
          settle_dt?: string | null
          store_id?: string | null
          synced_at?: string
          total_amt?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_settlements: {
        Row: {
          balance: number | null
          biz_no: string | null
          cal_date: string
          created_at: string
          id: string
          platform: string
          raw_data: Json | null
          settlement_amt: number | null
          settlement_details: Json | null
          store_id: string | null
          synced_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          biz_no?: string | null
          cal_date: string
          created_at?: string
          id?: string
          platform?: string
          raw_data?: Json | null
          settlement_amt?: number | null
          settlement_details?: Json | null
          store_id?: string | null
          synced_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          biz_no?: string | null
          cal_date?: string
          created_at?: string
          id?: string
          platform?: string
          raw_data?: Json | null
          settlement_amt?: number | null
          settlement_details?: Json | null
          store_id?: string | null
          synced_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_stores: {
        Row: {
          addr: string | null
          addr_detail: string | null
          biz_no: string | null
          country_origin: string | null
          created_at: string
          deposit_account: string | null
          deposit_bank: string | null
          id: string
          main_category: string[] | null
          platform: string
          raw_data: Json | null
          refund_account: string | null
          refund_bank: string | null
          rep_name: string | null
          status: string | null
          store_id: string
          store_name: string
          store_notice: string | null
          sub_category: string[] | null
          tel_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          addr?: string | null
          addr_detail?: string | null
          biz_no?: string | null
          country_origin?: string | null
          created_at?: string
          deposit_account?: string | null
          deposit_bank?: string | null
          id?: string
          main_category?: string[] | null
          platform?: string
          raw_data?: Json | null
          refund_account?: string | null
          refund_bank?: string | null
          rep_name?: string | null
          status?: string | null
          store_id: string
          store_name: string
          store_notice?: string | null
          sub_category?: string[] | null
          tel_no?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          addr?: string | null
          addr_detail?: string | null
          biz_no?: string | null
          country_origin?: string | null
          created_at?: string
          deposit_account?: string | null
          deposit_bank?: string | null
          id?: string
          main_category?: string[] | null
          platform?: string
          raw_data?: Json | null
          refund_account?: string | null
          refund_bank?: string | null
          rep_name?: string | null
          status?: string | null
          store_id?: string
          store_name?: string
          store_notice?: string | null
          sub_category?: string[] | null
          tel_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          is_active: boolean
          name: string
          target_amount: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          target_amount?: number | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          target_amount?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          is_active: boolean
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_praises: {
        Row: {
          comment: string | null
          created_at: string
          employee_name: string
          employee_phone: string
          id: string
          praiser_user_id: string
          tags: string[]
        }
        Insert: {
          comment?: string | null
          created_at?: string
          employee_name: string
          employee_phone: string
          id?: string
          praiser_user_id: string
          tags?: string[]
        }
        Update: {
          comment?: string | null
          created_at?: string
          employee_name?: string
          employee_phone?: string
          id?: string
          praiser_user_id?: string
          tags?: string[]
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          department: string | null
          employee_type: Database["public"]["Enums"]["employee_type"]
          end_date: string | null
          external_id: string | null
          hourly_rate: number | null
          id: string
          insurance_employment: boolean | null
          insurance_health: boolean | null
          insurance_industrial: boolean | null
          insurance_national_pension: boolean | null
          memo: string | null
          monthly_salary: number | null
          name: string
          phone: string | null
          position: string | null
          salary_day: number | null
          source: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
          weekly_hours: number | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          employee_type?: Database["public"]["Enums"]["employee_type"]
          end_date?: string | null
          external_id?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_employment?: boolean | null
          insurance_health?: boolean | null
          insurance_industrial?: boolean | null
          insurance_national_pension?: boolean | null
          memo?: string | null
          monthly_salary?: number | null
          name: string
          phone?: string | null
          position?: string | null
          salary_day?: number | null
          source?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
          weekly_hours?: number | null
        }
        Update: {
          created_at?: string
          department?: string | null
          employee_type?: Database["public"]["Enums"]["employee_type"]
          end_date?: string | null
          external_id?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_employment?: boolean | null
          insurance_health?: boolean | null
          insurance_industrial?: boolean | null
          insurance_national_pension?: boolean | null
          memo?: string | null
          monthly_salary?: number | null
          name?: string
          phone?: string | null
          position?: string | null
          salary_day?: number | null
          source?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          weekly_hours?: number | null
        }
        Relationships: []
      }
      hometax_sync_status: {
        Row: {
          created_at: string
          id: string
          last_sync_at: string | null
          purchase_count: number | null
          sales_count: number | null
          sync_error: string | null
          sync_status: string | null
          total_purchase_amount: number | null
          total_sales_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          purchase_count?: number | null
          sales_count?: number | null
          sync_error?: string | null
          sync_status?: string | null
          total_purchase_amount?: number | null
          total_sales_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          purchase_count?: number | null
          sales_count?: number | null
          sync_error?: string | null
          sync_status?: string | null
          total_purchase_amount?: number | null
          total_sales_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intent_keywords: {
        Row: {
          created_at: string
          description: string | null
          id: string
          intent: string
          intent_label: string
          is_active: boolean
          keywords: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          intent: string
          intent_label: string
          is_active?: boolean
          keywords?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          intent?: string
          intent_label?: string
          is_active?: boolean
          keywords?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_connected: boolean | null
          account_connected_at: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          briefing_frequency: string | null
          briefing_times: Json | null
          business_name: string | null
          business_registration_number: string | null
          business_type: string | null
          card_connected: boolean | null
          card_connected_at: string | null
          created_at: string
          hometax_connected: boolean | null
          hometax_connected_at: string | null
          id: string
          is_banned: boolean
          large_transaction_threshold: number
          name: string | null
          nickname: string | null
          phone: string | null
          phone_alert_custom_days: Json | null
          phone_alert_custom_message: string | null
          phone_alert_custom_repeat: boolean | null
          phone_alert_custom_time: string | null
          phone_alert_enabled: boolean | null
          phone_alert_items: Json | null
          phone_alert_times: Json | null
          priority_metrics: Json | null
          salary_day: number | null
          salary_reminder_days: number | null
          secretary_avatar_url: string | null
          secretary_gender: string | null
          secretary_name: string | null
          secretary_phone: string | null
          secretary_phone_verified: boolean | null
          secretary_tone: string | null
          secretary_voice_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_connected?: boolean | null
          account_connected_at?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          briefing_frequency?: string | null
          briefing_times?: Json | null
          business_name?: string | null
          business_registration_number?: string | null
          business_type?: string | null
          card_connected?: boolean | null
          card_connected_at?: string | null
          created_at?: string
          hometax_connected?: boolean | null
          hometax_connected_at?: string | null
          id?: string
          is_banned?: boolean
          large_transaction_threshold?: number
          name?: string | null
          nickname?: string | null
          phone?: string | null
          phone_alert_custom_days?: Json | null
          phone_alert_custom_message?: string | null
          phone_alert_custom_repeat?: boolean | null
          phone_alert_custom_time?: string | null
          phone_alert_enabled?: boolean | null
          phone_alert_items?: Json | null
          phone_alert_times?: Json | null
          priority_metrics?: Json | null
          salary_day?: number | null
          salary_reminder_days?: number | null
          secretary_avatar_url?: string | null
          secretary_gender?: string | null
          secretary_name?: string | null
          secretary_phone?: string | null
          secretary_phone_verified?: boolean | null
          secretary_tone?: string | null
          secretary_voice_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_connected?: boolean | null
          account_connected_at?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          briefing_frequency?: string | null
          briefing_times?: Json | null
          business_name?: string | null
          business_registration_number?: string | null
          business_type?: string | null
          card_connected?: boolean | null
          card_connected_at?: string | null
          created_at?: string
          hometax_connected?: boolean | null
          hometax_connected_at?: string | null
          id?: string
          is_banned?: boolean
          large_transaction_threshold?: number
          name?: string | null
          nickname?: string | null
          phone?: string | null
          phone_alert_custom_days?: Json | null
          phone_alert_custom_message?: string | null
          phone_alert_custom_repeat?: boolean | null
          phone_alert_custom_time?: string | null
          phone_alert_enabled?: boolean | null
          phone_alert_items?: Json | null
          phone_alert_times?: Json | null
          priority_metrics?: Json | null
          salary_day?: number | null
          salary_reminder_days?: number | null
          secretary_avatar_url?: string | null
          secretary_gender?: string | null
          secretary_name?: string | null
          secretary_phone?: string | null
          secretary_phone_verified?: boolean | null
          secretary_tone?: string | null
          secretary_voice_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          target_roles: string[] | null
          target_type: string
          target_user_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          target_roles?: string[] | null
          target_type?: string
          target_user_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          target_roles?: string[] | null
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      savings_accounts: {
        Row: {
          amount: number
          bank_name: string | null
          created_at: string
          id: string
          interest_rate: number
          is_active: boolean
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          interest_rate?: number
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          interest_rate?: number
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_faq: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean
          keywords: string[]
          priority: number
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          priority?: number
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          priority?: number
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          instance_id: string
          job_type: string
          max_retries: number
          records_fetched: number | null
          records_saved: number | null
          retry_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["sync_job_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          instance_id: string
          job_type?: string
          max_retries?: number
          records_fetched?: number | null
          records_saved?: number | null
          retry_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string
          job_type?: string
          max_retries?: number
          records_fetched?: number | null
          records_saved?: number | null
          retry_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_job_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "connector_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          level: string
          message: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          level?: string
          message: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          level?: string
          message?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_invoices: {
        Row: {
          buyer_business_number: string | null
          buyer_name: string | null
          created_at: string
          id: string
          invoice_date: string
          invoice_type: string
          issue_id: string | null
          item_name: string | null
          supplier_business_number: string | null
          supplier_name: string | null
          supply_amount: number
          synced_at: string
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_business_number?: string | null
          buyer_name?: string | null
          created_at?: string
          id?: string
          invoice_date: string
          invoice_type: string
          issue_id?: string | null
          item_name?: string | null
          supplier_business_number?: string | null
          supplier_name?: string | null
          supply_amount?: number
          synced_at?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          buyer_business_number?: string | null
          buyer_name?: string | null
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_type?: string
          issue_id?: string | null
          item_name?: string | null
          supplier_business_number?: string | null
          supplier_name?: string | null
          supply_amount?: number
          synced_at?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          category_icon: string | null
          classification_confidence: string | null
          created_at: string
          description: string
          external_tx_id: string | null
          id: string
          is_manually_classified: boolean | null
          memo: string | null
          merchant_category: string | null
          merchant_name: string | null
          source_account: string | null
          source_name: string | null
          source_type: string
          sub_category: string | null
          synced_at: string | null
          transaction_date: string
          transaction_time: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          category_icon?: string | null
          classification_confidence?: string | null
          created_at?: string
          description: string
          external_tx_id?: string | null
          id?: string
          is_manually_classified?: boolean | null
          memo?: string | null
          merchant_category?: string | null
          merchant_name?: string | null
          source_account?: string | null
          source_name?: string | null
          source_type: string
          sub_category?: string | null
          synced_at?: string | null
          transaction_date: string
          transaction_time?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          category_icon?: string | null
          classification_confidence?: string | null
          created_at?: string
          description?: string
          external_tx_id?: string | null
          id?: string
          is_manually_classified?: boolean | null
          memo?: string | null
          merchant_category?: string | null
          merchant_name?: string | null
          source_account?: string | null
          source_name?: string | null
          source_type?: string
          sub_category?: string | null
          synced_at?: string | null
          transaction_date?: string
          transaction_time?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          admin_notes: string | null
          category: string
          content: string
          created_at: string
          id: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          category?: string
          content: string
          created_at?: string
          id?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
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
      app_role: "owner" | "manager" | "employee" | "admin"
      connector_status:
        | "pending"
        | "connected"
        | "failed"
        | "expired"
        | "disconnected"
      employee_type: "정규직" | "계약직" | "알바"
      sync_job_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
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
      app_role: ["owner", "manager", "employee", "admin"],
      connector_status: [
        "pending",
        "connected",
        "failed",
        "expired",
        "disconnected",
      ],
      employee_type: ["정규직", "계약직", "알바"],
      sync_job_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
