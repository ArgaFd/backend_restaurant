const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sequelize = require('./config/database');
require('dotenv').config();

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Import routes
console.log('Loading authRoutes...');
const authRoutes = require('./routes/authRoutes');
console.log('Loading menuRoutes...');
const menuRoutes = require('./routes/menuRoutes');
console.log('Loading orderRoutes...');
const orderRoutes = require('./routes/orderRoutes');
console.log('Loading paymentRoutes...');
const paymentRoutes = require('./routes/paymentRoutes');
console.log('Loading staffRoutes...');
const staffRoutes = require('./routes/staffRoutes');
console.log('Loading ownerRoutes...');
const ownerRoutes = require('./routes/ownerRoutes');
const { initDefaultCategories } = require('./controllers/categoryController');

// Initialize default categories
initDefaultCategories().catch(console.error);

console.log('All routes loaded successfully.');

// Initialize Express app
const app = express();

// Trust first proxy (important if behind a reverse proxy like Nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (process.env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      } else if ([
        process.env.FRONTEND_URL
      ].filter(Boolean).indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Nonce', 'X-Timestamp']
  })
);

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti'
  }
});

app.use(apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('API Restaurant App sudah berjalan (PostgreSQL only)!');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/owner', ownerRoutes);

// Serve static files in production - REMOVED for separate deployment
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../frontend/dist')));
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
//   });
// }

// 404 Handler
app.use(notFoundHandler);

// Error Handler
app.use(errorHandler);

module.exports = app;