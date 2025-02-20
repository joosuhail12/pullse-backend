import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qplvypinkxzbohbmykei.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbHZ5cGlua3h6Ym9oYm15a2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMzg1NjUsImV4cCI6MjA1MzgxNDU2NX0.aU1miuCLext0FZjA4KLum9VuoK4GrlKorAJFZgrK-30";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
