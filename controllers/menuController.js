const Menu = require('../models/menu');
const { getNextSequence } = require('../services/mongoSequence');

const MENU_CATEGORIES = ['makanan', 'minuman', 'dessert', 'starter/snack', 'paket'];
const MENU_SUBCATEGORIES = {
  minuman: ['bersoda', 'biasa', 'kafein'],
};

const isValidCategory = (category) => MENU_CATEGORIES.includes(String(category));
const isValidSubcategory = (category, subcategory) => {
  const subs = MENU_SUBCATEGORIES[String(category)];
  if (!subs) return String(subcategory || '') === '';
  return subs.includes(String(subcategory));
};

const normalizeMenuPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  if (payload.isAvailable !== undefined && payload.is_available === undefined) {
    return { ...payload, is_available: payload.isAvailable };
  }

  return payload;
};

const getMenuItems = (req, res) => {
  const { category, subcategory, minPrice, maxPrice, q } = req.query;

  const filter = {};

  if (category) {
    filter.category = String(category);
  }

  if (subcategory) {
    filter.subcategory = String(subcategory);
  }

  const min = minPrice !== undefined ? Number(minPrice) : undefined;
  const max = maxPrice !== undefined ? Number(maxPrice) : undefined;
  if (!Number.isNaN(min) && min !== undefined) {
    filter.price = { ...(filter.price || {}), $gte: min };
  }
  if (!Number.isNaN(max) && max !== undefined) {
    filter.price = { ...(filter.price || {}), $lte: max };
  }

  const queryText = q ? String(q).trim() : '';
  if (queryText) {
    filter.$or = [{ name: { $regex: queryText, $options: 'i' } }, { description: { $regex: queryText, $options: 'i' } }];
  }

  return Menu.find(filter).lean().then((items) => res.json({ success: true, data: { items } }));
};

const getMenuItem = (req, res) => {
  return Menu.findOne({ id: Number(req.params.id) })
    .lean()
    .then((item) => {
      if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
      return res.json({ success: true, data: item });
    });
};

const createMenuItem = async (req, res) => {
  const payload = normalizeMenuPayload(req.body);

  if (!isValidCategory(payload.category)) {
    return res.status(400).json({ success: false, message: 'Invalid category' });
  }
  if (!isValidSubcategory(payload.category, payload.subcategory)) {
    return res.status(400).json({ success: false, message: 'Invalid subcategory' });
  }

  const id = await getNextSequence('menu');
  const created = await Menu.create({ ...payload, id });
  return res.status(201).json({ success: true, data: created.toObject() });
};

const updateMenuItem = (req, res) => {
  const payload = normalizeMenuPayload(req.body);

  if (payload.category !== undefined && !isValidCategory(payload.category)) {
    return res.status(400).json({ success: false, message: 'Invalid category' });
  }

  if (payload.subcategory !== undefined) {
    const cat = payload.category !== undefined ? payload.category : req.body.category;
    const effectiveCategory = cat;
    if (effectiveCategory !== undefined && !isValidSubcategory(effectiveCategory, payload.subcategory)) {
      return res.status(400).json({ success: false, message: 'Invalid subcategory' });
    }
  }

  return Menu.findOneAndUpdate({ id: Number(req.params.id) }, { $set: payload }, { new: true })
    .lean()
    .then((item) => {
      if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
      return res.json({ success: true, data: item });
    });
};

const deleteMenuItem = (req, res) => {
  return Menu.deleteOne({ id: Number(req.params.id) }).then((result) => {
    if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Menu item not found' });
    return res.json({ success: true, data: { deleted: true } });
  });
};

const getMenuCategories = (req, res) => {
  return res.json({ success: true, data: MENU_CATEGORIES });
};

const getMenuFilters = (req, res) => {
  return res.json({ success: true, data: { categories: MENU_CATEGORIES, subcategories: MENU_SUBCATEGORIES } });
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
