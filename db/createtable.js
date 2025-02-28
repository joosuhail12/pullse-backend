require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://your-supabase-url.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || "your-supabase-key";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const schemaDir = path.join(__dirname, 'schema');

/**
 * Check if a table exists in Supabase
 * @param {string} tableName - Name of the table
 * @returns {boolean} - True if table exists, otherwise false
 */
async function tableExists(tableName) {
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

    if (error || !data || data.length === 0) {
        console.log(`⚠️ Table ${tableName} does not exist.`);
        return false;
    }

    return true;
}

/**
 * Get the existing columns of a table
 * @param {string} tableName - Name of the table
 * @returns {Set} - A set of existing column names
 */
async function getExistingColumns(tableName) {
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

    if (error || !data) {
        console.error(`⚠️ Could not fetch columns for ${tableName}.`);
        return new Set();
    }

    return new Set(data.map(row => row.column_name));
}

/**
 * Process SQL files and ensure tables & columns exist
 */
async function createOrUpdateTables() {
    try {
        const files = fs.readdirSync(schemaDir);

        for (const file of files) {
            if (path.extname(file) === '.sql') {
                const filePath = path.join(schemaDir, file);
                const sql = fs.readFileSync(filePath, 'utf8');

                // Extract table name from SQL file
                const tableNameMatch = sql.match(/CREATE TABLE (\w+)/i);
                if (!tableNameMatch) {
                    console.error(`⚠️ Skipping ${file}: No CREATE TABLE statement found.`);
                    continue;
                }
                const tableName = tableNameMatch[1];


                if (await tableExists(tableName)) {

                    // Get existing columns
                    const existingColumns = await getExistingColumns(tableName);

                    // Extract column names from SQL file
                    const columnMatches = sql.match(/\b(\w+)\s+[A-Z]+/g);
                    if (!columnMatches) continue;

                    const newColumns = columnMatches
                        .map(col => col.split(' ')[0])
                        .filter(col => !existingColumns.has(col));

                    if (newColumns.length > 0) {
                        for (const column of newColumns) {
                            const alterSql = `ALTER TABLE ${tableName} ADD COLUMN ${column} TEXT;`;
                            const { error } = await supabase.rpc('execute_sql', { sql: alterSql });
                            if (error) {
                                console.error(`❌ Error adding column ${column} to ${tableName}:`, error.message);
                            }
                        }
                    } else {
                        console.log(`✅ All columns are already in ${tableName}`);
                    }
                } else {
                    const { error } = await supabase.rpc('execute_sql', { sql });
                    if (error) {
                        console.error(`❌ Error creating table ${tableName}:`, error.message);
                    }
                }
            }
        }
    } catch (err) {
        console.error('❌ Error creating/updating tables:', err.message);
    }
}

createOrUpdateTables();
