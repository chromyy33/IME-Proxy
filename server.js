const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase client with credentials from environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Check activation code
app.post('/api/check-activation', async (req, res) => {
  try {
    const { code, deviceId } = req.body;
    const cleanCode = code.replace(/-/g, "").toUpperCase();

    const { data, error } = await supabase
      .from("Database")
      .select("*")
      .eq("code", cleanCode)
      .eq("isActive", true)
      .single();

    if (error) {
      return res.status(400).json({ valid: false, error: "Error checking activation code" });
    }

    if (!data) {
      return res.status(400).json({ valid: false, error: "Invalid activation code" });
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

    if (currentDate > serverExpiryDate) {
      // Update the database to mark this code as inactive
      await supabase
        .from("Database")
        .update({ isActive: false })
        .eq("code", cleanCode);

      return res.status(400).json({ valid: false, error: "Activation code has expired" });
    }

    // Update or set the deviceId
    const { error: updateError } = await supabase
      .from("Database")
      .update({ deviceId: deviceId })
      .eq("code", cleanCode);

    if (updateError) {
      return res.status(400).json({ valid: false, error: "Error updating device registration" });
    }

    const activationData = {
      code: data.code,
      email: data.email,
      name: data.name,
      expiryDate: data.activeTill,
      isActive: data.isActive,
      deviceId: deviceId,
      lastServerCheck: new Date().toISOString(),
    };

    return res.json({
      valid: true,
      data: activationData,
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ valid: false, error: "Server error checking activation code" });
  }
});

// Check activation status
app.post('/api/check-status', async (req, res) => {
  try {
    const { code, deviceId } = req.body;

    const { data, error } = await supabase
      .from("Database")
      .select("isActive, activeTill, deviceId")
      .eq("code", code)
      .single();

    if (error || !data) {
      return res.json({ valid: false });
    }

    if (data.deviceId !== deviceId) {
      return res.json({ valid: false });
    }

    if (!data.isActive) {
      return res.json({ valid: false });
    }

    const serverExpiryDate = new Date(data.activeTill + "T23:59:59.999Z");
    const currentDate = new Date();

    if (currentDate > serverExpiryDate) {
      await supabase
        .from("Database")
        .update({ isActive: false })
        .eq("code", code);

      return res.json({ valid: false });
    }

    return res.json({ valid: true });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ valid: false });
  }
});

// Deactivate code
app.post('/api/deactivate', async (req, res) => {
  try {
    const { code } = req.body;

    const { error } = await supabase
      .from("Database")
      .update({
        isActive: false,
        deviceId: null,
      })
      .eq("code", code);

    if (error) {
      return res.status(400).json({ success: false, error: "Failed to deactivate code" });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ success: false, error: "Server error deactivating code" });
  }
});

// Update expiry date
app.post('/api/update-expiry', async (req, res) => {
  try {
    const { code, expiryDate } = req.body;
    const cleanCode = code.replace(/-/g, "").toUpperCase();

    const { error } = await supabase
      .from("Database")
      .update({ activeTill: expiryDate })
      .eq("code", cleanCode);

    if (error) {
      return res.status(400).json({ success: false, error: "Failed to update expiry date" });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ success: false, error: "Server error updating expiry date" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
