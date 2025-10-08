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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          candidate_id: string
          created_at: string | null
          culture_fit_score: number | null
          id: string
          job_id: string
          overall_score: number | null
          shortlist_reason: string | null
          skill_fit_score: number | null
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          culture_fit_score?: number | null
          id?: string
          job_id: string
          overall_score?: number | null
          shortlist_reason?: string | null
          skill_fit_score?: number | null
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          culture_fit_score?: number | null
          id?: string
          job_id?: string
          overall_score?: number | null
          shortlist_reason?: string | null
          skill_fit_score?: number | null
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string | null
          full_name: string
          headline: string | null
          id: string
          skills: string | null
          summary: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          headline?: string | null
          id?: string
          skills?: string | null
          summary?: string | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          skills?: string | null
          summary?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          website: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          website?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          question: string
          source: Database["public"]["Enums"]["question_source"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          question: string
          source?: Database["public"]["Enums"]["question_source"]
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          question?: string
          source?: Database["public"]["Enums"]["question_source"]
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          id: string
          jd_text: string
          location: string
          seniority: Database["public"]["Enums"]["seniority_level"]
          status: Database["public"]["Enums"]["job_status"]
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          jd_text: string
          location: string
          seniority?: Database["public"]["Enums"]["seniority_level"]
          status?: Database["public"]["Enums"]["job_status"]
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          jd_text?: string
          location?: string
          seniority?: Database["public"]["Enums"]["seniority_level"]
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          candidate_id: string
          created_at: string | null
          file_url: string
          id: string
          parsed_text: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          file_url: string
          id?: string
          parsed_text?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          file_url?: string
          id?: string
          parsed_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resumes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      video_analysis: {
        Row: {
          comms_score: number | null
          confidence_score: number | null
          created_at: string | null
          highlights: string | null
          id: string
          red_flags: string | null
          summary: string | null
          transcript: string | null
          video_id: string
        }
        Insert: {
          comms_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          highlights?: string | null
          id?: string
          red_flags?: string | null
          summary?: string | null
          transcript?: string | null
          video_id: string
        }
        Update: {
          comms_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          highlights?: string | null
          id?: string
          red_flags?: string | null
          summary?: string | null
          transcript?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_analysis_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          candidate_id: string
          created_at: string | null
          file_url: string
          id: string
          job_id: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          file_url: string
          id?: string
          job_id?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          file_url?: string
          id?: string
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
      app_role: "recruiter" | "candidate" | "admin"
      application_status: "shortlisted" | "review" | "rejected" | "hired"
      employment_type: "full-time" | "part-time" | "contract" | "internship"
      job_status: "open" | "closed"
      question_source: "auto" | "manual"
      seniority_level: "entry" | "mid" | "senior" | "lead" | "executive"
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
      app_role: ["recruiter", "candidate", "admin"],
      application_status: ["shortlisted", "review", "rejected", "hired"],
      employment_type: ["full-time", "part-time", "contract", "internship"],
      job_status: ["open", "closed"],
      question_source: ["auto", "manual"],
      seniority_level: ["entry", "mid", "senior", "lead", "executive"],
    },
  },
} as const
