const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

//@desc         getAllTrans
//@route        GET /api/transactions
//@access       Private (User and Admin) Token required
exports.getAllTrans = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query; // 10 รายการต่อหน้า
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    let transactions;
    let totalItems;

    // ถ้าเป็น Admin เห็นทั้งหมด
    if (req.user.role === 'admin') {
      totalItems = await Transaction.countDocuments();
      transactions = await Transaction.find()
        .populate('user_id')
        .skip(skip)
        .limit(parsedLimit)
        .sort({ created_at: -1 }); // เรียงตามวันที่ล่าสุด
    } else {
      // ถ้าเป็น User เห็นเฉพาะ Transaction ของตัวเอง
      totalItems = await Transaction.countDocuments({ user_id: req.user._id });
      transactions = await Transaction.find({ user_id: req.user._id })
        .populate('user_id')
        .skip(skip)
        .limit(parsedLimit)
        .sort({ created_at: -1 }); // เรียงตามวันที่ล่าสุด
    }

    const totalPages = Math.ceil(totalItems / parsedLimit);

    res.json({
      success: true,
      transactions,
      pagination: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: parsedPage,
        limit: parsedLimit
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//@desc         getOneTrans
//@route        GET /api/transactions/:id
//@access       Private (User and Admin) Token required
exports.getOneTrans = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('user_id');
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (req.user.role !== 'admin' && transaction.user_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};