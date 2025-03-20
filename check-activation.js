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
      .select("*")
      .eq("code", code)
      .eq("isActive", true)
      .single();

    if (error) {
      console.error("Database error:", error);
      return res
        .status(500)
        .json({ valid: false, error: "Error checking activation code" });
    }

    if (!data) {
      return res
        .status(200)
        .json({ valid: false, error: "Invalid activation code" });
    }

    // Check if code is already used on another device
    if (data.deviceId && data.deviceId !== deviceId) {
      return res.status(200).json({
        valid: false,
        error: "This activation code is already in use on another device",
        alreadyActivated: true,
      });
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

    // Update or set the deviceId
    const { error: updateError } = await supabase
      .from("Database")
      .update({ deviceId: deviceId })
      .eq("code", code);

    if (updateError) {
      console.error("Error updating device ID:", updateError);
      return res
        .status(500)
        .json({ valid: false, error: "Error updating device registration" });
    }

    return res.status(200).json({
      valid: true,
      data: {
        code: data.code,
        email: data.email,
        name: data.name,
        expiryDate: data.activeTill,
        isActive: data.isActive,
        deviceId: deviceId,
      },
    });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ valid: false, error: "Internal server error" });
  }
}
