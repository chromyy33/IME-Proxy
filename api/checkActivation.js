import { supabase } from "./supabase";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://kalnohgfehbmfjhombmifdkincofmoni');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, deviceId } = req.body;
    console.log("Received activation request:", { code, deviceId });

    if (!code || !deviceId) {
      console.log("Missing required fields:", { code, deviceId });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const cleanCode = code.replace(/-/g, "").toUpperCase();
    console.log("Cleaned code:", cleanCode);

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
      console.log("No active code found for:", cleanCode);
      return res
        .status(404)
        .json({ valid: false, error: "Invalid activation code" });
    }

    console.log("Found code data:", data);

    // If there's no deviceId in the database or it matches the current one, proceed
    if (!data.deviceId || data.deviceId === deviceId) {
      // Parse dates for comparison
      const serverExpiryDate = new Date(data.activeTill + "T23:59:59.999Z");
      const currentDate = new Date();
      console.log("Date comparison:", {
        currentDate: currentDate.toISOString(),
        expiryDate: serverExpiryDate.toISOString(),
      });

      // Check if current date is after expiry date
      if (currentDate > serverExpiryDate) {
        console.log("Code has expired");
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
      console.log("Updating device ID for code:", cleanCode);
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
        activeTill: data.activeTill,
        isActive: data.isActive,
        deviceId: deviceId,
      };

      console.log("Activation successful:", activationData);
      return res.status(200).json({ valid: true, data: activationData });
    } else {
      // Code is already used on another device
      console.log("Code already in use on device:", data.deviceId);
      return res.status(400).json({
        valid: false,
        error: "This activation code is already in use on another device",
        alreadyActivated: true,
      });
    }
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ valid: false, error: "Server error checking activation code" });
  }
}
