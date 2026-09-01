export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: '13.0.5';
    };
    public: {
        Tables: {
            api_keys: {
                Row: {
                    api_key_value: string;
                    completion_tokens: number;
                    consecutive_failures: number;
                    cooldown_until: string | null;
                    created_at: string;
                    deleted_at: string | null;
                    disabled_reason: string | null;
                    failure_count: number;
                    id: string;
                    is_active: boolean;
                    last_error_at: string | null;
                    last_used_at: string | null;
                    metadata: Json;
                    name: string;
                    prompt_tokens: number;
                    provider: string;
                    success_count: number;
                    total_tokens: number;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    api_key_value: string;
                    completion_tokens?: number;
                    consecutive_failures?: number;
                    cooldown_until?: string | null;
                    created_at?: string;
                    deleted_at?: string | null;
                    disabled_reason?: string | null;
                    failure_count?: number;
                    id?: string;
                    is_active?: boolean;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    metadata?: Json;
                    name: string;
                    prompt_tokens?: number;
                    provider?: string;
                    success_count?: number;
                    total_tokens?: number;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    api_key_value?: string;
                    completion_tokens?: number;
                    consecutive_failures?: number;
                    cooldown_until?: string | null;
                    created_at?: string;
                    deleted_at?: string | null;
                    disabled_reason?: string | null;
                    failure_count?: number;
                    id?: string;
                    is_active?: boolean;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    metadata?: Json;
                    name?: string;
                    prompt_tokens?: number;
                    provider?: string;
                    success_count?: number;
                    total_tokens?: number;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            api_key_model_cooldowns: {
                Row: {
                    api_key_id: string;
                    canonical_model: string;
                    consecutive_failures: number;
                    cooldown_until: string;
                    updated_at: string;
                };
                Insert: {
                    api_key_id: string;
                    canonical_model: string;
                    consecutive_failures?: number;
                    cooldown_until: string;
                    updated_at?: string;
                };
                Update: {
                    api_key_id?: string;
                    canonical_model?: string;
                    consecutive_failures?: number;
                    cooldown_until?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'api_key_model_cooldowns_api_key_id_fkey';
                        columns: ['api_key_id'];
                        isOneToOne: false;
                        referencedRelation: 'api_keys';
                        referencedColumns: ['id'];
                    },
                ];
            };
            proxy_api_keys: {
                Row: {
                    allowed_models: string[] | null;
                    completion_tokens: number;
                    created_at: string;
                    daily_budget_usd: number | null;
                    deleted_at: string | null;
                    denied_models: string[] | null;
                    expires_at: string | null;
                    failure_count: number;
                    id: string;
                    inflight_count: number;
                    is_active: boolean;
                    last_error_at: string | null;
                    last_used_at: string | null;
                    max_concurrent: number | null;
                    max_output_tokens: number | null;
                    max_request_body_bytes: number | null;
                    metadata: Json;
                    monthly_budget_usd: number | null;
                    name: string;
                    prompt_tokens: number;
                    proxy_key_value: string;
                    rpd_limit: number | null;
                    rpm_limit: number | null;
                    success_count: number;
                    token_day_limit: number | null;
                    tpm_limit: number | null;
                    total_tokens: number;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    allowed_models?: string[] | null;
                    completion_tokens?: number;
                    created_at?: string;
                    daily_budget_usd?: number | null;
                    deleted_at?: string | null;
                    denied_models?: string[] | null;
                    expires_at?: string | null;
                    failure_count?: number;
                    id?: string;
                    inflight_count?: number;
                    is_active?: boolean;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    max_concurrent?: number | null;
                    max_output_tokens?: number | null;
                    max_request_body_bytes?: number | null;
                    metadata?: Json;
                    monthly_budget_usd?: number | null;
                    name: string;
                    prompt_tokens?: number;
                    proxy_key_value: string;
                    rpd_limit?: number | null;
                    rpm_limit?: number | null;
                    success_count?: number;
                    token_day_limit?: number | null;
                    tpm_limit?: number | null;
                    total_tokens?: number;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    allowed_models?: string[] | null;
                    completion_tokens?: number;
                    created_at?: string;
                    daily_budget_usd?: number | null;
                    deleted_at?: string | null;
                    denied_models?: string[] | null;
                    expires_at?: string | null;
                    failure_count?: number;
                    id?: string;
                    inflight_count?: number;
                    is_active?: boolean;
                    last_error_at?: string | null;
                    last_used_at?: string | null;
                    max_concurrent?: number | null;
                    max_output_tokens?: number | null;
                    max_request_body_bytes?: number | null;
                    metadata?: Json;
                    monthly_budget_usd?: number | null;
                    name?: string;
                    prompt_tokens?: number;
                    proxy_key_value?: string;
                    rpd_limit?: number | null;
                    rpm_limit?: number | null;
                    success_count?: number;
                    token_day_limit?: number | null;
                    tpm_limit?: number | null;
                    total_tokens?: number;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            proxy_key_quota_windows: {
                Row: {
                    proxy_key_id: string;
                    request_count: number;
                    reserved_cost_usd: number;
                    reserved_tokens: number;
                    settled_cost_usd: number;
                    token_count: number;
                    window_start: string;
                    window_type: string;
                };
                Insert: {
                    proxy_key_id: string;
                    request_count?: number;
                    reserved_cost_usd?: number;
                    reserved_tokens?: number;
                    settled_cost_usd?: number;
                    token_count?: number;
                    window_start: string;
                    window_type: string;
                };
                Update: {
                    proxy_key_id?: string;
                    request_count?: number;
                    reserved_cost_usd?: number;
                    reserved_tokens?: number;
                    settled_cost_usd?: number;
                    token_count?: number;
                    window_start?: string;
                    window_type?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'proxy_key_quota_windows_proxy_key_id_fkey';
                        columns: ['proxy_key_id'];
                        isOneToOne: false;
                        referencedRelation: 'proxy_api_keys';
                        referencedColumns: ['id'];
                    },
                ];
            };
            proxy_key_settlements: {
                Row: {
                    created_at: string;
                    proxy_key_id: string;
                    request_id: string;
                };
                Insert: {
                    created_at?: string;
                    proxy_key_id: string;
                    request_id: string;
                };
                Update: {
                    created_at?: string;
                    proxy_key_id?: string;
                    request_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'proxy_key_settlements_proxy_key_id_fkey';
                        columns: ['proxy_key_id'];
                        isOneToOne: false;
                        referencedRelation: 'proxy_api_keys';
                        referencedColumns: ['id'];
                    },
                ];
            };
            proxy_reconciliation_needed: {
                Row: {
                    created_at: string;
                    last_error: string | null;
                    proxy_key_id: string;
                    request_id: string;
                    resolved_at: string | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    last_error?: string | null;
                    proxy_key_id: string;
                    request_id: string;
                    resolved_at?: string | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    last_error?: string | null;
                    proxy_key_id?: string;
                    request_id?: string;
                    resolved_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'proxy_reconciliation_needed_proxy_key_id_fkey';
                        columns: ['proxy_key_id'];
                        isOneToOne: false;
                        referencedRelation: 'proxy_api_keys';
                        referencedColumns: ['id'];
                    },
                ];
            };
            user_settings: {
                Row: {
                    custom_model_pricing: Json;
                    detailed_observability: boolean;
                    id: string;
                    save_request_body: boolean;
                    save_response_body: boolean;
                    timezone: string;
                    updated_at: string;
                };
                Insert: {
                    custom_model_pricing?: Json;
                    detailed_observability?: boolean;
                    id: string;
                    save_request_body?: boolean;
                    save_response_body?: boolean;
                    timezone?: string;
                    updated_at?: string;
                };
                Update: {
                    custom_model_pricing?: Json;
                    detailed_observability?: boolean;
                    id?: string;
                    save_request_body?: boolean;
                    save_response_body?: boolean;
                    timezone?: string;
                    updated_at?: string;
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
            admit_proxy_request: {
                Args: {
                    p_body_bytes?: number;
                    p_estimated_tokens: number;
                    p_estimated_usd: number;
                    p_managed?: boolean;
                    p_model: string;
                    p_proxy_key_id: string;
                };
                Returns: Json;
            };
            cleanup_old_request_logs: {
                Args: { p_days_to_keep?: number };
                Returns: number;
            };
            current_proxy_key_quota: {
                Args: { p_proxy_key_id: string };
                Returns: Json;
            };
            get_api_key_statistics: {
                Args: { p_user_id?: string };
                Returns: Json;
            };
            get_dashboard_statistics: {
                Args: { p_user_id?: string; p_days_back?: number };
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
            get_request_logs_volume: {
                Args: { p_range?: string; p_user_id?: string };
                Returns: Json;
            };
            increment_api_key_usage: {
                Args: {
                    p_id: string;
                    p_success?: number;
                    p_failure?: number;
                    p_prompt?: number;
                    p_completion?: number;
                    p_total?: number;
                };
                Returns: undefined;
            };
            increment_proxy_api_key_usage: {
                Args: {
                    p_id: string;
                    p_success?: number;
                    p_failure?: number;
                    p_prompt?: number;
                    p_completion?: number;
                    p_total?: number;
                };
                Returns: undefined;
            };
            record_api_key_failure: {
                Args: {
                    p_id: string;
                    p_disable: boolean;
                    p_cooldown_until: string | null;
                    p_reason: string | null;
                    p_canonical_model?: string | null;
                    p_scope?: string | null;
                };
                Returns: undefined;
            };
            record_api_key_success: {
                Args: { p_id: string; p_canonical_model?: string | null };
                Returns: undefined;
            };
            settle_proxy_request: {
                Args: {
                    p_actual_tokens: number;
                    p_actual_usd: number;
                    p_day_start: string | null;
                    p_minute_start: string | null;
                    p_month_start: string | null;
                    p_proxy_key_id: string;
                    p_request_id: string;
                    p_reserved_tokens: number;
                    p_reserved_usd: number;
                };
                Returns: undefined;
            };
            finalize_proxy_request: {
                Args: {
                    p_request_id: string;
                    p_proxy_key_id: string;
                    p_api_key_id: string | null;
                    p_user_id: string;
                    p_is_successful: boolean;
                    p_request_data: Json;
                    p_response_data: Json | null;
                    p_usage: Json;
                    p_reserved_tokens: number;
                    p_reserved_usd: number;
                    p_actual_tokens: number;
                    p_actual_usd: number;
                    p_minute_start: string | null;
                    p_day_start: string | null;
                    p_month_start: string | null;
                };
                Returns: undefined;
            };
            reconcile_proxy_request: {
                Args: { p_request_id: string };
                Returns: undefined;
            };
            reset_proxy_key_quota: {
                Args: { p_proxy_key_id: string; p_window_types: string[] };
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
