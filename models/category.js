const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    subcategories: [{ type: String }],
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Category', categorySchema);
