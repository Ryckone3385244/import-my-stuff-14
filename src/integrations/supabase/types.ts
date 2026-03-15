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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agenda_sessions: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          end_time: string
          id: string
          room: string | null
          session_date: string
          session_type: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          venue: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          room?: string | null
          session_date: string
          session_type?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
          venue: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          room?: string | null
          session_date?: string
          session_type?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      blocked_inquiry_emails: {
        Row: {
          blocked_by: string | null
          created_at: string
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      credentials_log: {
        Row: {
          created_at: string
          email: string
          entity_id: string
          entity_name: string
          entity_type: string
          generated_at: string
          generated_by: string | null
          generation_type: string
          id: string
          password_plain: string
        }
        Insert: {
          created_at?: string
          email: string
          entity_id: string
          entity_name: string
          entity_type: string
          generated_at?: string
          generated_by?: string | null
          generation_type?: string
          id?: string
          password_plain: string
        }
        Update: {
          created_at?: string
          email?: string
          entity_id?: string
          entity_name?: string
          entity_type?: string
          generated_at?: string
          generated_by?: string | null
          generation_type?: string
          id?: string
          password_plain?: string
        }
        Relationships: []
      }
      customer_managers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          meeting_url: string | null
          name: string
          phone: string
          role: string
          show_calendly: boolean
          show_email: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          meeting_url?: string | null
          name: string
          phone: string
          role?: string
          show_calendly?: boolean
          show_email?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          meeting_url?: string | null
          name?: string
          phone?: string
          role?: string
          show_calendly?: boolean
          show_email?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      draft_sessions: {
        Row: {
          admin_notes: string | null
          created_at: string
          end_time: string | null
          id: string
          published_session_id: string | null
          room: string | null
          seminar_description: string | null
          seminar_title: string
          session_date: string | null
          session_type: string | null
          speaker_id: string
          start_time: string | null
          status: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          published_session_id?: string | null
          room?: string | null
          seminar_description?: string | null
          seminar_title: string
          session_date?: string | null
          session_type?: string | null
          speaker_id: string
          start_time?: string | null
          status?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          published_session_id?: string | null
          room?: string | null
          seminar_description?: string | null
          seminar_title?: string
          session_date?: string | null
          session_type?: string | null
          speaker_id?: string
          start_time?: string | null
          status?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_sessions_published_session_id_fkey"
            columns: ["published_session_id"]
            isOneToOne: false
            referencedRelation: "agenda_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_sessions_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      element_motion: {
        Row: {
          created_at: string
          effect_config: Json
          effect_type: string
          element_id: string
          id: string
          page_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effect_config?: Json
          effect_type?: string
          element_id: string
          id?: string
          page_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effect_config?: Json
          effect_type?: string
          element_id?: string
          id?: string
          page_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      element_styles: {
        Row: {
          created_at: string
          element_id: string
          id: string
          page_name: string
          styles: Json
          updated_at: string
          viewport: string
        }
        Insert: {
          created_at?: string
          element_id: string
          id?: string
          page_name: string
          styles?: Json
          updated_at?: string
          viewport?: string
        }
        Update: {
          created_at?: string
          element_id?: string
          id?: string
          page_name?: string
          styles?: Json
          updated_at?: string
          viewport?: string
        }
        Relationships: []
      }
      email_deadlines: {
        Row: {
          created_at: string
          deadline_date: string
          deadline_order: number
          description: string
          id: string
          is_active: boolean
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline_date: string
          deadline_order?: number
          description: string
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline_date?: string
          deadline_order?: number
          description?: string
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          banner_background_color: string | null
          banner_image_url: string | null
          created_at: string
          id: string
          is_active: boolean
          page_background_color: string | null
          portal_url: string
          subject: string | null
          template_type: string
          updated_at: string
          welcome_text: string
        }
        Insert: {
          banner_background_color?: string | null
          banner_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          page_background_color?: string | null
          portal_url: string
          subject?: string | null
          template_type: string
          updated_at?: string
          welcome_text?: string
        }
        Update: {
          banner_background_color?: string | null
          banner_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          page_background_color?: string | null
          portal_url?: string
          subject?: string | null
          template_type?: string
          updated_at?: string
          welcome_text?: string
        }
        Relationships: []
      }
      event_settings: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          address_line_3: string | null
          advert_submission_deadline: string | null
          contact_email: string | null
          contact_phone: string | null
          copyright_text: string | null
          created_at: string
          event_date: string
          event_domain: string | null
          event_name: string
          event_status: string
          exhibitor_form_embed: string | null
          facebook_url: string | null
          favicon_url: string | null
          floorplan_url: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          location: string
          logo_url: string | null
          organiser_info: string | null
          popup_enabled: boolean | null
          popup_image_url: string | null
          popup_link_url: string | null
          register_event_form_embed: string | null
          register_interest_form_embed: string | null
          resend_from_domain: string | null
          resend_from_name: string | null
          showguide_listing_deadline: string | null
          space_only_deadline: string | null
          speaker_form_deadline: string | null
          tagline: string
          thumbnail_url: string | null
          ticker_enabled: boolean | null
          ticker_link_text: string | null
          ticker_link_url: string | null
          ticker_text: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          address_line_3?: string | null
          advert_submission_deadline?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          copyright_text?: string | null
          created_at?: string
          event_date?: string
          event_domain?: string | null
          event_name?: string
          event_status?: string
          exhibitor_form_embed?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          floorplan_url?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          location?: string
          logo_url?: string | null
          organiser_info?: string | null
          popup_enabled?: boolean | null
          popup_image_url?: string | null
          popup_link_url?: string | null
          register_event_form_embed?: string | null
          register_interest_form_embed?: string | null
          resend_from_domain?: string | null
          resend_from_name?: string | null
          showguide_listing_deadline?: string | null
          space_only_deadline?: string | null
          speaker_form_deadline?: string | null
          tagline?: string
          thumbnail_url?: string | null
          ticker_enabled?: boolean | null
          ticker_link_text?: string | null
          ticker_link_url?: string | null
          ticker_text?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          address_line_3?: string | null
          advert_submission_deadline?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          copyright_text?: string | null
          created_at?: string
          event_date?: string
          event_domain?: string | null
          event_name?: string
          event_status?: string
          exhibitor_form_embed?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          floorplan_url?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          location?: string
          logo_url?: string | null
          organiser_info?: string | null
          popup_enabled?: boolean | null
          popup_image_url?: string | null
          popup_link_url?: string | null
          register_event_form_embed?: string | null
          register_interest_form_embed?: string | null
          resend_from_domain?: string | null
          resend_from_name?: string | null
          showguide_listing_deadline?: string | null
          space_only_deadline?: string | null
          speaker_form_deadline?: string | null
          tagline?: string
          thumbnail_url?: string | null
          ticker_enabled?: boolean | null
          ticker_link_text?: string | null
          ticker_link_url?: string | null
          ticker_text?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      exhibitor_address: {
        Row: {
          approval_status: string | null
          city: string | null
          country: string | null
          created_at: string
          exhibitor_id: string
          id: string
          pending_changes: Json | null
          postcode: string | null
          street_line_1: string | null
          submitted_for_approval_at: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          exhibitor_id: string
          id?: string
          pending_changes?: Json | null
          postcode?: string | null
          street_line_1?: string | null
          submitted_for_approval_at?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          exhibitor_id?: string
          id?: string
          pending_changes?: Json | null
          postcode?: string | null
          street_line_1?: string | null
          submitted_for_approval_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_address_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: true
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_advert_submissions: {
        Row: {
          approval_status: string | null
          created_at: string | null
          exhibitor_id: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          created_at?: string | null
          exhibitor_id: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          created_at?: string | null
          exhibitor_id?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_advert_submissions_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_contacts: {
        Row: {
          approval_status: string | null
          created_at: string
          email: string
          exhibitor_id: string
          full_name: string
          id: string
          is_active: boolean
          is_main_contact: boolean
          job_title: string | null
          pending_changes: Json | null
          profile_picture_url: string | null
          submitted_for_approval_at: string | null
          telephone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approval_status?: string | null
          created_at?: string
          email: string
          exhibitor_id: string
          full_name: string
          id?: string
          is_active?: boolean
          is_main_contact?: boolean
          job_title?: string | null
          pending_changes?: Json | null
          profile_picture_url?: string | null
          submitted_for_approval_at?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approval_status?: string | null
          created_at?: string
          email?: string
          exhibitor_id?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_main_contact?: boolean
          job_title?: string | null
          pending_changes?: Json | null
          profile_picture_url?: string | null
          submitted_for_approval_at?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_contacts_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_inquiries: {
        Row: {
          admin_notes: string | null
          created_at: string
          exhibitor_id: string
          id: string
          message: string
          status: string
          updated_at: string
          visitor_company: string | null
          visitor_email: string
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          exhibitor_id: string
          id?: string
          message: string
          status?: string
          updated_at?: string
          visitor_company?: string | null
          visitor_email: string
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          exhibitor_id?: string
          id?: string
          message?: string
          status?: string
          updated_at?: string
          visitor_company?: string | null
          visitor_email?: string
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_inquiries_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_products: {
        Row: {
          approval_status: string | null
          created_at: string
          description: string | null
          exhibitor_id: string
          id: string
          image_url: string | null
          pending_changes: Json | null
          product_name: string
          submitted_for_approval_at: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          created_at?: string
          description?: string | null
          exhibitor_id: string
          id?: string
          image_url?: string | null
          pending_changes?: Json | null
          product_name: string
          submitted_for_approval_at?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          created_at?: string
          description?: string | null
          exhibitor_id?: string
          id?: string
          image_url?: string | null
          pending_changes?: Json | null
          product_name?: string
          submitted_for_approval_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_products_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_social_media: {
        Row: {
          approval_status: string | null
          created_at: string
          exhibitor_id: string
          facebook: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          pending_changes: Json | null
          submitted_for_approval_at: string | null
          tiktok: string | null
          updated_at: string
          youtube: string | null
        }
        Insert: {
          approval_status?: string | null
          created_at?: string
          exhibitor_id: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          pending_changes?: Json | null
          submitted_for_approval_at?: string | null
          tiktok?: string | null
          updated_at?: string
          youtube?: string | null
        }
        Update: {
          approval_status?: string | null
          created_at?: string
          exhibitor_id?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          pending_changes?: Json | null
          submitted_for_approval_at?: string | null
          tiktok?: string | null
          updated_at?: string
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_social_media_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: true
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_speaker_headshots: {
        Row: {
          approval_status: string | null
          created_at: string | null
          exhibitor_id: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          created_at?: string | null
          exhibitor_id: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          created_at?: string | null
          exhibitor_id?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_speaker_headshots_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_speaker_submissions: {
        Row: {
          approval_status: string | null
          created_at: string | null
          exhibitor_id: string
          extracted_data: Json | null
          file_name: string
          file_type: string
          file_url: string
          id: string
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          created_at?: string | null
          exhibitor_id: string
          extracted_data?: Json | null
          file_name: string
          file_type: string
          file_url: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          created_at?: string | null
          exhibitor_id?: string
          extracted_data?: Json | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_speaker_submissions_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitors: {
        Row: {
          account_number: string | null
          advert_submission_approved: boolean | null
          advertisement: boolean | null
          advertisement_details: string | null
          approval_status: string | null
          banner_url: string | null
          booth_length: number | null
          booth_number: string | null
          booth_width: number | null
          category: string | null
          company_profile: string | null
          created_at: string
          description: string | null
          event_status: string | null
          headshot_submission_approved: boolean | null
          id: string
          is_active: boolean
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          open_sides: number | null
          pending_changes: Json | null
          short_description: string | null
          show_contact_button: boolean
          showguide_entry: string | null
          speaker_submission_approved: boolean | null
          speaking_session: boolean | null
          speaking_session_details: string | null
          stand_type: string | null
          submitted_for_approval_at: string | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          account_number?: string | null
          advert_submission_approved?: boolean | null
          advertisement?: boolean | null
          advertisement_details?: string | null
          approval_status?: string | null
          banner_url?: string | null
          booth_length?: number | null
          booth_number?: string | null
          booth_width?: number | null
          category?: string | null
          company_profile?: string | null
          created_at?: string
          description?: string | null
          event_status?: string | null
          headshot_submission_approved?: boolean | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          open_sides?: number | null
          pending_changes?: Json | null
          short_description?: string | null
          show_contact_button?: boolean
          showguide_entry?: string | null
          speaker_submission_approved?: boolean | null
          speaking_session?: boolean | null
          speaking_session_details?: string | null
          stand_type?: string | null
          submitted_for_approval_at?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          account_number?: string | null
          advert_submission_approved?: boolean | null
          advertisement?: boolean | null
          advertisement_details?: string | null
          approval_status?: string | null
          banner_url?: string | null
          booth_length?: number | null
          booth_number?: string | null
          booth_width?: number | null
          category?: string | null
          company_profile?: string | null
          created_at?: string
          description?: string | null
          event_status?: string | null
          headshot_submission_approved?: boolean | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          open_sides?: number | null
          pending_changes?: Json | null
          short_description?: string | null
          show_contact_button?: boolean
          showguide_entry?: string | null
          speaker_submission_approved?: boolean | null
          speaking_session?: boolean | null
          speaking_session_details?: string | null
          stand_type?: string | null
          submitted_for_approval_at?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      footer_menu_items: {
        Row: {
          created_at: string
          depth: number
          id: string
          is_active: boolean
          is_custom: boolean
          label: string
          menu_order: number
          open_in_new_tab: boolean
          parent_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          depth?: number
          id?: string
          is_active?: boolean
          is_custom?: boolean
          label: string
          menu_order?: number
          open_in_new_tab?: boolean
          parent_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          depth?: number
          id?: string
          is_active?: boolean
          is_custom?: boolean
          label?: string
          menu_order?: number
          open_in_new_tab?: boolean
          parent_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "footer_menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "footer_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          created_at: string | null
          id: string
          photo_order: number
          photo_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_order?: number
          photo_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_order?: number
          photo_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      global_html_snippets: {
        Row: {
          after_body_start: string | null
          before_body_end: string | null
          before_head_end: string | null
          created_at: string
          custom_css: string | null
          id: string
          updated_at: string
        }
        Insert: {
          after_body_start?: string | null
          before_body_end?: string | null
          before_head_end?: string | null
          created_at?: string
          custom_css?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          after_body_start?: string | null
          before_body_end?: string | null
          before_head_end?: string | null
          created_at?: string
          custom_css?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_tools: {
        Row: {
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          social_platform: string | null
          social_url: string | null
          thumbnail_url: string | null
          title: string | null
          tool_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          social_platform?: string | null
          social_url?: string | null
          thumbnail_url?: string | null
          title?: string | null
          tool_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          social_platform?: string | null
          social_url?: string | null
          thumbnail_url?: string | null
          title?: string | null
          tool_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_library: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          height: number | null
          id: string
          mime_type: string | null
          title: string | null
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          height?: number | null
          id?: string
          mime_type?: string | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      navbar_menu_items: {
        Row: {
          created_at: string
          depth: number
          id: string
          is_active: boolean
          is_custom: boolean
          label: string
          menu_order: number
          open_in_new_tab: boolean
          parent_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          depth?: number
          id?: string
          is_active?: boolean
          is_custom?: boolean
          label: string
          menu_order?: number
          open_in_new_tab?: boolean
          parent_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          depth?: number
          id?: string
          is_active?: boolean
          is_custom?: boolean
          label?: string
          menu_order?: number
          open_in_new_tab?: boolean
          parent_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "navbar_menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navbar_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      page_content: {
        Row: {
          content_key: string
          content_type: string
          content_value: string
          created_at: string | null
          id: string
          page_name: string
          section_name: string
          updated_at: string | null
        }
        Insert: {
          content_key: string
          content_type?: string
          content_value: string
          created_at?: string | null
          id?: string
          page_name: string
          section_name: string
          updated_at?: string | null
        }
        Update: {
          content_key?: string
          content_type?: string
          content_value?: string
          created_at?: string | null
          id?: string
          page_name?: string
          section_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      page_section_order: {
        Row: {
          background_type: string | null
          background_value: string | null
          created_at: string
          id: string
          no_mobile_swap: boolean | null
          page_name: string
          section_id: string
          section_order: number
          status: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          background_type?: string | null
          background_value?: string | null
          created_at?: string
          id?: string
          no_mobile_swap?: boolean | null
          page_name: string
          section_id: string
          section_order: number
          status?: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          background_type?: string | null
          background_value?: string | null
          created_at?: string
          id?: string
          no_mobile_swap?: boolean | null
          page_name?: string
          section_id?: string
          section_order?: number
          status?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      page_versions: {
        Row: {
          column_order_snapshot: Json | null
          content_snapshot: Json
          created_at: string | null
          created_by: string | null
          id: string
          page_name: string
          section_order_snapshot: Json | null
          version_number: number | null
        }
        Insert: {
          column_order_snapshot?: Json | null
          content_snapshot?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          page_name: string
          section_order_snapshot?: Json | null
          version_number?: number | null
        }
        Update: {
          column_order_snapshot?: Json | null
          content_snapshot?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          page_name?: string
          section_order_snapshot?: Json | null
          version_number?: number | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page_path: string
          page_title: string | null
          session_id: string
          time_on_page: number | null
          viewed_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          page_title?: string | null
          session_id: string
          time_on_page?: number | null
          viewed_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          page_title?: string | null
          session_id?: string
          time_on_page?: number | null
          viewed_at?: string
        }
        Relationships: []
      }
      password_setup_tokens: {
        Row: {
          created_at: string | null
          entity_id: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      portal_menu_items: {
        Row: {
          created_at: string
          depth: number
          id: string
          is_active: boolean
          is_custom: boolean
          label: string
          menu_order: number
          open_in_new_tab: boolean
          parent_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          depth?: number
          id?: string
          is_active?: boolean
          is_custom?: boolean
          label: string
          menu_order?: number
          open_in_new_tab?: boolean
          parent_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          depth?: number
          id?: string
          is_active?: boolean
          is_custom?: boolean
          label?: string
          menu_order?: number
          open_in_new_tab?: boolean
          parent_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "portal_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          company: string
          created_at: string
          email: string
          has_accessed_floorplan: boolean | null
          id: string
          interest_type: string | null
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          has_accessed_floorplan?: boolean | null
          id?: string
          interest_type?: string | null
          name: string
          phone?: string | null
          role: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          has_accessed_floorplan?: boolean | null
          id?: string
          interest_type?: string | null
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      section_column_order: {
        Row: {
          card_color: string | null
          column_id: string
          column_order: number
          column_width: string | null
          created_at: string
          id: string
          page_name: string
          section_id: string
          show_border: boolean | null
          updated_at: string
          vertical_align: string | null
          visible: boolean
        }
        Insert: {
          card_color?: string | null
          column_id: string
          column_order: number
          column_width?: string | null
          created_at?: string
          id?: string
          page_name: string
          section_id: string
          show_border?: boolean | null
          updated_at?: string
          vertical_align?: string | null
          visible?: boolean
        }
        Update: {
          card_color?: string | null
          column_id?: string
          column_order?: number
          column_width?: string | null
          created_at?: string
          id?: string
          page_name?: string
          section_id?: string
          show_border?: boolean | null
          updated_at?: string
          vertical_align?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          created_at: string
          from_path: string
          id: string
          is_active: boolean | null
          is_pattern: boolean
          redirect_type: string
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_path: string
          id?: string
          is_active?: boolean | null
          is_pattern?: boolean
          redirect_type?: string
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_path?: string
          id?: string
          is_active?: boolean | null
          is_pattern?: boolean
          redirect_type?: string
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_speakers: {
        Row: {
          created_at: string
          id: string
          session_id: string
          speaker_id: string
          speaker_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          speaker_id: string
          speaker_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          speaker_id?: string
          speaker_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_speakers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agenda_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_speakers_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      show_suppliers: {
        Row: {
          button_text: string | null
          button_url: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      speaker_submissions: {
        Row: {
          admin_notes: string | null
          approval_status: string | null
          created_at: string
          extracted_data: Json | null
          id: string
          pdf_filename: string
          pdf_url: string
          reviewed_at: string | null
          reviewed_by: string | null
          speaker_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approval_status?: string | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          pdf_filename: string
          pdf_url: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          speaker_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approval_status?: string | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          pdf_filename?: string
          pdf_url?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          speaker_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_submissions_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      speakers: {
        Row: {
          bio: string | null
          company: string | null
          company_logo_url: string | null
          created_at: string
          email: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          linkedin_url: string | null
          name: string
          phone: string | null
          photo_url: string | null
          seminar_description: string | null
          seminar_title: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          company_logo_url?: string | null
          created_at?: string
          email?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          linkedin_url?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          seminar_description?: string | null
          seminar_title?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          company_logo_url?: string | null
          created_at?: string
          email?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          seminar_description?: string | null
          seminar_title?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      supplier_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_files_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "show_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          attachment_urls: string[] | null
          created_at: string
          exhibitor_id: string
          id: string
          message: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          attachment_urls?: string[] | null
          created_at?: string
          exhibitor_id: string
          id?: string
          message: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          attachment_urls?: string[] | null
          created_at?: string
          exhibitor_id?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          meeting_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          meeting_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          meeting_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          first_seen: string
          id: string
          last_seen: string
          os: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          os?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          os?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      website_pages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          page_name: string
          page_url: string
          renderer: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          status: Database["public"]["Enums"]["page_status"]
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          page_name: string
          page_url: string
          renderer?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          status?: Database["public"]["Enums"]["page_status"]
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          page_name?: string
          page_url?: string
          renderer?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          status?: Database["public"]["Enums"]["page_status"]
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      website_styles: {
        Row: {
          accent_color: string | null
          adobe_fonts_url: string | null
          background_color: string | null
          black_card_background_color: string | null
          black_card_text_color: string | null
          black_card_title_color: string | null
          border_radius: string | null
          button_2_border: string | null
          button_2_border_radius: string | null
          button_2_color: string | null
          button_2_font_size: string | null
          button_2_font_style: string | null
          button_2_font_weight: string | null
          button_2_padding: string | null
          button_2_text_color: string | null
          button_2_text_transform: string | null
          button_border: string | null
          button_border_radius: string | null
          button_color: string | null
          button_font_size: string | null
          button_font_style: string | null
          button_font_weight: string | null
          button_padding: string | null
          button_text_color: string | null
          button_text_transform: string | null
          card_background_color: string | null
          card_padding: string | null
          card_text_color: string | null
          card_title_color: string | null
          created_at: string
          font_family_body: string | null
          font_family_heading: string | null
          foreground_color: string | null
          google_fonts_url: string | null
          gradient_angle: string | null
          gradient_end_color: string | null
          gradient_start_color: string | null
          gray_card_background_color: string | null
          gray_card_text_color: string | null
          gray_card_title_color: string | null
          green_card_background_color: string | null
          green_card_text_color: string | null
          green_card_title_color: string | null
          h1_size: string | null
          h2_size: string | null
          h3_size: string | null
          h4_size: string | null
          h5_size: string | null
          h6_size: string | null
          heading_text_transform: string | null
          hero_title_size: string | null
          hero_title_size_mobile: string | null
          id: string
          image_border_radius: string | null
          image_padding: string | null
          muted_color: string | null
          navbar_menu_size: string | null
          primary_color: string | null
          secondary_color: string | null
          transparent_card_text_color: string | null
          transparent_card_title_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          adobe_fonts_url?: string | null
          background_color?: string | null
          black_card_background_color?: string | null
          black_card_text_color?: string | null
          black_card_title_color?: string | null
          border_radius?: string | null
          button_2_border?: string | null
          button_2_border_radius?: string | null
          button_2_color?: string | null
          button_2_font_size?: string | null
          button_2_font_style?: string | null
          button_2_font_weight?: string | null
          button_2_padding?: string | null
          button_2_text_color?: string | null
          button_2_text_transform?: string | null
          button_border?: string | null
          button_border_radius?: string | null
          button_color?: string | null
          button_font_size?: string | null
          button_font_style?: string | null
          button_font_weight?: string | null
          button_padding?: string | null
          button_text_color?: string | null
          button_text_transform?: string | null
          card_background_color?: string | null
          card_padding?: string | null
          card_text_color?: string | null
          card_title_color?: string | null
          created_at?: string
          font_family_body?: string | null
          font_family_heading?: string | null
          foreground_color?: string | null
          google_fonts_url?: string | null
          gradient_angle?: string | null
          gradient_end_color?: string | null
          gradient_start_color?: string | null
          gray_card_background_color?: string | null
          gray_card_text_color?: string | null
          gray_card_title_color?: string | null
          green_card_background_color?: string | null
          green_card_text_color?: string | null
          green_card_title_color?: string | null
          h1_size?: string | null
          h2_size?: string | null
          h3_size?: string | null
          h4_size?: string | null
          h5_size?: string | null
          h6_size?: string | null
          heading_text_transform?: string | null
          hero_title_size?: string | null
          hero_title_size_mobile?: string | null
          id?: string
          image_border_radius?: string | null
          image_padding?: string | null
          muted_color?: string | null
          navbar_menu_size?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          transparent_card_text_color?: string | null
          transparent_card_title_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          adobe_fonts_url?: string | null
          background_color?: string | null
          black_card_background_color?: string | null
          black_card_text_color?: string | null
          black_card_title_color?: string | null
          border_radius?: string | null
          button_2_border?: string | null
          button_2_border_radius?: string | null
          button_2_color?: string | null
          button_2_font_size?: string | null
          button_2_font_style?: string | null
          button_2_font_weight?: string | null
          button_2_padding?: string | null
          button_2_text_color?: string | null
          button_2_text_transform?: string | null
          button_border?: string | null
          button_border_radius?: string | null
          button_color?: string | null
          button_font_size?: string | null
          button_font_style?: string | null
          button_font_weight?: string | null
          button_padding?: string | null
          button_text_color?: string | null
          button_text_transform?: string | null
          card_background_color?: string | null
          card_padding?: string | null
          card_text_color?: string | null
          card_title_color?: string | null
          created_at?: string
          font_family_body?: string | null
          font_family_heading?: string | null
          foreground_color?: string | null
          google_fonts_url?: string | null
          gradient_angle?: string | null
          gradient_end_color?: string | null
          gradient_start_color?: string | null
          gray_card_background_color?: string | null
          gray_card_text_color?: string | null
          gray_card_title_color?: string | null
          green_card_background_color?: string | null
          green_card_text_color?: string | null
          green_card_title_color?: string | null
          h1_size?: string | null
          h2_size?: string | null
          h3_size?: string | null
          h4_size?: string | null
          h5_size?: string | null
          h6_size?: string | null
          heading_text_transform?: string | null
          hero_title_size?: string | null
          hero_title_size_mobile?: string | null
          id?: string
          image_border_radius?: string | null
          image_padding?: string | null
          muted_color?: string | null
          navbar_menu_size?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          transparent_card_text_color?: string | null
          transparent_card_title_color?: string | null
          updated_at?: string
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
      is_admin_or_cs_or_pm: { Args: { _user_id: string }; Returns: boolean }
      user_has_exhibitor_access: {
        Args: { _exhibitor_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "customer_service"
        | "project_manager"
        | "user"
        | "exhibitor"
        | "speaker"
      page_status: "published" | "draft"
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
        "admin",
        "customer_service",
        "project_manager",
        "user",
        "exhibitor",
        "speaker",
      ],
      page_status: ["published", "draft"],
    },
  },
} as const
