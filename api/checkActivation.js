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

    const cleanCode = code.replace(/-/g, "").toUpperCase();

    const { data, error } = await supabase
      .from("Database")
      .select("*")
      .eq("code", cleanCode)
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
        .status(404)
        .json({ valid: false, error: "Invalid activation code" });
    }

    // Check if code is already used on another device
    if (data.deviceId && data.deviceId !== deviceId) {
      return res.status(400).json({
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
        .eq("code", cleanCode);

      return res
        .status(400)
        .json({ valid: false, error: "Activation code has expired" });
    }

    // Update or set the deviceId
    const { error: updateError } = await supabase
      .from("Database")
      .update({ deviceId: deviceId })
      .eq("code", cleanCode);

    if (updateError) {
      console.error("Error updating device ID:", updateError);
      return res
        .status(500)
        .json({ valid: false, error: "Error updating device registration" });
    }

    // Return activation data
    const activationData = {
      code: data.code,
      email: data.email,
      name: data.name,
      expiryDate: data.activeTill,
      isActive: data.isActive,
      deviceId: deviceId,
      lastServerCheck: new Date().toISOString(),
    };

    return res.status(200).json({
      valid: true,
      data: activationData,
    });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ valid: false, error: "Server error checking activation code" });
  }
}
