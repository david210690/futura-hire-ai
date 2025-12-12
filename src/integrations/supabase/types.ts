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
          apply_token: string | null
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
          video_required: boolean | null
        }
        Insert: {
          ai_version?: string | null
          apply_token?: string | null
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
          video_required?: boolean | null
        }
        Update: {
          ai_version?: string | null
          apply_token?: string | null
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
          video_required?: boolean | null
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
      assessment_questions: {
        Row: {
          assessment_id: string
          id: string
          order_index: number
          question_id: string
          section_id: string | null
        }
        Insert: {
          assessment_id: string
          id?: string
          order_index: number
          question_id: string
          section_id?: string | null
        }
        Update: {
          assessment_id?: string
          id?: string
          order_index?: number
          question_id?: string
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "assessment_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_reports: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          summary: Json
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          summary: Json
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_reports_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sections: {
        Row: {
          assessment_id: string
          id: string
          title: string
          weight: number
        }
        Insert: {
          assessment_id: string
          id?: string
          title: string
          weight?: number
        }
        Update: {
          assessment_id?: string
          id?: string
          title?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sections_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          org_id: string
          passing_score: number
          purpose: Database["public"]["Enums"]["assessment_purpose"]
          shuffle: boolean
          total_points: number
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          org_id: string
          passing_score?: number
          purpose: Database["public"]["Enums"]["assessment_purpose"]
          shuffle?: boolean
          total_points?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          org_id?: string
          passing_score?: number
          purpose?: Database["public"]["Enums"]["assessment_purpose"]
          shuffle?: boolean
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          application_id: string | null
          assessment_id: string
          candidate_id: string | null
          created_at: string
          due_at: string | null
          id: string
          job_id: string | null
          status: Database["public"]["Enums"]["assignment_status"]
        }
        Insert: {
          application_id?: string | null
          assessment_id: string
          candidate_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          job_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
        }
        Update: {
          application_id?: string | null
          assessment_id?: string
          candidate_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          job_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_answers: {
        Row: {
          ai_feedback: string | null
          attempt_id: string
          auto_score: number | null
          id: string
          is_flagged: boolean | null
          question_id: string
          response: Json
        }
        Insert: {
          ai_feedback?: string | null
          attempt_id: string
          auto_score?: number | null
          id?: string
          is_flagged?: boolean | null
          question_id: string
          response: Json
        }
        Update: {
          ai_feedback?: string | null
          attempt_id?: string
          auto_score?: number | null
          id?: string
          is_flagged?: boolean | null
          question_id?: string
          response?: Json
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          ai_grade: number | null
          assignment_id: string
          final_grade: number | null
          human_override_grade: number | null
          id: string
          ip_addr: string | null
          pass: boolean | null
          proctor_score: number | null
          started_at: string
          submitted_at: string | null
          time_spent_seconds: number | null
          ua: string | null
        }
        Insert: {
          ai_grade?: number | null
          assignment_id: string
          final_grade?: number | null
          human_override_grade?: number | null
          id?: string
          ip_addr?: string | null
          pass?: boolean | null
          proctor_score?: number | null
          started_at?: string
          submitted_at?: string | null
          time_spent_seconds?: number | null
          ua?: string | null
        }
        Update: {
          ai_grade?: number | null
          assignment_id?: string
          final_grade?: number | null
          human_override_grade?: number | null
          id?: string
          ip_addr?: string | null
          pass?: boolean | null
          proctor_score?: number | null
          started_at?: string
          submitted_at?: string | null
          time_spent_seconds?: number | null
          ua?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
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
          linkedin_url: string | null
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
          linkedin_url?: string | null
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
          linkedin_url?: string | null
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
      career_trajectory_snapshots: {
        Row: {
          created_at: string
          id: string
          snapshot_json: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot_json: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot_json?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          country: string | null
          created_at: string | null
          created_by: string
          id: string
          name: string
          org_id: string
          pricing_tier: string | null
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
          pricing_tier?: string | null
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
          pricing_tier?: string | null
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
      copilot_actions_log: {
        Row: {
          action: string
          created_at: string
          id: string
          org_id: string
          params: Json | null
          result_ref: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          org_id: string
          params?: Json | null
          result_ref?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          org_id?: string
          params?: Json | null
          result_ref?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_actions_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "copilot_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_threads: {
        Row: {
          created_at: string
          id: string
          org_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      culture_events: {
        Row: {
          created_at: string
          id: string
          org_id: string
          payload: Json
          source: Database["public"]["Enums"]["culture_event_source"]
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          payload: Json
          source: Database["public"]["Enums"]["culture_event_source"]
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          payload?: Json
          source?: Database["public"]["Enums"]["culture_event_source"]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "culture_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      culture_matches: {
        Row: {
          candidate_id: string
          created_at: string
          factors: Json | null
          id: string
          match_score: number
          org_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          factors?: Json | null
          id?: string
          match_score: number
          org_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          factors?: Json | null
          id?: string
          match_score?: number
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "culture_matches_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "culture_matches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      culture_profiles: {
        Row: {
          id: string
          notes: string | null
          org_id: string
          updated_at: string
          vector: Json
        }
        Insert: {
          id?: string
          notes?: string | null
          org_id: string
          updated_at?: string
          vector: Json
        }
        Update: {
          id?: string
          notes?: string | null
          org_id?: string
          updated_at?: string
          vector?: Json
        }
        Relationships: [
          {
            foreignKeyName: "culture_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
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
      hires: {
        Row: {
          application_id: string
          created_at: string
          id: string
          manager_id: string
          org_id: string
          start_date: string
          status: Database["public"]["Enums"]["hire_status"]
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          manager_id: string
          org_id: string
          start_date: string
          status?: Database["public"]["Enums"]["hire_status"]
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          manager_id?: string
          org_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["hire_status"]
        }
        Relationships: [
          {
            foreignKeyName: "hires_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hires_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          created_at: string
          file_url: string
          format: Database["public"]["Enums"]["import_format"]
          id: string
          org_id: string
          parsed: Json | null
        }
        Insert: {
          created_at?: string
          file_url: string
          format: Database["public"]["Enums"]["import_format"]
          id?: string
          org_id: string
          parsed?: Json | null
        }
        Update: {
          created_at?: string
          file_url?: string
          format?: Database["public"]["Enums"]["import_format"]
          id?: string
          org_id?: string
          parsed?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "imports_org_id_fkey"
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
      interview_ratings: {
        Row: {
          communication: number | null
          created_at: string
          culture_add: number | null
          hire_recommend: Database["public"]["Enums"]["hire_decision"]
          id: string
          interview_id: string
          notes: string | null
          problem_solving: number | null
          tech_depth: number | null
        }
        Insert: {
          communication?: number | null
          created_at?: string
          culture_add?: number | null
          hire_recommend: Database["public"]["Enums"]["hire_decision"]
          id?: string
          interview_id: string
          notes?: string | null
          problem_solving?: number | null
          tech_depth?: number | null
        }
        Update: {
          communication?: number | null
          created_at?: string
          culture_add?: number | null
          hire_recommend?: Database["public"]["Enums"]["hire_decision"]
          id?: string
          interview_id?: string
          notes?: string | null
          problem_solving?: number | null
          tech_depth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_ratings_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_simulation_answers: {
        Row: {
          audio_url: string | null
          created_at: string | null
          feedback: string | null
          id: string
          question_id: string
          score: number | null
          session_id: string
          transcript: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          question_id: string
          score?: number | null
          session_id: string
          transcript?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          question_id?: string
          score?: number | null
          session_id?: string
          transcript?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_simulation_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_simulation_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_simulation_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_simulation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_simulation_questions: {
        Row: {
          created_at: string | null
          id: string
          ideal_answer_points: string | null
          question_index: number
          question_text: string
          question_type: string
          session_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ideal_answer_points?: string | null
          question_index: number
          question_text: string
          question_type: string
          session_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ideal_answer_points?: string | null
          question_index?: number
          question_text?: string
          question_type?: string
          session_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_simulation_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_simulation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_simulation_sessions: {
        Row: {
          completed_questions: number | null
          created_at: string | null
          difficulty: string
          feedback_summary: string | null
          id: string
          job_twin_job_id: string | null
          mode: string
          overall_score: number | null
          role_title: string
          status: string
          total_questions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_questions?: number | null
          created_at?: string | null
          difficulty?: string
          feedback_summary?: string | null
          id?: string
          job_twin_job_id?: string | null
          mode?: string
          overall_score?: number | null
          role_title: string
          status?: string
          total_questions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_questions?: number | null
          created_at?: string | null
          difficulty?: string
          feedback_summary?: string | null
          id?: string
          job_twin_job_id?: string | null
          mode?: string
          overall_score?: number | null
          role_title?: string
          status?: string
          total_questions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_simulation_sessions_job_twin_job_id_fkey"
            columns: ["job_twin_job_id"]
            isOneToOne: false
            referencedRelation: "job_twin_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          candidate_id: string
          created_at: string
          ended_at: string | null
          id: string
          interviewer_id: string | null
          job_id: string
          scheduled_at: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          interviewer_id?: string | null
          job_id: string
          scheduled_at?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          interviewer_id?: string | null
          job_id?: string
          scheduled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
      job_decision_snapshots: {
        Row: {
          created_at: string
          generated_by_user_id: string
          id: string
          job_id: string
          snapshot_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_by_user_id: string
          id?: string
          job_id: string
          snapshot_json: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_by_user_id?: string
          id?: string
          job_id?: string
          snapshot_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_decision_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_twin_interactions: {
        Row: {
          ai_generated: boolean | null
          body: string | null
          channel: string | null
          created_at: string | null
          direction: string | null
          id: string
          interaction_type: string
          is_sent: boolean | null
          job_twin_job_id: string
          metadata: Json | null
          scheduled_for: string | null
          sent_at: string | null
          subject: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          body?: string | null
          channel?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          interaction_type: string
          is_sent?: boolean | null
          job_twin_job_id: string
          metadata?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          body?: string | null
          channel?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          interaction_type?: string
          is_sent?: boolean | null
          job_twin_job_id?: string
          metadata?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_twin_interactions_job_twin_job_id_fkey"
            columns: ["job_twin_job_id"]
            isOneToOne: false
            referencedRelation: "job_twin_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_twin_jobs: {
        Row: {
          applied_at: string | null
          contact_channel: string | null
          created_at: string | null
          id: string
          job_id: string
          last_contacted_at: string | null
          match_reasons: string[] | null
          match_score: number | null
          next_action_at: string | null
          next_action_type: string | null
          notes: string | null
          profile_id: string
          recruiter_email: string | null
          recruiter_linkedin_url: string | null
          recruiter_name: string | null
          status: string
          timezone: string | null
        }
        Insert: {
          applied_at?: string | null
          contact_channel?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          last_contacted_at?: string | null
          match_reasons?: string[] | null
          match_score?: number | null
          next_action_at?: string | null
          next_action_type?: string | null
          notes?: string | null
          profile_id: string
          recruiter_email?: string | null
          recruiter_linkedin_url?: string | null
          recruiter_name?: string | null
          status?: string
          timezone?: string | null
        }
        Update: {
          applied_at?: string | null
          contact_channel?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          last_contacted_at?: string | null
          match_reasons?: string[] | null
          match_score?: number | null
          next_action_at?: string | null
          next_action_type?: string | null
          notes?: string | null
          profile_id?: string
          recruiter_email?: string | null
          recruiter_linkedin_url?: string | null
          recruiter_name?: string | null
          status?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_twin_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_twin_jobs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "job_twin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_twin_message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          subject: string | null
          template_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          subject?: string | null
          template_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          subject?: string | null
          template_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_twin_negotiation_notes: {
        Row: {
          candidate_desired_salary: string | null
          created_at: string | null
          current_offer_salary: string | null
          id: string
          job_twin_job_id: string
          last_updated_at: string | null
          negotiation_email_template: string | null
          negotiation_strategy_summary: string | null
          non_salary_items: string | null
          talking_points: string | null
          user_id: string
        }
        Insert: {
          candidate_desired_salary?: string | null
          created_at?: string | null
          current_offer_salary?: string | null
          id?: string
          job_twin_job_id: string
          last_updated_at?: string | null
          negotiation_email_template?: string | null
          negotiation_strategy_summary?: string | null
          non_salary_items?: string | null
          talking_points?: string | null
          user_id: string
        }
        Update: {
          candidate_desired_salary?: string | null
          created_at?: string | null
          current_offer_salary?: string | null
          id?: string
          job_twin_job_id?: string
          last_updated_at?: string | null
          negotiation_email_template?: string | null
          negotiation_strategy_summary?: string | null
          non_salary_items?: string | null
          talking_points?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_twin_negotiation_notes_job_twin_job_id_fkey"
            columns: ["job_twin_job_id"]
            isOneToOne: true
            referencedRelation: "job_twin_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_twin_profiles: {
        Row: {
          career_goals: string | null
          created_at: string | null
          id: string
          ideal_role: string | null
          preferences: Json | null
          skills: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          career_goals?: string | null
          created_at?: string | null
          id?: string
          ideal_role?: string | null
          preferences?: Json | null
          skills?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          career_goals?: string | null
          created_at?: string | null
          id?: string
          ideal_role?: string | null
          preferences?: Json | null
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          default_assessment_id: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          id: string
          is_public: boolean | null
          jd_text: string
          location: string
          org_id: string
          remote_mode: string | null
          salary_range: string | null
          seniority: Database["public"]["Enums"]["seniority_level"]
          slug: string | null
          status: Database["public"]["Enums"]["job_status"]
          tags: string[] | null
          title: string
          video_required: boolean | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          default_assessment_id?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          is_public?: boolean | null
          jd_text: string
          location: string
          org_id: string
          remote_mode?: string | null
          salary_range?: string | null
          seniority?: Database["public"]["Enums"]["seniority_level"]
          slug?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tags?: string[] | null
          title: string
          video_required?: boolean | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          default_assessment_id?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          is_public?: boolean | null
          jd_text?: string
          location?: string
          org_id?: string
          remote_mode?: string | null
          salary_range?: string | null
          seniority?: Database["public"]["Enums"]["seniority_level"]
          slug?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tags?: string[] | null
          title?: string
          video_required?: boolean | null
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
            foreignKeyName: "jobs_default_assessment_id_fkey"
            columns: ["default_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
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
      opportunity_radar_snapshots: {
        Row: {
          created_at: string
          id: string
          snapshot_json: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          snapshot_json: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          snapshot_json?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string | null
        }
        Relationships: []
      }
      predictive_scores: {
        Row: {
          application_id: string
          created_at: string
          id: string
          rationale: string | null
          success_probability: number
          version: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          rationale?: string | null
          success_probability: number
          version?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          rationale?: string | null
          success_probability?: number
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictive_scores_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      proctor_events: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          kind: string
          meta: Json | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          kind: string
          meta?: Json | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "proctor_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_checks: {
        Row: {
          created_at: string
          day: number
          hire_id: string
          id: string
          manager_report: Json | null
          self_report: Json | null
        }
        Insert: {
          created_at?: string
          day: number
          hire_id: string
          id?: string
          manager_report?: Json | null
          self_report?: Json | null
        }
        Update: {
          created_at?: string
          day?: number
          hire_id?: string
          id?: string
          manager_report?: Json | null
          self_report?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_checks_hire_id_fkey"
            columns: ["hire_id"]
            isOneToOne: false
            referencedRelation: "hires"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank: {
        Row: {
          answer_key: Json | null
          created_at: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id: string
          options: Json | null
          org_id: string
          points: number
          question: string
          role_tag: string | null
          rubric: Json | null
          skill_tags: string[] | null
          source: Database["public"]["Enums"]["question_source"]
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          answer_key?: Json | null
          created_at?: string
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id?: string
          options?: Json | null
          org_id: string
          points?: number
          question: string
          role_tag?: string | null
          rubric?: Json | null
          skill_tags?: string[] | null
          source?: Database["public"]["Enums"]["question_source"]
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          answer_key?: Json | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          id?: string
          options?: Json | null
          org_id?: string
          points?: number
          question?: string
          role_tag?: string | null
          rubric?: Json | null
          skill_tags?: string[] | null
          source?: Database["public"]["Enums"]["question_source"]
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
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
      retention_scores: {
        Row: {
          created_at: string
          hire_id: string
          horizon: Database["public"]["Enums"]["retention_horizon"]
          id: string
          rationale: string | null
          risk: number
          tips: string[] | null
        }
        Insert: {
          created_at?: string
          hire_id: string
          horizon: Database["public"]["Enums"]["retention_horizon"]
          id?: string
          rationale?: string | null
          risk: number
          tips?: string[] | null
        }
        Update: {
          created_at?: string
          hire_id?: string
          horizon?: Database["public"]["Enums"]["retention_horizon"]
          id?: string
          rationale?: string | null
          risk?: number
          tips?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "retention_scores_hire_id_fkey"
            columns: ["hire_id"]
            isOneToOne: false
            referencedRelation: "hires"
            referencedColumns: ["id"]
          },
        ]
      }
      role_design_versions: {
        Row: {
          created_at: string
          id: string
          interview_kit: string[] | null
          jd_draft: string | null
          notes: string | null
          role_design_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          interview_kit?: string[] | null
          jd_draft?: string | null
          notes?: string | null
          role_design_id: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          interview_kit?: string[] | null
          jd_draft?: string | null
          notes?: string | null
          role_design_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_design_versions_role_design_id_fkey"
            columns: ["role_design_id"]
            isOneToOne: false
            referencedRelation: "role_designs"
            referencedColumns: ["id"]
          },
        ]
      }
      role_designs: {
        Row: {
          created_at: string
          id: string
          interview_kit: string[] | null
          jd_draft: string | null
          org_id: string
          problem_statement: string
          skills_matrix: Json | null
          suggested_titles: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interview_kit?: string[] | null
          jd_draft?: string | null
          org_id: string
          problem_statement: string
          skills_matrix?: Json | null
          suggested_titles?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interview_kit?: string[] | null
          jd_draft?: string | null
          org_id?: string
          problem_statement?: string
          skills_matrix?: Json | null
          suggested_titles?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_designs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      role_dna_fit_requests: {
        Row: {
          created_at: string
          id: string
          job_twin_job_id: string
          requested_by_user_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_twin_job_id: string
          requested_by_user_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_twin_job_id?: string
          requested_by_user_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_dna_fit_requests_job_twin_job_id_fkey"
            columns: ["job_twin_job_id"]
            isOneToOne: false
            referencedRelation: "job_twin_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      role_dna_fit_scores: {
        Row: {
          created_at: string
          fit_dimension_scores: Json
          fit_score: number
          id: string
          job_twin_job_id: string
          role_dna_snapshot_id: string | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fit_dimension_scores?: Json
          fit_score?: number
          id?: string
          job_twin_job_id: string
          role_dna_snapshot_id?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fit_dimension_scores?: Json
          fit_score?: number
          id?: string
          job_twin_job_id?: string
          role_dna_snapshot_id?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_dna_fit_scores_job_twin_job_id_fkey"
            columns: ["job_twin_job_id"]
            isOneToOne: false
            referencedRelation: "job_twin_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_dna_fit_scores_role_dna_snapshot_id_fkey"
            columns: ["role_dna_snapshot_id"]
            isOneToOne: false
            referencedRelation: "role_dna_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      role_dna_snapshots: {
        Row: {
          created_at: string
          generated_by_user_id: string
          id: string
          job_twin_job_id: string
          snapshot_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_by_user_id: string
          id?: string
          job_twin_job_id: string
          snapshot_json: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_by_user_id?: string
          id?: string
          job_twin_job_id?: string
          snapshot_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_dna_snapshots_generated_by_user_id_fkey"
            columns: ["generated_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_dna_snapshots_job_twin_job_id_fkey"
            columns: ["job_twin_job_id"]
            isOneToOne: false
            referencedRelation: "job_twin_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlist_predictive_scores: {
        Row: {
          created_at: string
          decision_room_snapshot_id: string
          id: string
          job_twin_job_id: string
          reasoning_json: Json
          role_dna_fit_id: string | null
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision_room_snapshot_id: string
          id?: string
          job_twin_job_id: string
          reasoning_json?: Json
          role_dna_fit_id?: string | null
          score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision_room_snapshot_id?: string
          id?: string
          job_twin_job_id?: string
          reasoning_json?: Json
          role_dna_fit_id?: string | null
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlist_predictive_scores_decision_room_snapshot_id_fkey"
            columns: ["decision_room_snapshot_id"]
            isOneToOne: false
            referencedRelation: "job_decision_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_predictive_scores_job_twin_job_id_fkey"
            columns: ["job_twin_job_id"]
            isOneToOne: false
            referencedRelation: "job_twin_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shortlist_predictive_scores_role_dna_fit_id_fkey"
            columns: ["role_dna_fit_id"]
            isOneToOne: false
            referencedRelation: "role_dna_fit_scores"
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
      subscriptions: {
        Row: {
          created_at: string
          id: string
          org_id: string
          plan: string
          provider: string
          status: string
          subscription_id: string | null
          trial_end_at: string | null
          trial_start_at: string | null
          trial_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          plan?: string
          provider?: string
          status?: string
          subscription_id?: string | null
          trial_end_at?: string | null
          trial_start_at?: string | null
          trial_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          plan?: string
          provider?: string
          status?: string
          subscription_id?: string | null
          trial_end_at?: string | null
          trial_start_at?: string | null
          trial_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_fit_scores: {
        Row: {
          candidate_id: string
          created_at: string
          fills: string[] | null
          fit: number
          frictions: string[] | null
          gaps: string[] | null
          id: string
          note: string | null
          team_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          fills?: string[] | null
          fit: number
          frictions?: string[] | null
          gaps?: string[] | null
          id?: string
          note?: string | null
          team_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          fills?: string[] | null
          fit?: number
          frictions?: string[] | null
          gaps?: string[] | null
          id?: string
          note?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_fit_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_fit_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_at: string
          id: string
          role: string | null
          team_id: string
          trait_vector: Json | null
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          role?: string | null
          team_id: string
          trait_vector?: Json | null
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          role?: string | null
          team_id?: string
          trait_vector?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_profiles: {
        Row: {
          id: string
          notes: string | null
          org_id: string
          team_id: string
          updated_at: string
          vector: Json
        }
        Insert: {
          id?: string
          notes?: string | null
          org_id: string
          team_id: string
          updated_at?: string
          vector: Json
        }
        Update: {
          id?: string
          notes?: string | null
          org_id?: string
          team_id?: string
          updated_at?: string
          vector?: Json
        }
        Relationships: [
          {
            foreignKeyName: "team_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          manager_id: string | null
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_org_id_fkey"
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
      voice_interview_sessions: {
        Row: {
          created_at: string
          difficulty: string
          ended_at: string | null
          feedback_summary: string | null
          id: string
          job_twin_job_id: string | null
          mode: string
          overall_score: number | null
          retell_session_id: string | null
          role_title: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          ended_at?: string | null
          feedback_summary?: string | null
          id?: string
          job_twin_job_id?: string | null
          mode?: string
          overall_score?: number | null
          retell_session_id?: string | null
          role_title?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          ended_at?: string | null
          feedback_summary?: string | null
          id?: string
          job_twin_job_id?: string | null
          mode?: string
          overall_score?: number | null
          retell_session_id?: string | null
          role_title?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_interview_sessions_job_twin_job_id_fkey"
            columns: ["job_twin_job_id"]
            isOneToOne: false
            referencedRelation: "job_twin_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_interview_turns: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          turn_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          turn_index: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          turn_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_interview_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "voice_interview_sessions"
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
      compute_predictive_score: {
        Args: { _application_id: string }
        Returns: string
      }
      generate_apply_token: { Args: never; Returns: string }
      generate_slug: { Args: { name: string }; Returns: string }
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
      shares_org_with: {
        Args: { _other_user_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      achievement_kind: "candidate" | "recruiter"
      app_role: "recruiter" | "candidate" | "admin"
      application_status: "shortlisted" | "review" | "rejected" | "hired"
      assessment_purpose: "screening" | "skills" | "culture" | "coding"
      assignment_status:
        | "pending"
        | "invited"
        | "started"
        | "submitted"
        | "graded"
        | "expired"
      culture_event_source: "hire" | "reject" | "interview"
      employment_type: "full-time" | "part-time" | "contract" | "internship"
      hire_decision: "yes" | "no" | "maybe"
      hire_status: "active" | "exited"
      import_format: "pdf" | "csv" | "json"
      job_status: "open" | "closed"
      leaderboard_period: "weekly" | "monthly"
      org_role: "owner" | "admin" | "recruiter" | "viewer"
      question_difficulty: "easy" | "medium" | "hard"
      question_source: "auto" | "manual"
      question_type: "mcq" | "free_text" | "coding"
      retention_horizon: "30d" | "60d" | "90d"
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
      assessment_purpose: ["screening", "skills", "culture", "coding"],
      assignment_status: [
        "pending",
        "invited",
        "started",
        "submitted",
        "graded",
        "expired",
      ],
      culture_event_source: ["hire", "reject", "interview"],
      employment_type: ["full-time", "part-time", "contract", "internship"],
      hire_decision: ["yes", "no", "maybe"],
      hire_status: ["active", "exited"],
      import_format: ["pdf", "csv", "json"],
      job_status: ["open", "closed"],
      leaderboard_period: ["weekly", "monthly"],
      org_role: ["owner", "admin", "recruiter", "viewer"],
      question_difficulty: ["easy", "medium", "hard"],
      question_source: ["auto", "manual"],
      question_type: ["mcq", "free_text", "coding"],
      retention_horizon: ["30d", "60d", "90d"],
      seniority_level: ["entry", "mid", "senior", "lead", "executive"],
      streak_kind: ["candidate", "recruiter"],
    },
  },
} as const
