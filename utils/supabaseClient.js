/**
 * Supabase client singleton.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment variables.
 * Throws a clear error at import time if the variables are absent so that
 * misconfiguration is caught early.
 */

const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const missing = [
  !SUPABASE_URL && "SUPABASE_URL",
  !SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
].filter(Boolean);

if (missing.length > 0) {
  throw new Error(
    `Missing Supabase credentials: ${missing.join(", ")}. ` +
      "Please set these environment variables before running the hybrid scraper."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    // Service-role key — skip automatic JWT refresh used by browser clients.
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = supabase;
