require('dotenv').config();

const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('PostgreSQL (Sequelize) connected successfully.');

    // Sync models
    // In development, you might want { alter: true } or { force: false }
    // For now { alter: true } is helpful to ensure tables exist
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database models synced.');

    app.listen(PORT, () => {
      console.log(`API running on port ${PORT}`);
      console.log(`Local: http://localhost:${PORT}`);

      const sk = process.env.MIDTRANS_SERVER_KEY || '';
      const maskedSk = sk.length > 5 ? sk.substring(0, 5) + '...' + sk.substring(sk.length - 3) : 'NOT_SET';
      console.log(`[Startup] Loaded Server Key: ${maskedSk}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

start();
