export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: '13.0.4';
    };
    public: {
        Tables: {
            api_keys: {
                Row: {
                    api_key_value: string;
                    created_at: string;
                    failure_count: number;
                    id: string;
                    is_active: boolean;
                    last_error_at: string | null;
                    last_used_at: string | null;
                    metadata: Json;
                    name: string;
                    provider: string;
                    success_count: number;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    api_key_value: string;
                    created_at?: string;
                    failure_count?: number;
                    id?: string;
                    is_active?: boolean;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    metadata?: Json;
                    name: string;
                    provider?: string;
                    success_count?: number;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    api_key_value?: string;
                    created_at?: string;
                    failure_count?: number;
                    id?: string;
                    is_active?: boolean;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    metadata?: Json;
                    name?: string;
                    provider?: string;
                    success_count?: number;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            proxy_api_keys: {
                Row: {
                    completion_tokens: number;
                    created_at: string;
                    failure_count: number;
                    id: string;
                    is_active: boolean;
                    last_error_at: string | null;
                    last_used_at: string | null;
                    metadata: Json;
                    name: string;
                    prompt_tokens: number;
                    proxy_key_value: string;
                    success_count: number;
                    total_tokens: number;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    completion_tokens?: number;
                    created_at?: string;
                    failure_count?: number;
                    id?: string;
                    is_active?: boolean;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    metadata?: Json;
                    name: string;
                    prompt_tokens?: number;
                    proxy_key_value: string;
                    success_count?: number;
                    total_tokens?: number;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    completion_tokens?: number;
                    created_at?: string;
                    failure_count?: number;
                    id?: string;
                    is_active?: boolean;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    metadata?: Json;
                    name?: string;
                    prompt_tokens?: number;
                    proxy_key_value?: string;
                    success_count?: number;
                    total_tokens?: number;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            request_logs: {
                Row: {
                    api_format: string;
                    api_key_id: string | null;
                    created_at: string;
                    error_details: Json | null;
                    id: string;
                    is_stream: boolean;
                    is_successful: boolean;
                    performance_metrics: Json;
                    proxy_key_id: string | null;
                    request_data: Json;
                    request_id: string;
                    response_data: Json | null;
                    retry_attempts: Json;
                    usage_metadata: Json | null;
                    user_id: string | null;
                };
                Insert: {
                    api_format?: string;
                    api_key_id?: string | null;
                    created_at?: string;
                    error_details?: Json | null;
                    id?: string;
                    is_stream?: boolean;
                    is_successful?: boolean;
                    performance_metrics?: Json;
                    proxy_key_id?: string | null;
                    request_data: Json;
                    request_id: string;
                    response_data?: Json | null;
                    retry_attempts?: Json;
                    usage_metadata?: Json | null;
                    user_id?: string | null;
                };
                Update: {
                    api_format?: string;
                    api_key_id?: string | null;
                    created_at?: string;
                    error_details?: Json | null;
                    id?: string;
                    is_stream?: boolean;
                    is_successful?: boolean;
                    performance_metrics?: Json;
                    proxy_key_id?: string | null;
                    request_data?: Json;
                    request_id?: string;
                    response_data?: Json | null;
                    retry_attempts?: Json;
                    usage_metadata?: Json | null;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'request_logs_api_key_id_fkey';
                        columns: ['api_key_id'];
                        isOneToOne: false;
                        referencedRelation: 'api_keys';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'request_logs_proxy_key_id_fkey';
                        columns: ['proxy_key_id'];
                        isOneToOne: false;
                        referencedRelation: 'proxy_api_keys';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            cleanup_old_request_logs: {
                Args: { p_days_to_keep?: number };
                Returns: number;
            };
            get_api_key_statistics: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_dashboard_statistics: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_filter_options_all: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_filter_options_api_formats: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_filter_options_api_key_ids: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_filter_options_error_types: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_filter_options_models: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_filter_options_proxy_key_ids: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_filter_options_status_codes: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_filter_options_user_ids: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_proxy_key_statistics: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_request_logs_statistics: {
                Args: { p_days_back?: number; p_user_id?: string };
                Returns: Json;
            };
            get_retry_statistics: {
                Args: { p_days_back?: number; p_user_id?: string };
                Returns: Json;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
            DefaultSchema['Views'])
      ? (DefaultSchema['Tables'] &
            DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema['Tables']
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema['Tables']
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema['Enums']
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
        : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
      ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema['CompositeTypes']
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
      ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    public: {
        Enums: {},
    },
} as const;
