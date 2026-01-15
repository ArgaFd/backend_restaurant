const midtransClient = require('midtrans-client');

const verifyMidtransNotification = (req, res, next) => {
  const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
  });

  snap.transaction.notification(JSON.stringify(req.body))
    .then((statusResponse) => {
      req.paymentStatus = statusResponse;
      next();
    })
    .catch((err) => {
      console.error('Error verifying Midtrans notification:', err);
      return res.status(400).json({ success: false, message: 'Invalid notification' });
    });
};

module.exports = verifyMidtransNotification;