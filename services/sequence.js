// services/sequence.js
const mongoose = require('mongoose');
const Counter = require('../models/counter');

const getNextSequence = async (name) => {
  const result = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
};

module.exports = { getNextSequence };