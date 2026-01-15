require('dotenv').config();

const app = require('./app');
const { pingPostgres } = require('./db/postgres');
const { connectMongo } = require('./db/mongo');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await pingPostgres();
  await connectMongo();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on port ${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`Local: http://localhost:${PORT}`);

    // Debug Server Key at Startup
    const sk = process.env.MIDTRANS_SERVER_KEY || '';
    const maskedSk = sk.length > 5 ? sk.substring(0, 5) + '...' + sk.substring(sk.length - 3) : 'NOT_SET';
    console.log(`[Startup] Loaded Server Key: ${maskedSk}`);
  });
};

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
