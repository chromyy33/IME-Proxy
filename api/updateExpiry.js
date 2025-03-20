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
    const { code, expiryDate } = req.body;
    console.log("Received expiry update request:", { code, expiryDate });

    if (!code || !expiryDate) {
      console.log("Missing required fields:", { code, expiryDate });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const cleanCode = code.replace(/-/g, "").toUpperCase();
    console.log("Cleaned code:", cleanCode);

    const { error } = await supabase
      .from("Database")
      .update({ activeTill: expiryDate })
      .eq("code", cleanCode);

    if (error) {
      console.error("Database error:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to update expiry date" });
    }

    console.log("Successfully updated expiry date for code:", cleanCode);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Server error updating expiry date" });
  }
}
