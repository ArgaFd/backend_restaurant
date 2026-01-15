const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const menuController = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', menuController.getMenuItems);
router.get('/:id', menuController.getMenuItem);

// Protected routes (admin/staff only)
router.post(
  '/',
  [protect, authorize('admin', 'staff')],
  [
    body('name', 'Name is required').not().isEmpty(),
    body('description', 'Description is required').not().isEmpty(),
    body('price', 'Price is required').isNumeric(),
    body('category', 'Category is required').not().isEmpty()
  ],
  menuController.createMenuItem
);

router.put(
  '/:id',
  [protect, authorize('admin', 'staff')],
  [
    body('name', 'Name is required').optional().not().isEmpty(),
    body('description', 'Description is required').optional().not().isEmpty(),
    body('price', 'Price must be numeric').optional().isNumeric(),
    body('category', 'Category is required').optional().not().isEmpty()
  ],
  menuController.updateMenuItem
);

router.delete(
  '/:id',
  [protect, authorize('admin', 'staff')],
  menuController.deleteMenuItem
);

module.exports = router;
