'use client';

import { type CustomParams } from '@refinedev/core';
import { dataProvider as dataProviderSupabase } from '@refinedev/supabase';
import { supabaseBrowserClient } from '@utils/supabase/client';

const supabaseDP = dataProviderSupabase(supabaseBrowserClient);

export const dataProvider: typeof supabaseDP = {
    ...supabaseDP,
    custom: ({ url, method, sorters, filters, payload, query, headers, meta }: CustomParams) => {
        console.log({ url, method, sorters, filters, payload, query, headers, meta });
        throw Error('Not implemented on refine-supabase data provider.');
    },
};
