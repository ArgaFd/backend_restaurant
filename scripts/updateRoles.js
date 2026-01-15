const { pool } = require('../config/db_postgres');

async function updateRoles() {
  try {
    console.log('Updating database schema for new role system...');
    
    // First, update existing users with invalid roles to cashier
    await pool.query(`
      UPDATE users SET role = 'cashier' 
      WHERE role NOT IN ('owner', 'cashier')
    `);
    console.log('✅ Invalid roles converted to cashier');
    
    // Then drop existing constraint if it exists
    try {
      await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
      console.log('✅ Old constraint dropped');
    } catch (error) {
      console.log('ℹ️ No existing constraint to drop');
    }
    
    // Add new constraint
    await pool.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'cashier'))
    `);
    console.log('✅ New constraint added');
    
    console.log('✅ Database schema updated successfully');
    
    // Show current users
    const result = await pool.query('SELECT id, name, email, role FROM users ORDER BY created_at');
    console.log('\n📋 Current Users:');
    if (result.rows.length === 0) {
      console.log('  No users found');
    } else {
      result.rows.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating schema:', error.message);
  } finally {
    await pool.end();
  }
}

updateRoles();
