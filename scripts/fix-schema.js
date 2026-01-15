const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixSchema() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
        connectionString,
        ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    });

    try {
        const client = await pool.connect();
        console.log('Connected to DB.');

        console.log("Adding 'status' column to users table...");
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'");

        console.log("✅ Schema updated successfully.");
        client.release();
    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await pool.end();
    }
}

fixSchema();
