const crypto = require('crypto');
const midtransClient = require('midtrans-client');

const getSnap = () => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    const err = new Error('MIDTRANS_SERVER_KEY is required');
    err.statusCode = 500;
    err.expose = true;
    throw err;
  }

  return new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey,
    clientKey: process.env.MIDTRANS_CLIENT_KEY || undefined,
  });
};

const createSnapTransaction = async ({ orderId, grossAmount, customerDetails }) => {
  const snap = getSnap();

  const parameter = {
    transaction_details: {
      order_id: String(orderId),
      gross_amount: Number(grossAmount),
    },
    credit_card: {
      secure: true,
    },
    customer_details: customerDetails || undefined,
  };

  return snap.createTransaction(parameter);
};

// Midtrans webhook signature: sha512(order_id+status_code+gross_amount+server_key)
const verifyWebhookSignature = ({ orderId, statusCode, grossAmount, signatureKey }) => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;

  const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const hash = crypto.createHash('sha512').update(payload).digest('hex');
  return hash === signatureKey;
};

module.exports = {
  createSnapTransaction,
  verifyWebhookSignature,
};
