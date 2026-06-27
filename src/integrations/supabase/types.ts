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
      ai_assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_assistant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      entity_relations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          relation_type: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          relation_type: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          relation_type?: string
          source_id?: string
          source_type?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          enabled: boolean
          entity_id: string | null
          entity_type: string
          feature_key: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          entity_id?: string | null
          entity_type: string
          feature_key: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          entity_id?: string | null
          entity_type?: string
          feature_key?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_activity: {
        Row: {
          action: string
          created_at: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          page_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          page_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_activity_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_links: {
        Row: {
          anchor_text: string | null
          created_at: string
          id: string
          position: number | null
          source_page_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          anchor_text?: string | null
          created_at?: string
          id?: string
          position?: number | null
          source_page_id: string
          target_id: string
          target_type: string
        }
        Update: {
          anchor_text?: string | null
          created_at?: string
          id?: string
          position?: number | null
          source_page_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_links_source_page_id_fkey"
            columns: ["source_page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          archived_at: string | null
          body: Json
          body_md: string | null
          body_text: string | null
          cover_url: string | null
          created_at: string
          department_id: string | null
          icon: string | null
          id: string
          owner_id: string
          parent_id: string | null
          search_vector: unknown
          slug: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          body?: Json
          body_md?: string | null
          body_text?: string | null
          cover_url?: string | null
          created_at?: string
          department_id?: string | null
          icon?: string | null
          id?: string
          owner_id: string
          parent_id?: string | null
          search_vector?: unknown
          slug?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          body?: Json
          body_md?: string | null
          body_text?: string | null
          cover_url?: string | null
          created_at?: string
          department_id?: string | null
          icon?: string | null
          id?: string
          owner_id?: string
          parent_id?: string | null
          search_vector?: unknown
          slug?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "active_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          azure_oid: string | null
          can_view_diagnostics: boolean
          created_at: string
          department: string | null
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          is_admin: boolean
          manager_email: string | null
          preferences: Json
          role: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          azure_oid?: string | null
          can_view_diagnostics?: boolean
          created_at?: string
          department?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          manager_email?: string | null
          preferences?: Json
          role?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          azure_oid?: string | null
          can_view_diagnostics?: boolean
          created_at?: string
          department?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          manager_email?: string | null
          preferences?: Json
          role?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "active_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity: {
        Row: {
          action: string
          created_at: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          project_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          project_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          project_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_links: {
        Row: {
          created_at: string
          id: string
          label: string | null
          project_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          project_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          project_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stakeholders: {
        Row: {
          added_at: string
          id: string
          percent_complete: number | null
          project_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          percent_complete?: number | null
          project_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          percent_complete?: number | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stakeholders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          content: string
          created_at: string
          edited_by: string | null
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_by?: string | null
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          desired_due_date: string | null
          icon: string | null
          id: string
          overall_percent_complete: number | null
          owner_id: string
          search_vector: unknown
          status: string
          title: string
          updated_at: string
          updated_due_date: string | null
          visibility: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          desired_due_date?: string | null
          icon?: string | null
          id?: string
          overall_percent_complete?: number | null
          owner_id: string
          search_vector?: unknown
          status?: string
          title: string
          updated_at?: string
          updated_due_date?: string | null
          visibility?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          desired_due_date?: string | null
          icon?: string | null
          id?: string
          overall_percent_complete?: number | null
          owner_id?: string
          search_vector?: unknown
          status?: string
          title?: string
          updated_at?: string
          updated_due_date?: string | null
          visibility?: string
        }
        Relationships: []
      }
      request_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: string
          mime_type: string
          request_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind: string
          mime_type: string
          request_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          mime_type?: string
          request_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_counters: {
        Row: {
          last_seq: number
          year: number
        }
        Insert: {
          last_seq?: number
          year: number
        }
        Update: {
          last_seq?: number
          year?: number
        }
        Relationships: []
      }
      requests: {
        Row: {
          archived_at: string | null
          assigned_at: string | null
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          department_id: string
          description: string
          due_date: string | null
          id: string
          metadata: Json
          priority: string
          request_number: string | null
          request_type: string
          requester_id: string
          search_vector: unknown
          sharepoint_folder_id: string | null
          sharepoint_folder_url: string | null
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_at?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          department_id: string
          description: string
          due_date?: string | null
          id?: string
          metadata?: Json
          priority?: string
          request_number?: string | null
          request_type: string
          requester_id: string
          search_vector?: unknown
          sharepoint_folder_id?: string | null
          sharepoint_folder_url?: string | null
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_at?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          department_id?: string
          description?: string
          due_date?: string | null
          id?: string
          metadata?: Json
          priority?: string
          request_number?: string | null
          request_type?: string
          requester_id?: string
          search_vector?: unknown
          sharepoint_folder_id?: string | null
          sharepoint_folder_url?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "active_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_activity: {
        Row: {
          action: string
          created_at: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_contacts: {
        Row: {
          contact_type: string
          created_at: string
          email: string | null
          id: string
          internal_user_id: string | null
          name: string | null
          task_id: string
        }
        Insert: {
          contact_type: string
          created_at?: string
          email?: string | null
          id?: string
          internal_user_id?: string | null
          name?: string | null
          task_id: string
        }
        Update: {
          contact_type?: string
          created_at?: string
          email?: string | null
          id?: string
          internal_user_id?: string | null
          name?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_contacts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_links: {
        Row: {
          created_at: string
          id: string
          label: string | null
          task_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          task_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          task_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_updates: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_updates_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          icon: string | null
          id: string
          percent_complete: number | null
          search_vector: unknown
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          percent_complete?: number | null
          search_vector?: unknown
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          percent_complete?: number | null
          search_vector?: unknown
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_departments: {
        Row: {
          display_order: number | null
          id: string | null
          name: string | null
        }
        Insert: {
          display_order?: number | null
          id?: string | null
          name?: string | null
        }
        Update: {
          display_order?: number | null
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
      timeline_items: {
        Row: {
          color_hint: string | null
          end_date: string | null
          entity_type: string | null
          id: string | null
          owner_id: string | null
          start_date: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_relation: {
        Args: {
          p_relation_type: string
          p_source_id: string
          p_source_type: string
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      bulk_add_relations: { Args: { p_pairs: Json }; Returns: string[] }
      can_view_entity: {
        Args: { p_id: string; p_type: string }
        Returns: boolean
      }
      can_view_page: {
        Args: { _page_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      create_page: {
        Args: { p_parent_id?: string; p_title: string; p_visibility?: string }
        Returns: string
      }
      current_department_id: { Args: never; Returns: string }
      current_role: { Args: never; Returns: string }
      expand_node: {
        Args: { p_depth?: number; p_node_id: string; p_node_type: string }
        Returns: {
          edges: Json
          nodes: Json
        }[]
      }
      get_backlinks: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: {
          created_at: string
          snippet: string
          source_page_id: string
          source_title: string
        }[]
      }
      get_graph_data: {
        Args: { p_filters?: Json; p_limit?: number }
        Returns: {
          edges: Json
          nodes: Json
        }[]
      }
      get_page_tree: {
        Args: { p_root_id?: string }
        Returns: {
          depth: number
          icon: string
          id: string
          parent_id: string
          title: string
        }[]
      }
      get_timeline: {
        Args: { p_from: string; p_to: string; p_types?: string[] }
        Returns: {
          color_hint: string
          end_date: string
          entity_type: string
          id: string
          owner_id: string
          start_date: string
          status: string
          title: string
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_role: { Args: never; Returns: boolean }
      is_designer_or_admin: { Args: never; Returns: boolean }
      is_feature_enabled: { Args: { p_feature_key: string }; Returns: boolean }
      is_project_stakeholder: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      list_relations: {
        Args: { p_id: string; p_type: string }
        Returns: {
          created_at: string
          direction: string
          id: string
          other_id: string
          other_title: string
          other_type: string
          relation_type: string
        }[]
      }
      remove_relation: { Args: { p_id: string }; Returns: undefined }
      resolve_features: {
        Args: { p_keys: string[] }
        Returns: {
          enabled: boolean
          feature_key: string
        }[]
      }
      search_all: {
        Args: { p_limit?: number; p_query: string; p_types?: string[] }
        Returns: {
          entity_type: string
          id: string
          rank: number
          snippet: string
          title: string
        }[]
      }
      search_fuzzy: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          entity_type: string
          id: string
          similarity: number
          title: string
        }[]
      }
      search_people: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          department: string
          email: string
          full_name: string
          role: string
          user_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
    Enums: {},
  },
} as const
