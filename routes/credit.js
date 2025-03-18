const express = require('express');
const router = express.Router();
const { deposit, withdraw, reward } = require('../controllers/Credit');
const { protect } = require('../middleware/user');

router.post('/deposit', protect, deposit);
router.post('/withdraw', protect, withdraw);
// router.post('/items/:item_id', protect, buyItems); // เปลี่ยน :id เป็น :item_id

module.exports = router;