const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
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
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow any localhost origin in development
      if (process.env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      } // Allow specific production domains
      else if ([
        process.env.FRONTEND_URL
      ].filter(Boolean).indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        // Optional: fail silently or log it, but for strict CORS:
        // callback(new Error('Not allowed by CORS'));
        // For development convenience, we can be permissive if needed, but regex above handles localhost
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti'
  }
});

// More aggressive rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan pembayaran, silakan coba lagi nanti'
  },
  keyGenerator: (req) => req.ip
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// Apply more strict rate limiting to payment routes
app.use('/api/payments/process', paymentLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10kb' })); // Limit JSON body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging middleware (simple version)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint to check if API is running
app.get('/', (req, res) => {
  res.send('API Restaurant App sudah berjalan!');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/owner', ownerRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// 404 Handler
app.use(notFoundHandler);

// Error Handler
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥');
  console.error(err.name, err.message);
  console.error(err.stack); // Print full stack trace

  // Only shut down in production (or if you prefer, never shut down unless critical)
  if (process.env.NODE_ENV === 'production') {
    console.error('Shutting down due to unhandled rejection...');
    server.close(() => {
      process.exit(1);
    });
  } else {
    // In development, just log it and keep running
    console.warn('⚠️ Server kept alive in development mode.');
  }
});

module.exports = app;