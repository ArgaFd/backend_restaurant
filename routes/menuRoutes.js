const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuFilters
} = require('../controllers/menuController');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  addSubcategory,
  removeSubcategory
} = require('../controllers/categoryController');

const router = express.Router();

// Public routes
router.get('/', getMenuItems);
router.get('/filters', getMenuFilters);

// Category Management (Public/Protected mixed logic, simplified for now)
router.get('/categories', getCategories); // Fetch from DB now
// router.get('/categories', getMenuCategories); // OLD

router.get('/:id', [
  param('id', 'Please provide a valid menu item ID').isInt()
], validate, getMenuItem);

// Protected Category Routes
router.post('/categories', [protect, authorize('owner')], createCategory);
router.put('/categories/:id', [protect, authorize('owner')], updateCategory);
router.delete('/categories/:id', [protect, authorize('owner')], deleteCategory);
router.post('/categories/:id/subcategories', [protect, authorize('owner')], addSubcategory);
router.delete('/categories/:id/subcategories/:subName', [protect, authorize('owner')], removeSubcategory);

// Protected routes (require authentication and admin role)
router.use(protect);
router.use(authorize('owner'));

router.post('/', [
  body('name', 'Name is required').not().isEmpty(),
  body('price', 'Please include a valid price').isFloat({ min: 0 }),
  body('category', 'Category is required').isIn(['makanan', 'minuman', 'dessert', 'starter/snack', 'paket']),
  body('subcategory').optional().isString().isIn(['bersoda', 'biasa', 'kafein'])
], validate, createMenuItem);

router.put('/:id', [
  param('id', 'Please provide a valid menu item ID').isInt(),
  body('price', 'Please include a valid price').optional().isFloat({ min: 0 }),
  body('category').optional().isIn(['makanan', 'minuman', 'dessert', 'starter/snack', 'paket']),
  body('subcategory').optional().isString().isIn(['bersoda', 'biasa', 'kafein']),
  body('isAvailable', 'isAvailable must be a boolean').optional().isBoolean()
], validate, updateMenuItem);

router.delete('/:id', [
  param('id', 'Please provide a valid menu item ID').isInt()
], validate, deleteMenuItem);

module.exports = router;
