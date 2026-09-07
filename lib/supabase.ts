import { createClient } from "@supabase/supabase-js";

// Pakai service role key - HANYA dipanggil dari server (API routes), jangan pernah di client.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
