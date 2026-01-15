const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    subcategory: { type: String, default: '' },
    description: { type: String, default: '' },
    image_url: { type: String, default: '' },
    is_available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Menu', MenuSchema);
