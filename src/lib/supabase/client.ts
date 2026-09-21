import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-project.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://mock-project.supabase.co'
  );
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
  }
  return client;
}
