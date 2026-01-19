const Menu = require('../models/menu');
const Category = require('../models/category');
const { Op } = require('sequelize');

const normalizeMenuPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  if (payload.isAvailable !== undefined && payload.is_available === undefined) {
    return { ...payload, is_available: payload.isAvailable };
  }

  return payload;
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return string.startsWith('http://') || string.startsWith('https://');
  } catch (_) {
    return false;
  }
};

const getMenuItems = async (req, res) => {
  try {
    const { category, subcategory, minPrice, maxPrice, q } = req.query;

    const where = {};

    if (category) {
      where.category = String(category);
    }

    if (subcategory) {
      where.subcategory = String(subcategory);
    }

    const min = minPrice !== undefined ? Number(minPrice) : undefined;
    const max = maxPrice !== undefined ? Number(maxPrice) : undefined;

    if (!Number.isNaN(min) && min !== undefined) {
      where.price = { ...(where.price || {}), [Op.gte]: min };
    }
    if (!Number.isNaN(max) && max !== undefined) {
      where.price = { ...(where.price || {}), [Op.lte]: max };
    }

    const queryText = q ? String(q).trim() : '';
    if (queryText) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${queryText}%` } },
        { description: { [Op.iLike]: `%${queryText}%` } }
      ];
    }

    const items = await Menu.findAll({ where, order: [['createdAt', 'DESC']] });
    return res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('getMenuItems error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMenuItem = async (req, res) => {
  try {
    const item = await Menu.findByPk(Number(req.params.id));
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
    return res.json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const payload = normalizeMenuPayload(req.body);

    // Validate category exists in DB instead of hardcoded list
    const cat = await Category.findOne({ where: { name: payload.category } });
    if (!cat) {
      return res.status(400).json({ success: false, message: 'Invalid category. Please create the category first.' });
    }

    // Validate subcategory if provided
    if (payload.subcategory && !cat.subcategories.includes(payload.subcategory)) {
      return res.status(400).json({ success: false, message: 'Invalid subcategory for this category.' });
    }

    // Validate image_url if provided
    if (payload.image_url && !isValidUrl(payload.image_url)) {
      return res.status(400).json({ success: false, message: 'Invalid Image URL format. Must start with http:// or https://' });
    }

    const created = await Menu.create(payload);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const payload = normalizeMenuPayload(req.body);

    if (payload.category) {
      const cat = await Category.findOne({ where: { name: payload.category } });
      if (!cat) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }
      if (payload.subcategory && !cat.subcategories.includes(payload.subcategory)) {
        return res.status(400).json({ success: false, message: 'Invalid subcategory' });
      }
    }

    // Validate image_url if provided
    if (payload.image_url && !isValidUrl(payload.image_url)) {
      return res.status(400).json({ success: false, message: 'Invalid Image URL format.' });
    }

    const [updatedCount, updatedItems] = await Menu.update(payload, {
      where: { id: Number(req.params.id) },
      returning: true
    });

    if (updatedCount === 0) return res.status(404).json({ success: false, message: 'Menu item not found' });
    return res.json({ success: true, data: updatedItems[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const deletedCount = await Menu.destroy({
      where: { id: Number(req.params.id) }
    });

    if (deletedCount === 0) return res.status(404).json({ success: false, message: 'Menu item not found' });
    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMenuCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    return res.json({ success: true, data: categories.map(c => c.name) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMenuFilters = async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    const filters = {
      categories: categories.map(c => c.name),
      subcategories: categories.reduce((acc, c) => {
        if (c.subcategories.length > 0) acc[c.name] = c.subcategories;
        return acc;
      }, {})
    };
    return res.json({ success: true, data: filters });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuCategories,
  getMenuFilters,
};
