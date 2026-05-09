const { createClient } = require("@supabase/supabase-js");
const dns = require("dns");
const WebSocket = require("ws");

// Set DNS resolution preference to IPv4 to avoid ENOTFOUND issues in some environments
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require("dotenv").config();

// Use .trim() to eliminate any hidden whitespace or newline characters from .env
const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
const supabaseKey = (process.env.SUPABASE_KEY || "").trim();

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        transport: WebSocket
      }
    });
  } catch (err) {
    console.error("❌ Failed to initialize Supabase client:", err.message);
  }
} else {
  console.warn("⚠️ Supabase credentials missing or empty. Running without DB persistence.");
}

module.exports = supabase;
