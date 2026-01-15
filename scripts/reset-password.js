const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function resetPassword() {
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
        console.log('🔌 Connected to DB.');

        const email = 'adi@mail.com';
        const newPassword = 'password123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log(`🔐 Resetting password for ${email}...`);
        const { rowCount } = await client.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [hashedPassword, email]
        );

        if (rowCount > 0) {
            console.log(`✅ Password for ${email} has been reset to: ${newPassword}`);
        } else {
            console.log(`⚠️ User ${email} not found. Creating user...`);
            // Fallback: Create user if not exists
            await client.query(
                "INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, 'owner', 'active')",
                ['Owner Adi', email, hashedPassword]
            );
            console.log(`✅ User ${email} created with password: ${newPassword}`);
        }

        client.release();
    } catch (err) {
        console.error('💥 Error resetting password:', err);
    } finally {
        await pool.end();
    }
}

resetPassword();
