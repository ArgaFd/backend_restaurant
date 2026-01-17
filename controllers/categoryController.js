const Category = require('../models/category');
const Menu = require('../models/menu');

const getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name, subcategories, icon } = req.body;
        const existing = await Category.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }
        const category = await Category.create({ name, subcategories: subcategories || [], icon: icon || '🍴' });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const addSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { subcategory } = req.body;

        const category = await Category.findByPk(Number(id));
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const currentSubs = category.subcategories || [];
        if (currentSubs.includes(subcategory)) {
            return res.status(400).json({ success: false, message: 'Subcategory already exists' });
        }

        category.subcategories = [...currentSubs, subcategory];
        await category.save();

        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subcategories, icon } = req.body;

        const category = await Category.findByPk(Number(id));
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const oldName = category.name;
        if (name && name !== oldName) {
            category.name = name;
            // Update all menu items associated with this category
            await Menu.update({ category: name }, { where: { category: oldName } });
        }

        if (subcategories !== undefined) {
            category.subcategories = subcategories;
        }

        if (icon !== undefined) {
            category.icon = icon;
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
        const category = await Category.findByPk(Number(id));
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Delete all menu items in this category
        await Menu.destroy({ where: { category: category.name } });

        // Delete category
        await category.destroy();

        res.json({ success: true, message: 'Category and associated menu items deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const removeSubcategory = async (req, res) => {
    try {
        const { id, subName } = req.params;
        const category = await Category.findByPk(Number(id));
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Remove subcategory from array
        category.subcategories = (category.subcategories || []).filter(s => s !== subName);
        await category.save();

        // Delete all menu items in this subcategory
        await Menu.destroy({ where: { category: category.name, subcategory: subName } });

        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const initDefaultCategories = async () => {
    const defaults = [
        { name: 'makanan', subcategories: [], icon: '🍜' },
        { name: 'minuman', subcategories: ['bersoda', 'biasa', 'kafein'], icon: '🥤' },
        { name: 'dessert', subcategories: [], icon: '🍰' },
        { name: 'starter/snack', subcategories: [], icon: '🍿' },
        { name: 'paket', subcategories: [], icon: '🍱' }
    ];

    for (const def of defaults) {
        const exists = await Category.findOne({ where: { name: def.name } });
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
