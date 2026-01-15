const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const schemaPath = path.join(__dirname, 'postgres_schema.sql');

async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    
    console.log('📄 Reading schema file...');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🚀 Executing schema...');
    await client.query(schema);
    
    console.log('✅ Database initialized successfully!');
    
    // Check if any users exist
    const { rows } = await client.query('SELECT count(*) FROM users');
    console.log(`📊 Current user count: ${rows[0].count}`);
    
    client.release();
  } catch (err) {
    console.error('💥 Error initializing database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
