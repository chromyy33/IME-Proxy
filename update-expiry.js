import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, expiryDate } = req.body;

    if (!code || !expiryDate) {
      return res
        .status(400)
        .json({ success: false, error: "Code and expiry date are required" });
    }

    const { error } = await supabase
      .from("Database")
      .update({ activeTill: expiryDate })
      .eq("code", code);

    if (error) {
      console.error("Database error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to update expiry date" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}
