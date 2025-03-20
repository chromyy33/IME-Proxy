import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Log environment variables status (without exposing values)
console.log("Supabase URL exists:", !!supabaseUrl);
console.log("Supabase Key exists:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase credentials. Please check environment variables."
  );
  throw new Error("Missing Supabase credentials");
}

let supabase;

try {
  supabase = createClient(supabaseUrl, supabaseKey);

  // Test the connection
  supabase
    .from("Database")
    .select("count")
    .single()
    .then(() => console.log("Supabase connection successful"))
    .catch((err) => console.error("Supabase connection test failed:", err));
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
  throw error;
}

export { supabase };
