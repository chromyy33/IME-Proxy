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
    const { code } = req.body;
    console.log("Received deactivation request for code:", code);

    if (!code) {
      console.log("Missing code in request");
      return res.status(400).json({ error: "Missing code" });
    }

    const { error } = await supabase
      .from("Database")
      .update({
        isActive: false,
        deviceId: null,
      })
      .eq("code", code);

    if (error) {
      console.error("Database error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to deactivate code" });
    }

    console.log("Successfully deactivated code:", code);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Server error deactivating code" });
  }
}
