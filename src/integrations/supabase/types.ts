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
      event_films: {
        Row: {
          created_at: string
          event_id: string
          film_id: string
          role: string
        }
        Insert: {
          created_at?: string
          event_id: string
          film_id: string
          role?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          film_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_films_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_films_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          canonical_key: string | null
          created_at: string
          description: string | null
          end_at: string | null
          festival_edition_id: string | null
          festival_id: string | null
          id: string
          source_external_id: string | null
          source_id: string | null
          source_url: string | null
          start_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          canonical_key?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          festival_edition_id?: string | null
          festival_id?: string | null
          id?: string
          source_external_id?: string | null
          source_id?: string | null
          source_url?: string | null
          start_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          canonical_key?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          festival_edition_id?: string | null
          festival_id?: string | null
          id?: string
          source_external_id?: string | null
          source_id?: string | null
          source_url?: string | null
          start_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_festival_edition_id_fkey"
            columns: ["festival_edition_id"]
            isOneToOne: false
            referencedRelation: "festival_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_source"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      festival_editions: {
        Row: {
          created_at: string
          end_date: string
          festival_id: string
          id: string
          start_date: string
          updated_at: string
          website: string | null
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          festival_id: string
          id?: string
          start_date: string
          updated_at?: string
          website?: string | null
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string
          festival_id?: string
          id?: string
          start_date?: string
          updated_at?: string
          website?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "festival_editions_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
        ]
      }
      festivals: {
        Row: {
          country_code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      film_countries: {
        Row: {
          country_name: string
          film_id: string
          position: number
        }
        Insert: {
          country_name: string
          film_id: string
          position: number
        }
        Update: {
          country_name?: string
          film_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "film_countries_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      film_genres: {
        Row: {
          film_id: string
          genre_id: string
        }
        Insert: {
          film_id: string
          genre_id: string
        }
        Update: {
          film_id?: string
          genre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "film_genres_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      film_people: {
        Row: {
          film_id: string
          person_id: string
          role: string
        }
        Insert: {
          film_id: string
          person_id: string
          role: string
        }
        Update: {
          film_id?: string
          person_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "film_people_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      film_themes: {
        Row: {
          film_id: string
          theme_id: string
          weight: number
        }
        Insert: {
          film_id: string
          theme_id: string
          weight?: number
        }
        Update: {
          film_id?: string
          theme_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "film_themes_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      films: {
        Row: {
          canonical_key: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          imdb_id: string | null
          original_title: string | null
          poster_url: string | null
          source_external_id: string | null
          source_id: string | null
          synopsis: string | null
          title: string
          tmdb_id: string | null
          trailer_url: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          canonical_key?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          imdb_id?: string | null
          original_title?: string | null
          poster_url?: string | null
          source_external_id?: string | null
          source_id?: string | null
          synopsis?: string | null
          title: string
          tmdb_id?: string | null
          trailer_url?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          canonical_key?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          imdb_id?: string | null
          original_title?: string | null
          poster_url?: string | null
          source_external_id?: string | null
          source_id?: string | null
          synopsis?: string | null
          title?: string
          tmdb_id?: string | null
          trailer_url?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "films_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      interests: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "interests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          event_id: string | null
          film_id: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          film_id?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          film_id?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          birth_date: string | null
          country_code: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          language_code: string
          latitude: number | null
          longitude: number | null
          search_radius_km: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          language_code?: string
          latitude?: number | null
          longitude?: number | null
          search_radius_km?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          language_code?: string
          latitude?: number | null
          longitude?: number | null
          search_radius_km?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string
          event_id: string | null
          expires_at: string | null
          film_id: string | null
          id: string
          reason: Json
          score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          expires_at?: string | null
          film_id?: string | null
          id?: string
          reason?: Json
          score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          expires_at?: string | null
          film_id?: string | null
          id?: string
          reason?: Json
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_films: {
        Row: {
          created_at: string
          film_id: string
          position: number
          screening_id: string
        }
        Insert: {
          created_at?: string
          film_id: string
          position?: number
          screening_id: string
        }
        Update: {
          created_at?: string
          film_id?: string
          position?: number
          screening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_films_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_films_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      screenings: {
        Row: {
          created_at: string
          currency: string
          end_at: string | null
          event_id: string
          format: string | null
          id: string
          language: string | null
          price: number | null
          start_at: string
          subtitle_language: string | null
          ticket_url: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          end_at?: string | null
          event_id: string
          format?: string | null
          id?: string
          language?: string | null
          price?: number | null
          start_at: string
          subtitle_language?: string | null
          ticket_url?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          end_at?: string | null
          event_id?: string
          format?: string | null
          id?: string
          language?: string | null
          price?: number | null
          start_at?: string
          subtitle_language?: string | null
          ticket_url?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      source_items: {
        Row: {
          content: string | null
          content_hash: string | null
          created_at: string
          external_id: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          processed_at: string | null
          processing_error: string | null
          published_at: string | null
          raw_data: Json
          source_id: string
          status: string
          title: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          content?: string | null
          content_hash?: string | null
          created_at?: string
          external_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          processed_at?: string | null
          processing_error?: string | null
          published_at?: string | null
          raw_data?: Json
          source_id: string
          status?: string
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string | null
          content_hash?: string | null
          created_at?: string
          external_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          processed_at?: string | null
          processing_error?: string | null
          published_at?: string | null
          raw_data?: Json
          source_id?: string
          status?: string
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          active: boolean
          configuration: Json
          country_code: string | null
          created_at: string
          fetch_interval_minutes: number
          id: string
          language_code: string | null
          last_error: string | null
          last_error_at: string | null
          last_fetched_at: string | null
          last_success_at: string | null
          name: string
          parser_key: string | null
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          configuration?: Json
          country_code?: string | null
          created_at?: string
          fetch_interval_minutes?: number
          id?: string
          language_code?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_fetched_at?: string | null
          last_success_at?: string | null
          name: string
          parser_key?: string | null
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          configuration?: Json
          country_code?: string | null
          created_at?: string
          fetch_interval_minutes?: number
          id?: string
          language_code?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_fetched_at?: string | null
          last_success_at?: string | null
          name?: string
          parser_key?: string | null
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "themes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_channels: {
        Row: {
          country_code: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      tv_programs: {
        Row: {
          channel_id: string
          created_at: string
          description: string | null
          end_at: string | null
          episode: number | null
          episode_title: string | null
          film_id: string | null
          genre: string | null
          id: string
          season: number | null
          series_title: string | null
          source_external_id: string | null
          source_id: string | null
          source_url: string | null
          start_at: string
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          description?: string | null
          end_at?: string | null
          episode?: number | null
          episode_title?: string | null
          film_id?: string | null
          genre?: string | null
          id?: string
          season?: number | null
          series_title?: string | null
          source_external_id?: string | null
          source_id?: string | null
          source_url?: string | null
          start_at: string
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          description?: string | null
          end_at?: string | null
          episode?: number | null
          episode_title?: string | null
          film_id?: string | null
          genre?: string | null
          id?: string
          season?: number | null
          series_title?: string | null
          source_external_id?: string | null
          source_id?: string | null
          source_url?: string | null
          start_at?: string
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tv_programs_source"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_programs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "tv_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_programs_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          film_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          film_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          film_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string
          interest_id: string
          source: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          interest_id: string
          source?: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          interest_id?: string
          source?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          city: string | null
          country_code: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          postal_code: string | null
          source_external_id: string | null
          source_id: string | null
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          postal_code?: string | null
          source_external_id?: string | null
          source_id?: string | null
          type: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          postal_code?: string | null
          source_external_id?: string | null
          source_id?: string | null
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ingest_screening: {
        Args: { p_screening: Json; p_source_key: string }
        Returns: Json
      }
      ingest_tv_program: {
        Args: { p_program: Json; p_source_key: string }
        Returns: Json
      }
      link_event_festival: {
        Args: {
          p_festival_key: string
          p_festival_year: number
          p_source_external_id: string
          p_source_key: string
        }
        Returns: Json
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
