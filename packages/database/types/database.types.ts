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
                    created_at: string | null;
                    failure_count: number;
                    id: string;
                    is_active: boolean;
                    last_error_at: string | null;
                    last_used_at: string | null;
                    metadata: Json | null;
                    name: string;
                    provider: string;
                    success_count: number;
                    updated_at: string | null;
                    user_id: string | null;
                };
                Insert: {
                    api_key_value: string;
                    created_at?: string | null;
                    failure_count?: number;
                    id?: string;
                    is_active?: boolean;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    metadata?: Json | null;
                    name: string;
                    provider?: string;
                    success_count?: number;
                    updated_at?: string | null;
                    user_id?: string | null;
                };
                Update: {
                    api_key_value?: string;
                    created_at?: string | null;
                    failure_count?: number;
                    id?: string;
                    is_active?: boolean;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    metadata?: Json | null;
                    name?: string;
                    provider?: string;
                    success_count?: number;
                    updated_at?: string | null;
                    user_id?: string | null;
                };
                Relationships: [];
            };
            proxy_api_keys: {
                Row: {
                    completion_tokens: number;
                    created_at: string | null;
                    failure_count: number;
                    id: string;
                    is_active: boolean;
                    key_id: string;
                    last_error_at: string | null;
                    last_used_at: string | null;
                    metadata: Json | null;
                    name: string;
                    prompt_tokens: number;
                    success_count: number;
                    total_tokens: number;
                    updated_at: string | null;
                    user_id: string | null;
                };
                Insert: {
                    completion_tokens?: number;
                    created_at?: string | null;
                    failure_count?: number;
                    id?: string;
                    is_active?: boolean;
                    key_id: string;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    metadata?: Json | null;
                    name: string;
                    prompt_tokens?: number;
                    success_count?: number;
                    total_tokens?: number;
                    updated_at?: string | null;
                    user_id?: string | null;
                };
                Update: {
                    completion_tokens?: number;
                    created_at?: string | null;
                    failure_count?: number;
                    id?: string;
                    is_active?: boolean;
                    key_id?: string;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    metadata?: Json | null;
                    name?: string;
                    prompt_tokens?: number;
                    success_count?: number;
                    total_tokens?: number;
                    updated_at?: string | null;
                    user_id?: string | null;
                };
                Relationships: [];
            };
            request_logs: {
                Row: {
                    api_format: string;
                    api_key_id: string;
                    created_at: string | null;
                    error_details: Json | null;
                    id: string;
                    is_stream: boolean;
                    is_successful: boolean;
                    performance_metrics: Json | null;
                    proxy_key_id: string | null;
                    request_data: Json;
                    request_id: string;
                    response_data: Json | null;
                    retry_attempts: Json | null;
                    usage_metadata: Json | null;
                    user_id: string | null;
                };
                Insert: {
                    api_format?: string;
                    api_key_id: string;
                    created_at?: string | null;
                    error_details?: Json | null;
                    id?: string;
                    is_stream?: boolean;
                    is_successful?: boolean;
                    performance_metrics?: Json | null;
                    proxy_key_id?: string | null;
                    request_data: Json;
                    request_id: string;
                    response_data?: Json | null;
                    retry_attempts?: Json | null;
                    usage_metadata?: Json | null;
                    user_id?: string | null;
                };
                Update: {
                    api_format?: string;
                    api_key_id?: string;
                    created_at?: string | null;
                    error_details?: Json | null;
                    id?: string;
                    is_stream?: boolean;
                    is_successful?: boolean;
                    performance_metrics?: Json | null;
                    proxy_key_id?: string | null;
                    request_data?: Json;
                    request_id?: string;
                    response_data?: Json | null;
                    retry_attempts?: Json | null;
                    usage_metadata?: Json | null;
                    user_id?: string | null;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            insert_sample_api_key: {
                Args: { p_api_key_value: string; p_name: string; p_user_id: string };
                Returns: string;
            };
            insert_sample_proxy_key: {
                Args: { p_key_id: string; p_name: string; p_user_id: string };
                Returns: string;
            };
            update_api_key_usage: {
                Args: {
                    p_api_key_id: string;
                    p_failure_count: number;
                    p_success_count: number;
                };
                Returns: undefined;
            };
            update_proxy_api_key_usage: {
                Args: {
                    p_completion_tokens: number;
                    p_failure_count: number;
                    p_prompt_tokens: number;
                    p_proxy_api_key_id: string;
                    p_success_count: number;
                    p_total_tokens: number;
                };
                Returns: undefined;
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
