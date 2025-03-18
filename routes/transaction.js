const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/user');
const { getAllTrans, getOneTrans } = require('../controllers/Transaction');

// @route   GET /api/transactions
// @desc    Get all transactions
// @access  Private
router.get('/', protect, getAllTrans);

// @route   GET /api/transactions/:id
// @desc    Get one transaction
// @access  Private
router.get('/:id', protect, getOneTrans);

module.exports = router;