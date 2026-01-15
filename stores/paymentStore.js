let paymentSeq = 1;
const payments = [];

const create = ({ orderId, amount, paymentMethod, provider, providerRef, status }) => {
  const payment = {
    id: paymentSeq++,
    orderId: Number(orderId),
    amount: Number(amount),
    paymentMethod: String(paymentMethod),
    provider: provider ? String(provider) : null,
    providerRef: providerRef ? String(providerRef) : null,
    status: status || 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  payments.push(payment);
  return payment;
};

const getById = (id) => payments.find((p) => p.id === Number(id));

const getByOrderId = (orderId) => payments.find((p) => p.orderId === Number(orderId));

const updateStatusById = (id, status, extra = {}) => {
  const p = getById(id);
  if (!p) return null;
  p.status = status;
  if (extra.providerRef !== undefined) p.providerRef = extra.providerRef;
  if (extra.provider !== undefined) p.provider = extra.provider;
  p.updatedAt = new Date().toISOString();
  return p;
};

const updateStatusByProviderRef = (providerRef, status) => {
  const p = payments.find((x) => x.providerRef === String(providerRef));
  if (!p) return null;
  p.status = status;
  p.updatedAt = new Date().toISOString();
  return p;
};

module.exports = {
  create,
  getById,
  getByOrderId,
  updateStatusById,
  updateStatusByProviderRef,
};
