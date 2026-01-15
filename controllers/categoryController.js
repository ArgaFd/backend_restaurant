const Category = require('../models/category');
const Menu = require('../models/menu');

const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort('name');
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, subcategories } = req.body;
        const existing = await Category.findOne({ name });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }
        const category = await Category.create({ name, subcategories: subcategories || [] });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const addSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { subcategory } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        if (category.subcategories.includes(subcategory)) {
            return res.status(400).json({ success: false, message: 'Subcategory already exists' });
        }

        category.subcategories.push(subcategory);
        await category.save();

        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subcategories } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const oldName = category.name;
        if (name && name !== oldName) {
            category.name = name;
            // Update all menu items associated with this category
            await Menu.updateMany({ category: oldName }, { $set: { category: name } });
        }

        if (subcategories) {
            category.subcategories = subcategories;
        }

        await category.save();
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Delete all menu items in this category
        await Menu.deleteMany({ category: category.name });

        // Delete category
        await Category.findByIdAndDelete(id);

        res.json({ success: true, message: 'Category and associated menu items deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const removeSubcategory = async (req, res) => {
    try {
        const { id, subName } = req.params;
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Remove subcategory from array
        category.subcategories = category.subcategories.filter(s => s !== subName);
        await category.save();

        // Delete all menu items in this subcategory
        await Menu.deleteMany({ category: category.name, subcategory: subName });

        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const initDefaultCategories = async () => {
    const defaults = [
        { name: 'makanan', subcategories: [] },
        { name: 'minuman', subcategories: ['bersoda', 'biasa', 'kafein'] },
        { name: 'dessert', subcategories: [] },
        { name: 'starter/snack', subcategories: [] },
        { name: 'paket', subcategories: [] }
    ];

    for (const def of defaults) {
        const exists = await Category.findOne({ name: def.name });
        if (!exists) {
            await Category.create(def);
            console.log(`Initialized category: ${def.name}`);
        }
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    removeSubcategory,
    initDefaultCategories
};
