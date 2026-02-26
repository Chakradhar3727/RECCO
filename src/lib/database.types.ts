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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          previous_data: Json | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          previous_data?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          previous_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          admin_id: string | null
          expires_at: string
          id: string
          last_active_at: string | null
          session_token: string
        }
        Insert: {
          admin_id?: string | null
          expires_at: string
          id?: string
          last_active_at?: string | null
          session_token: string
        }
        Update: {
          admin_id?: string | null
          expires_at?: string
          id?: string
          last_active_at?: string | null
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      aggregator_profiles: {
        Row: {
          aggregator_id_code: string
          bank_details: Json | null
          current_rating: number | null
          id: string
          pin_hash: string | null
          total_collections: number | null
          total_weight_kg: number | null
        }
        Insert: {
          aggregator_id_code: string
          bank_details?: Json | null
          current_rating?: number | null
          id: string
          pin_hash?: string | null
          total_collections?: number | null
          total_weight_kg?: number | null
        }
        Update: {
          aggregator_id_code?: string
          bank_details?: Json | null
          current_rating?: number | null
          id?: string
          pin_hash?: string | null
          total_collections?: number | null
          total_weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aggregator_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      aggregator_scorecards: {
        Row: {
          aggregator_id: string | null
          compliance_score: number | null
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          verification_rate: number | null
        }
        Insert: {
          aggregator_id?: string | null
          compliance_score?: number | null
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          verification_rate?: number | null
        }
        Update: {
          aggregator_id?: string | null
          compliance_score?: number | null
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          verification_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aggregator_scorecards_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "aggregator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_checkpoints: {
        Row: {
          batch_id: string | null
          cp1_gps_lat: number | null
          cp1_gps_lng: number | null
          cp1_hash: string | null
          cp1_input_weight: number | null
          cp1_scale_photo_url: string | null
          cp2_hash: string | null
          cp2_video_url: string | null
          cp3_gps_lat: number | null
          cp3_gps_lng: number | null
          cp3_hash: string | null
          cp3_output_weight: number | null
          cp3_scale_photo_url: string | null
          created_at: string | null
          id: string
          processing_duration_mins: number | null
          weight_loss_percent: number | null
        }
        Insert: {
          batch_id?: string | null
          cp1_gps_lat?: number | null
          cp1_gps_lng?: number | null
          cp1_hash?: string | null
          cp1_input_weight?: number | null
          cp1_scale_photo_url?: string | null
          cp2_hash?: string | null
          cp2_video_url?: string | null
          cp3_gps_lat?: number | null
          cp3_gps_lng?: number | null
          cp3_hash?: string | null
          cp3_output_weight?: number | null
          cp3_scale_photo_url?: string | null
          created_at?: string | null
          id?: string
          processing_duration_mins?: number | null
          weight_loss_percent?: number | null
        }
        Update: {
          batch_id?: string | null
          cp1_gps_lat?: number | null
          cp1_gps_lng?: number | null
          cp1_hash?: string | null
          cp1_input_weight?: number | null
          cp1_scale_photo_url?: string | null
          cp2_hash?: string | null
          cp2_video_url?: string | null
          cp3_gps_lat?: number | null
          cp3_gps_lng?: number | null
          cp3_hash?: string | null
          cp3_output_weight?: number | null
          cp3_scale_photo_url?: string | null
          created_at?: string | null
          id?: string
          processing_duration_mins?: number | null
          weight_loss_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_checkpoints_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_collections: {
        Row: {
          batch_id: string
          collection_id: string
        }
        Insert: {
          batch_id: string
          collection_id: string
        }
        Update: {
          batch_id?: string
          collection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_collections_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_transport_events: {
        Row: {
          batch_id: string | null
          created_at: string | null
          device_fingerprint: string | null
          event_hash: string | null
          event_type: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          idempotency_key: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          event_hash?: string | null
          event_type: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          idempotency_key?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          event_hash?: string | null
          event_type?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          idempotency_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_transport_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          aggregator_id: string | null
          batch_qr_payload: string | null
          chase_count: number | null
          chase_last_at: string | null
          created_at: string | null
          id: string
          pickup_window_end: string | null
          pickup_window_start: string | null
          recycler_id: string | null
          reschedule_count: number | null
          status: Database["public"]["Enums"]["batch_status"] | null
        }
        Insert: {
          aggregator_id?: string | null
          batch_qr_payload?: string | null
          chase_count?: number | null
          chase_last_at?: string | null
          created_at?: string | null
          id?: string
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          recycler_id?: string | null
          reschedule_count?: number | null
          status?: Database["public"]["Enums"]["batch_status"] | null
        }
        Update: {
          aggregator_id?: string | null
          batch_qr_payload?: string | null
          chase_count?: number | null
          chase_last_at?: string | null
          created_at?: string | null
          id?: string
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          recycler_id?: string | null
          reschedule_count?: number | null
          status?: Database["public"]["Enums"]["batch_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "aggregator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_recycler_id_fkey"
            columns: ["recycler_id"]
            isOneToOne: false
            referencedRelation: "recycler_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          aggregator_id: string | null
          collection_hash: string | null
          created_at: string | null
          fraud_flags: Json | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          material_grade: string | null
          material_type: string | null
          median_weight: number | null
          ocr_weight_1: number | null
          ocr_weight_2: number | null
          ocr_weight_3: number | null
          photo_url_1: string | null
          photo_url_2: string | null
          photo_url_3: string | null
          status: string | null
        }
        Insert: {
          aggregator_id?: string | null
          collection_hash?: string | null
          created_at?: string | null
          fraud_flags?: Json | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          material_grade?: string | null
          material_type?: string | null
          median_weight?: number | null
          ocr_weight_1?: number | null
          ocr_weight_2?: number | null
          ocr_weight_3?: number | null
          photo_url_1?: string | null
          photo_url_2?: string | null
          photo_url_3?: string | null
          status?: string | null
        }
        Update: {
          aggregator_id?: string | null
          collection_hash?: string | null
          created_at?: string | null
          fraud_flags?: Json | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          material_grade?: string | null
          material_type?: string | null
          median_weight?: number | null
          ocr_weight_1?: number | null
          ocr_weight_2?: number | null
          ocr_weight_3?: number | null
          photo_url_1?: string | null
          photo_url_2?: string | null
          photo_url_3?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "aggregator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      epr_certificates: {
        Row: {
          batch_id: string | null
          blockchain_tx_hash: string | null
          created_at: string | null
          current_owner_id: string | null
          id: string
          issuer_id: string | null
          lab_status: Database["public"]["Enums"]["lab_status"] | null
          material_type: string
          nft_token_id: string | null
          trust_score: number | null
          weight_mt: number
        }
        Insert: {
          batch_id?: string | null
          blockchain_tx_hash?: string | null
          created_at?: string | null
          current_owner_id?: string | null
          id?: string
          issuer_id?: string | null
          lab_status?: Database["public"]["Enums"]["lab_status"] | null
          material_type: string
          nft_token_id?: string | null
          trust_score?: number | null
          weight_mt: number
        }
        Update: {
          batch_id?: string | null
          blockchain_tx_hash?: string | null
          created_at?: string | null
          current_owner_id?: string | null
          id?: string
          issuer_id?: string | null
          lab_status?: Database["public"]["Enums"]["lab_status"] | null
          material_type?: string
          nft_token_id?: string | null
          trust_score?: number | null
          weight_mt?: number
        }
        Relationships: [
          {
            foreignKeyName: "epr_certificates_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: true
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epr_certificates_current_owner_id_fkey"
            columns: ["current_owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epr_certificates_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "recycler_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          created_at: string | null
          entity_id: string | null
          evidence_data: Json | null
          flag_type: string
          id: string
          is_resolved: boolean | null
          severity: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          evidence_data?: Json | null
          flag_type: string
          id?: string
          is_resolved?: boolean | null
          severity?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          evidence_data?: Json | null
          flag_type?: string
          id?: string
          is_resolved?: boolean | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_flags_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          escrow_id: string | null
          id: string
          invoice_url: string | null
          platform_fee: number | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          escrow_id?: string | null
          id?: string
          invoice_url?: string | null
          platform_fee?: number | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          escrow_id?: string | null
          id?: string
          invoice_url?: string | null
          platform_fee?: number | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "payment_escrows"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          cert_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          listing_valid_until: string | null
          price_per_mt: number
        }
        Insert: {
          cert_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          listing_valid_until?: string | null
          price_per_mt: number
        }
        Update: {
          cert_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          listing_valid_until?: string | null
          price_per_mt?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_cert_id_fkey"
            columns: ["cert_id"]
            isOneToOne: true
            referencedRelation: "epr_certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_purchases: {
        Row: {
          blockchain_transfer_hash: string | null
          buyer_id: string | null
          cert_id: string | null
          created_at: string | null
          escrow_id: string | null
          id: string
          purchase_price: number | null
          seller_id: string | null
        }
        Insert: {
          blockchain_transfer_hash?: string | null
          buyer_id?: string | null
          cert_id?: string | null
          created_at?: string | null
          escrow_id?: string | null
          id?: string
          purchase_price?: number | null
          seller_id?: string | null
        }
        Update: {
          blockchain_transfer_hash?: string | null
          buyer_id?: string | null
          cert_id?: string | null
          created_at?: string | null
          escrow_id?: string | null
          id?: string
          purchase_price?: number | null
          seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_purchases_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_purchases_cert_id_fkey"
            columns: ["cert_id"]
            isOneToOne: false
            referencedRelation: "epr_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_purchases_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "payment_escrows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_purchases_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_failures: {
        Row: {
          created_at: string | null
          id: string
          last_error: string | null
          next_retry_at: string | null
          notification_id: string | null
          retry_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          notification_id?: string | null
          retry_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          notification_id?: string | null
          retry_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_failures_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_escrows: {
        Row: {
          aggregator_id: string | null
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          pibo_id: string | null
          recycler_id: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["escrow_status"] | null
          transaction_id: string | null
        }
        Insert: {
          aggregator_id?: string | null
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          pibo_id?: string | null
          recycler_id?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["escrow_status"] | null
          transaction_id?: string | null
        }
        Update: {
          aggregator_id?: string | null
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          pibo_id?: string | null
          recycler_id?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["escrow_status"] | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_escrows_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "aggregator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_escrows_pibo_id_fkey"
            columns: ["pibo_id"]
            isOneToOne: false
            referencedRelation: "pibo_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_escrows_recycler_id_fkey"
            columns: ["recycler_id"]
            isOneToOne: false
            referencedRelation: "recycler_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      pibo_entities: {
        Row: {
          annual_obligation_mt: number | null
          company_name: string
          compliance_gap_mt: number | null
          current_compliance_mt: number | null
          gst_number: string | null
          id: string
          pibo_type: string
        }
        Insert: {
          annual_obligation_mt?: number | null
          company_name: string
          compliance_gap_mt?: number | null
          current_compliance_mt?: number | null
          gst_number?: string | null
          id: string
          pibo_type: string
        }
        Update: {
          annual_obligation_mt?: number | null
          company_name?: string
          compliance_gap_mt?: number | null
          current_compliance_mt?: number | null
          gst_number?: string | null
          id?: string
          pibo_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pibo_entities_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_clients: {
        Row: {
          client_id: string | null
          consent_token: string | null
          consent_token_expires_at: string
          created_at: string | null
          id: string
          is_active: boolean | null
          pro_id: string | null
        }
        Insert: {
          client_id?: string | null
          consent_token?: string | null
          consent_token_expires_at?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pro_id?: string | null
        }
        Update: {
          client_id?: string | null
          consent_token?: string | null
          consent_token_expires_at?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pro_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pro_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pibo_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_clients_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "pro_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_organisations: {
        Row: {
          cpcb_reg_number: string | null
          id: string
          org_name: string
          total_pool_mt: number | null
          unallocated_mt: number | null
        }
        Insert: {
          cpcb_reg_number?: string | null
          id: string
          org_name: string
          total_pool_mt?: number | null
          unallocated_mt?: number | null
        }
        Update: {
          cpcb_reg_number?: string | null
          id?: string
          org_name?: string
          total_pool_mt?: number | null
          unallocated_mt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pro_organisations_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recycler_documents: {
        Row: {
          doc_type: string
          doc_url: string
          expiry_date: string | null
          facility_id: string | null
          id: string
          is_verified: boolean | null
          ocr_raw_data: Json | null
          verified_at: string | null
        }
        Insert: {
          doc_type: string
          doc_url: string
          expiry_date?: string | null
          facility_id?: string | null
          id?: string
          is_verified?: boolean | null
          ocr_raw_data?: Json | null
          verified_at?: string | null
        }
        Update: {
          doc_type?: string
          doc_url?: string
          expiry_date?: string | null
          facility_id?: string | null
          id?: string
          is_verified?: boolean | null
          ocr_raw_data?: Json | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recycler_documents_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "recycler_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      recycler_facilities: {
        Row: {
          address_text: string | null
          capacity_mt_per_month: number | null
          current_processing_load: number | null
          facility_name: string
          facility_qr_payload: string | null
          geo_location: unknown
          id: string
          is_active: boolean | null
          owner_id: string | null
        }
        Insert: {
          address_text?: string | null
          capacity_mt_per_month?: number | null
          current_processing_load?: number | null
          facility_name: string
          facility_qr_payload?: string | null
          geo_location?: unknown
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
        }
        Update: {
          address_text?: string | null
          capacity_mt_per_month?: number | null
          current_processing_load?: number | null
          facility_name?: string
          facility_qr_payload?: string | null
          geo_location?: unknown
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recycler_facilities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          last_updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          last_updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          last_updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          fraud_score: number | null
          full_name: string | null
          id: string
          is_approved: boolean | null
          last_active_at: string | null
          phone_number: string | null
          portal_role: Database["public"]["Enums"]["portal_type"]
        }
        Insert: {
          created_at?: string | null
          email: string
          fraud_score?: number | null
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          last_active_at?: string | null
          phone_number?: string | null
          portal_role: Database["public"]["Enums"]["portal_type"]
        }
        Update: {
          created_at?: string | null
          email?: string
          fraud_score?: number | null
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          last_active_at?: string | null
          phone_number?: string | null
          portal_role?: Database["public"]["Enums"]["portal_type"]
        }
        Relationships: []
      }
      weight_disputes: {
        Row: {
          admin_decision: string | null
          agg_weight: number | null
          aggregator_id: string | null
          batch_id: string | null
          created_at: string | null
          id: string
          rec_weight: number | null
          recycler_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          sla_deadline: string | null
          variance_percent: number | null
        }
        Insert: {
          admin_decision?: string | null
          agg_weight?: number | null
          aggregator_id?: string | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          rec_weight?: number | null
          recycler_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          variance_percent?: number | null
        }
        Update: {
          admin_decision?: string | null
          agg_weight?: number | null
          aggregator_id?: string | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          rec_weight?: number | null
          recycler_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          variance_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weight_disputes_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "aggregator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weight_disputes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: true
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weight_disputes_recycler_id_fkey"
            columns: ["recycler_id"]
            isOneToOne: false
            referencedRelation: "recycler_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      purchase_certificate_weight: {
        Args: { p_buyer_id: string; p_cert_id: string; p_price: number }
        Returns: string
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      batch_status:
        | "CREATED"
        | "AWAITING_ACKNOWLEDGMENT"
        | "RESCHEDULED"
        | "ACKNOWLEDGED"
        | "PICKED_UP"
        | "IN_TRANSIT"
        | "ARRIVED"
        | "IN_PROCESSING"
        | "COMPLETE"
        | "ISSUED"
      escrow_status: "HELD" | "RELEASED" | "REFUNDED" | "DISPUTED"
      lab_status: "NONE" | "UPLOADED" | "NABL_VERIFIED" | "SELF_DECLARED"
      portal_type: "ADMIN" | "AGGREGATOR" | "RECYCLER" | "PIBO" | "PRO"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      batch_status: [
        "CREATED",
        "AWAITING_ACKNOWLEDGMENT",
        "RESCHEDULED",
        "ACKNOWLEDGED",
        "PICKED_UP",
        "IN_TRANSIT",
        "ARRIVED",
        "IN_PROCESSING",
        "COMPLETE",
        "ISSUED",
      ],
      escrow_status: ["HELD", "RELEASED", "REFUNDED", "DISPUTED"],
      lab_status: ["NONE", "UPLOADED", "NABL_VERIFIED", "SELF_DECLARED"],
      portal_type: ["ADMIN", "AGGREGATOR", "RECYCLER", "PIBO", "PRO"],
    },
  },
} as const
