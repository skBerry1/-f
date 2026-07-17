import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Серверный клиент Supabase (service role).
 * Используется ТОЛЬКО в серверном коде (route handlers, server components).
 * RLS в БД закрыт для всех остальных — клиент в БД не ходит вообще.
 */
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase env vars are not configured");
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
