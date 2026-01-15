const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { register, login, getMe, getUsers, createStaffUser, updateUserRole, deleteUser } = require('../controllers/authController');
const { ownerOnly, staffOnly } = require('../middleware/roleValidation');

const router = express.Router();

// Validation rules
const registerValidationRules = [
  body('name', 'Name is required').not().isEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
];

const createStaffValidationRules = [
  body('name', 'Name is required').not().isEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
];

const loginValidationRules = [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists()
];

const updateRoleValidationRules = [
  body('role', 'Role must be owner or staff').isIn(['owner', 'staff'])
];

// Public routes
router.post('/register', registerValidationRules, validate, register);
router.post('/login', loginValidationRules, validate, login);

// Protected routes
router.get('/me', protect, getMe);

// Owner only routes
router.get('/users', protect, ownerOnly, getUsers);
router.post('/users', protect, ownerOnly, createStaffValidationRules, validate, createStaffUser);
router.put('/users/:id/role', protect, ownerOnly, updateRoleValidationRules, validate, updateUserRole);
router.delete('/users/:id', protect, ownerOnly, deleteUser);

module.exports = router;
