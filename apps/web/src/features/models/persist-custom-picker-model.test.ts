import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@gemini-proxy/database';
import { persistCustomPickerModel } from './persist-custom-picker-model';

type DbError = { message: string } | null;

type MockState = {
    existingCatalog: { model_id: string } | null;
    existingError: DbError;
    catalogUpsertError: DbError;
    settings: { id: string; custom_model_pricing: Json } | null;
    settingsReadError: DbError;
    settingsWriteError: DbError;
    catalogUpserts: unknown[];
    catalogDeletes: Array<Record<string, string>>;
    settingsWrites: Array<{ kind: 'update' | 'insert'; payload: unknown }>;
};

function createState(overrides: Partial<MockState> = {}): MockState {
    return {
        existingCatalog: null,
        existingError: null,
        catalogUpsertError: null,
        settings: null,
        settingsReadError: null,
        settingsWriteError: null,
        catalogUpserts: [],
        catalogDeletes: [],
        settingsWrites: [],
        ...overrides,
    };
}

function createClient(state: MockState): SupabaseClient<Database> {
    return {
        from(table: string) {
            if (table === 'user_model_catalog') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    eq() {
                                        return {
                                            maybeSingle: async () => ({
                                                data: state.existingCatalog,
                                                error: state.existingError,
                                            }),
                                        };
                                    },
                                };
                            },
                        };
                    },
                    upsert: async (payload: unknown) => {
                        state.catalogUpserts.push(payload);
                        return { error: state.catalogUpsertError };
                    },
                    delete() {
                        const filters: Record<string, string> = {};
                        const builder = {
                            eq(column: string, value: string) {
                                filters[column] = value;
                                return builder;
                            },
                            then(resolve: (value: { error: null }) => void) {
                                state.catalogDeletes.push({ ...filters });
                                resolve({ error: null });
                            },
                        };
                        return builder;
                    },
                };
            }
            if (table === 'user_settings') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    maybeSingle: async () => ({
                                        data: state.settings,
                                        error: state.settingsReadError,
                                    }),
                                };
                            },
                        };
                    },
                    update(payload: unknown) {
                        return {
                            eq: async () => {
                                state.settingsWrites.push({ kind: 'update', payload });
                                return { error: state.settingsWriteError };
                            },
                        };
                    },
                    insert: async (payload: unknown) => {
                        state.settingsWrites.push({ kind: 'insert', payload });
                        return { error: state.settingsWriteError };
                    },
                };
            }
            throw new Error(`unexpected table ${table}`);
        },
    } as unknown as SupabaseClient<Database>;
}

describe('persistCustomPickerModel', () => {
    it('upserts a catalog row without touching settings when pricing is omitted', async () => {
        const state = createState();
        const actual = await persistCustomPickerModel({
            supabase: createClient(state),
            userId: 'user-1',
            modelId: 'my-finetune',
            inputPerMillion: null,
            outputPerMillion: null,
        });
        expect(actual).toEqual({ ok: true });
        expect(state.catalogUpserts).toEqual([
            {
                user_id: 'user-1',
                model_id: 'my-finetune',
                source: 'custom',
                supports_generate: true,
            },
        ]);
        expect(state.settingsWrites).toEqual([]);
        expect(state.catalogDeletes).toEqual([]);
    });

    it('inserts pricing when user_settings is missing', async () => {
        const state = createState();
        const actual = await persistCustomPickerModel({
            supabase: createClient(state),
            userId: 'user-1',
            modelId: 'my-finetune',
            inputPerMillion: 1.25,
            outputPerMillion: 5,
        });
        expect(actual).toEqual({ ok: true });
        expect(state.settingsWrites).toEqual([
            {
                kind: 'insert',
                payload: {
                    id: 'user-1',
                    custom_model_pricing: {
                        'my-finetune': { inputPerMillion: 1.25, outputPerMillion: 5 },
                    },
                },
            },
        ]);
        expect(state.catalogDeletes).toEqual([]);
    });

    it('deletes a newly inserted catalog row when pricing write fails', async () => {
        const state = createState({ settingsWriteError: { message: 'rls' } });
        const actual = await persistCustomPickerModel({
            supabase: createClient(state),
            userId: 'user-1',
            modelId: 'my-finetune',
            inputPerMillion: 1,
            outputPerMillion: null,
        });
        expect(actual).toEqual({ ok: false });
        expect(state.catalogDeletes).toEqual([
            { user_id: 'user-1', model_id: 'my-finetune', source: 'custom' },
        ]);
    });

    it('leaves an existing catalog row when pricing write fails', async () => {
        const state = createState({
            existingCatalog: { model_id: 'my-finetune' },
            settings: { id: 'user-1', custom_model_pricing: {} },
            settingsWriteError: { message: 'rls' },
        });
        const actual = await persistCustomPickerModel({
            supabase: createClient(state),
            userId: 'user-1',
            modelId: 'my-finetune',
            inputPerMillion: 1,
            outputPerMillion: 2,
        });
        expect(actual).toEqual({ ok: false });
        expect(state.catalogDeletes).toEqual([]);
        expect(state.settingsWrites).toHaveLength(1);
    });

    it('deletes a newly inserted catalog row when settings cannot be read', async () => {
        const state = createState({ settingsReadError: { message: 'timeout' } });
        const actual = await persistCustomPickerModel({
            supabase: createClient(state),
            userId: 'user-1',
            modelId: 'my-finetune',
            inputPerMillion: 0,
            outputPerMillion: 0,
        });
        expect(actual).toEqual({ ok: false });
        expect(state.settingsWrites).toEqual([]);
        expect(state.catalogDeletes).toEqual([
            { user_id: 'user-1', model_id: 'my-finetune', source: 'custom' },
        ]);
    });
});
