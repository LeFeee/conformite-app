// Client Supabase côté navigateur (session stockée en cookies par @supabase/ssr).
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ENABLED } from "../config";

let client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (!SUPABASE_ENABLED) throw new Error("Supabase n'est pas configuré (mode démo).");
  client ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return client;
}
