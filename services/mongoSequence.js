const Counter = require('../models/counter');

const getNextSequence = async (name) => {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  return doc.seq;
};

module.exports = { getNextSequence };
