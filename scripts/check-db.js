const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkDb() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL missing');
        return;
    }

    const pool = new Pool({
        connectionString,
        ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    });

    try {
        const client = await pool.connect();
        console.log('Connected to DB.');

        const res = await client.query('SELECT id, email, role, status FROM users');
        console.log(`Found ${res.rows.length} users.`);
        res.rows.forEach(r => console.log(`- ${r.email} (${r.role}) [${r.status}]`));

        client.release();
    } catch (err) {
        console.error('Error querying DB:', err);
    } finally {
        await pool.end();
    }
}

checkDb();
