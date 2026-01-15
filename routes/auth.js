const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { ownerOnly } = require('../middleware/roleValidation');

// Public routes
router.post(
  '/register',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6+ characters').isLength({ min: 6 }),
    body('role', 'Role must be owner or cashier').optional().isIn(['owner', 'cashier'])
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists()
  ],
  authController.login
);

// Protected routes
router.get('/me', protect, authController.getMe);

// Owner only routes
router.get('/users', protect, ownerOnly, authController.getUsers);
router.put('/users/:id/role', protect, ownerOnly, [
  body('role', 'Role must be owner or cashier').isIn(['owner', 'cashier'])
], authController.updateUserRole);
router.delete('/users/:id', protect, ownerOnly, authController.deleteUser);

module.exports = router;
