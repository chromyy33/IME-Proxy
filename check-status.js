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
    const { code, deviceId } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ valid: false, error: "Activation code is required" });
    }

    // Query the database
    const { data, error } = await supabase
      .from("Database")
      .select("isActive, activeTill, deviceId")
      .eq("code", code)
      .single();

    if (error) {
      console.error("Database error:", error);
      return res
        .status(500)
        .json({ valid: false, error: "Error checking activation status" });
    }

    if (!data) {
      return res
        .status(200)
        .json({ valid: false, error: "Invalid activation code" });
    }

    // Device ID check
    if (data.deviceId !== deviceId) {
      return res
        .status(200)
        .json({ valid: false, error: "Device ID mismatch" });
    }

    // Check if code is marked as inactive in database
    if (!data.isActive) {
      return res.status(200).json({ valid: false, error: "Code is inactive" });
    }

    // Parse dates for comparison
    const serverExpiryDate = new Date(data.activeTill + "T23:59:59.999Z");
    const currentDate = new Date();

    // Check if current date is after expiry date
    if (currentDate > serverExpiryDate) {
      // Update the database to mark this code as inactive
      await supabase
        .from("Database")
        .update({ isActive: false })
        .eq("code", code);

      return res
        .status(200)
        .json({ valid: false, error: "Activation code has expired" });
    }

    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ valid: false, error: "Internal server error" });
  }
}
