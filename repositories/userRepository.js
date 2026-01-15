const { getPool } = require('../db/postgres');

const toUser = (row) => {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status, // Added status
    passwordHash: row.password_hash,
  };
};

const findByEmail = async (email) => {
  const pool = getPool();
  // Added status to select
  const { rows } = await pool.query('SELECT id, name, email, role, status, password_hash FROM users WHERE email = $1', [
    String(email).toLowerCase(),
  ]);
  return toUser(rows[0]);
};

const findById = async (id) => {
  const pool = getPool();
  // Added status to select
  const { rows } = await pool.query('SELECT id, name, email, role, status, password_hash FROM users WHERE id = $1', [Number(id)]);
  return toUser(rows[0]);
};

const createUser = async ({ name, email, passwordHash, role, status }) => {
  const pool = getPool();
  // Added status to insert
  const { rows } = await pool.query(
    'INSERT INTO users(name, email, password_hash, role, status) VALUES($1,$2,$3,$4,$5) RETURNING id, name, email, role, status, password_hash',
    [String(name), String(email).toLowerCase(), String(passwordHash), String(role), String(status || 'active')]
  );
  return toUser(rows[0]);
};

const getAll = async () => {
  const pool = getPool();
  // Added status to select
  const { rows } = await pool.query('SELECT id, name, email, role, status FROM users ORDER BY id ASC');
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    email: r.email,
    role: r.role,
    status: r.status
  }));
};

const ownerExists = async () => {
  const pool = getPool();
  const { rows } = await pool.query("SELECT 1 FROM users WHERE role = 'owner' LIMIT 1");
  return rows.length > 0;
};

const updateRole = async (id, role) => {
  const pool = getPool();
  const { rows } = await pool.query('UPDATE users SET role = $2 WHERE id = $1 RETURNING id, name, email, role, status', [
    Number(id),
    String(role),
  ]);
  const r = rows[0];
  if (!r) return null;
  return { id: Number(r.id), name: r.name, email: r.email, role: r.role, status: r.status };
};

const updateUser = async (id, { name, email, role, status }) => {
  const pool = getPool();
  // Updated query to handle optional updates for name, email, role, and status
  const { rows } = await pool.query(
    `UPDATE users SET 
      name = COALESCE($2, name), 
      email = COALESCE($3, email),
      role = COALESCE($4, role),
      status = COALESCE($5, status)
     WHERE id = $1 
     RETURNING id, name, email, role, status`,
    [Number(id), name, email, role, status]
  );
  const r = rows[0];
  if (!r) return null;
  return { id: Number(r.id), name: r.name, email: r.email, role: r.role, status: r.status };
};

const remove = async (id) => {
  const pool = getPool();
  const result = await pool.query('DELETE FROM users WHERE id = $1', [Number(id)]);
  return result.rowCount > 0;
};

module.exports = {
  findByEmail,
  findById,
  createUser,
  getAll,
  ownerExists,
  updateRole,
  updateUser,
  remove,
};
