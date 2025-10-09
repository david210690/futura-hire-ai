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
      achievements: {
        Row: {
          code: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["achievement_kind"]
          label: string
          org_id: string
          points: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["achievement_kind"]
          label: string
          org_id: string
          points?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["achievement_kind"]
          label?: string
          org_id?: string
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          input_hash: string | null
          input_ref: string | null
          kind: string
          latency_ms: number | null
          model_name: string | null
          output_json: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          input_hash?: string | null
          input_ref?: string | null
          kind: string
          latency_ms?: number | null
          model_name?: string | null
          output_json?: Json | null
          status?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          input_hash?: string | null
          input_ref?: string | null
          kind?: string
          latency_ms?: number | null
          model_name?: string | null
          output_json?: Json | null
          status?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          ai_version: string | null
          candidate_id: string
          created_at: string | null
          culture_fit_score: number | null
          explanations: Json | null
          id: string
          job_id: string
          org_id: string
          overall_score: number | null
          shortlist_reason: string | null
          skill_fit_score: number | null
          stage: string | null
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          ai_version?: string | null
          candidate_id: string
          created_at?: string | null
          culture_fit_score?: number | null
          explanations?: Json | null
          id?: string
          job_id: string
          org_id: string
          overall_score?: number | null
          shortlist_reason?: string | null
          skill_fit_score?: number | null
          stage?: string | null
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          ai_version?: string | null
          candidate_id?: string
          created_at?: string | null
          culture_fit_score?: number | null
          explanations?: Json | null
          id?: string
          job_id?: string
          org_id?: string
          overall_score?: number | null
          shortlist_reason?: string | null
          skill_fit_score?: number | null
          stage?: string | null
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
          {
            foreignKeyName: "applications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          meta_json: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          meta_json?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta_json?: Json | null
        }
        Relationships: []
      }
      bias_reports: {
        Row: {
          created_at: string | null
          diversity_score: number | null
          education_balance: string | null
          gender_balance: string | null
          id: string
          issues: string[] | null
          job_id: string
          skill_balance: string | null
        }
        Insert: {
          created_at?: string | null
          diversity_score?: number | null
          education_balance?: string | null
          gender_balance?: string | null
          id?: string
          issues?: string[] | null
          job_id: string
          skill_balance?: string | null
        }
        Update: {
          created_at?: string | null
          diversity_score?: number | null
          education_balance?: string | null
          gender_balance?: string | null
          id?: string
          issues?: string[] | null
          job_id?: string
          skill_balance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bias_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_progress: {
        Row: {
          candidate_id: string
          has_resume: boolean
          has_video: boolean
          id: string
          profile_completion: number
          skills_count: number
          updated_at: string
        }
        Insert: {
          candidate_id: string
          has_resume?: boolean
          has_video?: boolean
          id?: string
          profile_completion?: number
          skills_count?: number
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          has_resume?: boolean
          has_video?: boolean
          id?: string
          profile_completion?: number
          skills_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_progress_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
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
      career_coach_feedback: {
        Row: {
          candidate_id: string
          created_at: string | null
          id: string
          interview_questions: string[] | null
          job_id: string | null
          missing_skills: string[] | null
          resume_suggestions: string[] | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          id?: string
          interview_questions?: string[] | null
          job_id?: string | null
          missing_skills?: string[] | null
          resume_suggestions?: string[] | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          id?: string
          interview_questions?: string[] | null
          job_id?: string | null
          missing_skills?: string[] | null
          resume_suggestions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "career_coach_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_coach_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          country: string | null
          created_at: string | null
          created_by: string
          id: string
          name: string
          org_id: string
          size_band: string | null
          values_text: string | null
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          org_id: string
          size_band?: string | null
          values_text?: string | null
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          org_id?: string
          size_band?: string | null
          values_text?: string | null
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
          {
            foreignKeyName: "companies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          enabled: boolean
          feature: string
          id: string
          org_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          enabled?: boolean
          feature: string
          id?: string
          org_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          enabled?: boolean
          feature?: string
          id?: string
          org_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          org_id: string
          question: string
          source: Database["public"]["Enums"]["question_source"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          org_id: string
          question: string
          source?: Database["public"]["Enums"]["question_source"]
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          org_id?: string
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
          {
            foreignKeyName: "interview_questions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
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
          org_id: string
          remote_mode: string | null
          salary_range: string | null
          seniority: Database["public"]["Enums"]["seniority_level"]
          status: Database["public"]["Enums"]["job_status"]
          tags: string[] | null
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
          org_id: string
          remote_mode?: string | null
          salary_range?: string | null
          seniority?: Database["public"]["Enums"]["seniority_level"]
          status?: Database["public"]["Enums"]["job_status"]
          tags?: string[] | null
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
          org_id?: string
          remote_mode?: string | null
          salary_range?: string | null
          seniority?: Database["public"]["Enums"]["seniority_level"]
          status?: Database["public"]["Enums"]["job_status"]
          tags?: string[] | null
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
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          board: string
          computed_at: string
          id: string
          org_id: string
          period: Database["public"]["Enums"]["leaderboard_period"]
          rank: number
          score: number
          user_id: string
        }
        Insert: {
          board: string
          computed_at?: string
          id?: string
          org_id: string
          period: Database["public"]["Enums"]["leaderboard_period"]
          rank?: number
          score?: number
          user_id: string
        }
        Update: {
          board?: string
          computed_at?: string
          id?: string
          org_id?: string
          period?: Database["public"]["Enums"]["leaderboard_period"]
          rank?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_assets: {
        Row: {
          candidate_message: string | null
          created_at: string | null
          id: string
          job_id: string
          linkedin_post: string | null
          outreach_email: string | null
        }
        Insert: {
          candidate_message?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          linkedin_post?: string | null
          outreach_email?: string | null
        }
        Update: {
          candidate_message?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          linkedin_post?: string | null
          outreach_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_assets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      recruiter_metrics: {
        Row: {
          avg_time_to_shortlist: number | null
          diversity_champion_count: number
          id: string
          jobs_created: number
          org_id: string
          shortlists_run: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_time_to_shortlist?: number | null
          diversity_champion_count?: number
          id?: string
          jobs_created?: number
          org_id: string
          shortlists_run?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_time_to_shortlist?: number | null
          diversity_champion_count?: number
          id?: string
          jobs_created?: number
          org_id?: string
          shortlists_run?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_metrics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          candidate_id: string
          created_at: string | null
          file_hash: string | null
          file_url: string
          id: string
          parsed_text: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          file_hash?: string | null
          file_url: string
          id?: string
          parsed_text?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          file_hash?: string | null
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
      streaks: {
        Row: {
          current_streak: number
          id: string
          kind: Database["public"]["Enums"]["streak_kind"]
          last_action_date: string | null
          longest_streak: number
          metric: string
          org_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          kind: Database["public"]["Enums"]["streak_kind"]
          last_action_date?: string | null
          longest_streak?: number
          metric: string
          org_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          kind?: Database["public"]["Enums"]["streak_kind"]
          last_action_date?: string | null
          longest_streak?: number
          metric?: string
          org_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          count: number
          day: string
          id: string
          metric: string
          org_id: string
          updated_at: string
        }
        Insert: {
          count?: number
          day?: string
          id?: string
          metric: string
          org_id: string
          updated_at?: string
        }
        Update: {
          count?: number
          day?: string
          id?: string
          metric?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
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
      users: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
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
          rationale: string | null
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
          rationale?: string | null
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
          rationale?: string | null
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
      compute_candidate_progress: {
        Args: { _candidate_id: string }
        Returns: undefined
      }
      get_entitlement: {
        Args: { _feature: string; _org_id: string }
        Returns: {
          enabled: boolean
          value: string
        }[]
      }
      get_usage: {
        Args: { _day?: string; _metric: string; _org_id: string }
        Returns: number
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { _metric: string; _org_id: string }
        Returns: {
          count: number
          limit_value: number
          remaining: number
        }[]
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_meta_json?: Json
        }
        Returns: string
      }
    }
    Enums: {
      achievement_kind: "candidate" | "recruiter"
      app_role: "recruiter" | "candidate" | "admin"
      application_status: "shortlisted" | "review" | "rejected" | "hired"
      employment_type: "full-time" | "part-time" | "contract" | "internship"
      job_status: "open" | "closed"
      leaderboard_period: "weekly" | "monthly"
      org_role: "owner" | "admin" | "recruiter" | "viewer"
      question_source: "auto" | "manual"
      seniority_level: "entry" | "mid" | "senior" | "lead" | "executive"
      streak_kind: "candidate" | "recruiter"
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
      achievement_kind: ["candidate", "recruiter"],
      app_role: ["recruiter", "candidate", "admin"],
      application_status: ["shortlisted", "review", "rejected", "hired"],
      employment_type: ["full-time", "part-time", "contract", "internship"],
      job_status: ["open", "closed"],
      leaderboard_period: ["weekly", "monthly"],
      org_role: ["owner", "admin", "recruiter", "viewer"],
      question_source: ["auto", "manual"],
      seniority_level: ["entry", "mid", "senior", "lead", "executive"],
      streak_kind: ["candidate", "recruiter"],
    },
  },
} as const
