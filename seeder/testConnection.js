require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
console.log(process.env.SUPABASE_URL, process.env.SUPABASE_KEY,"process.env.SUPABASE_URL, process.env.SUPABASE_KEY")
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testConnection() {
    const { data, error } = await supabase.from('clients').select('*').limit(1);
    
    if (error) {
        console.error("❌ Supabase Connection Error:", error);
    } else {
        console.log("✅ Supabase Connected Successfully:", data);
    }
}

testConnection();
