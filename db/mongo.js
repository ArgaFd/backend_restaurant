const mongoose = require('mongoose');

let isConnected = false;

const connectMongo = async () => {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const err = new Error('MONGODB_URI is required');
    err.statusCode = 500;
    err.expose = true;
    throw err;
  }

  await mongoose.connect(uri);
  isConnected = true;
};

module.exports = {
  connectMongo,
};
