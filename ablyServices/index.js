// index.js
require('dotenv').config();  // if using .env for config

const { createClient } = require('@supabase/supabase-js');
const Ably = require('ably');
const listeners = require('./listeners');
const internalService = require('./internalService');  // Assume this provides needed internal functions

// Load configuration (API keys, URLs, etc.)
const ABLY_API_KEY = process.env.ABLY_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;  // service role key for full DB access

// Initialize Ably and Supabase clients
const ably = new Ably.Realtime(ABLY_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Bootstrapping: start the listeners to subscribe to relevant channels
// ably.connection.on('connected', () => {
//   console.log('Ably connected, starting listeners...');
//   listeners.init(ably, supabase, internalService);
// });

// (Optional) Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('Shutting down chat service...');
  ably.close();
  process.exit(0);
});
