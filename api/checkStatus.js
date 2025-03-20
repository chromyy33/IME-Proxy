import { supabase } from "./supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, deviceId } = req.body;

    if (!code || !deviceId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("Database")
      .select("isActive, activeTill, deviceId")
      .eq("code", code)
      .single();

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ valid: false, error: "Database error" });
    }

    if (!data) {
      return res
        .status(404)
        .json({ valid: false, error: "No data found for this code" });
    }

    // Device ID check
    if (data.deviceId !== deviceId) {
      return res
        .status(400)
        .json({ valid: false, error: "Device ID mismatch" });
    }

    // Check if code is marked as inactive
    if (!data.isActive) {
      return res.status(400).json({ valid: false, error: "Code is inactive" });
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

      return res.status(400).json({ valid: false, error: "Code has expired" });
    }

    return res.status(200).json({
      valid: true,
      data: {
        expiryDate: data.activeTill,
        isActive: data.isActive,
        lastServerCheck: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ valid: false, error: "Server error" });
  }
}
