const mongoose = require('mongoose');
const MerchandiseTransaction = require('../models/MerchandiseTransaction');
const Merchandise = require('../models/Merchandise');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

//@desc         Anything about Merchandise Transaction

//@desc         getAllMerchTrans
//@route        GET /api/merchandise/transactions
//@access       Private (User and Admin) Token required
exports.getAllMerchTrans = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query; // 10 รายการต่อหน้า
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    let transactions;
    let totalItems;

    // ถ้าเป็น Admin เห็นทั้งหมด
    if (req.user.role === 'admin') {
      totalItems = await MerchandiseTransaction.countDocuments();
      transactions = await MerchandiseTransaction.find()
        .populate('merch_id user_id')
        .skip(skip)
        .limit(parsedLimit);
    } else {
      // ถ้าเป็น User เห็นเฉพาะ Transaction ของตัวเอง
      totalItems = await MerchandiseTransaction.countDocuments({ user_id: req.user._id });
      transactions = await MerchandiseTransaction.find({ user_id: req.user._id })
        .populate('merch_id user_id')
        .skip(skip)
        .limit(parsedLimit);
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

//@desc         getOneMerchTrans
//@route        GET /api/merchandise/transactions/:id
//@access       Private (User and Admin) Token required

exports.getOneMerchTrans = async (req, res) => {
  try {
    const transaction = await MerchandiseTransaction.findById(req.params.id).populate('merch_id user_id');
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//@desc         addMerchTrans
//@route        POST /api/merchandise/transactions
//@access       Private (User and Admin) Token ตรวจ credit ก่อน อันนี้ซื้อของ
exports.addMerchTrans = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.user || !req.user._id) {
      throw new Error('Not authorized, user not found');
    }

    const { merch_id, user_id, quantity, selected_merch_prop, tel, address } = req.body;
    if (!merch_id || !user_id || !quantity || quantity <= 0 || !selected_merch_prop || !tel || !address) {
      throw new Error('Invalid data');
    }

    if (!Array.isArray(selected_merch_prop)) {
      throw new Error('selected_merch_prop must be an array');
    }

    const item = await Merchandise.findById(merch_id).session(session);
    if (!item) throw new Error('Item not found');

    const user = await User.findById(user_id);
    if (!user || user._id.toString() !== req.user._id.toString()) throw new Error('Unauthorized');

    const validProps = item.merch_props.reduce((acc, prop) => {
      acc[prop.type] = prop.options;
      return acc;
    }, {});

    for (const prop of selected_merch_prop) {
      if (!prop.type || !prop.selected_option) {
        throw new Error('Each selected_merch_prop must have a type and selected_option');
      }
      if (!validProps[prop.type] || !validProps[prop.type].includes(prop.selected_option)) {
        throw new Error(`Invalid option ${prop.selected_option} for type ${prop.type}`);
      }
    }

    const merchPropTypes = item.merch_props.map(prop => prop.type);
    const selectedPropTypes = selected_merch_prop.map(prop => prop.type);
    const missingProps = merchPropTypes.filter(type => !selectedPropTypes.includes(type));
    if (missingProps.length > 0) {
      throw new Error(`Missing selection for properties: ${missingProps.join(', ')}`);
    }

    const totalCost = item.price * quantity;
    if (user.credit < totalCost) throw new Error('Insufficient credits');

    user.credit -= totalCost;
    await user.save();
    
    await Transaction.create(
      [{
        user_id: user._id,
        amount: -totalCost,
        trans_category: 'buyItems'
      }],
      { session }
    );

    const transaction = await MerchandiseTransaction.create(
      [{
        merch_id,
        user_id,
        quantity,
        selected_merch_prop,
        tel,
        address
      }],
      { session }
    );

    await session.commitTransaction();
    res.json({ success: true, transaction_id: transaction[0]._id, credits: user.credit });
  } catch (err) {
    console.log('error:', err);
    await session.abortTransaction();
    
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

//@desc         updateMerchTrans
//@route        PUT /api/merchandise/transactions/:id
//@access       Private only Admin ไว้เปลี่ยน status การจัดส่งสินค้า
exports.updateMerchTrans = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;
    if (!status) throw new Error('Invalid status');

    const transaction = await MerchandiseTransaction.findById(req.params.id).populate('user_id merch_id').session(session);
    if (!transaction) throw new Error('Transaction not found');

    if (transaction.status === 'ยกเลิก') {
      throw new Error('Cannot update a cancelled transaction');
    }

    if (status === 'ยกเลิก' && transaction.status !== 'ยกเลิก') {
      const user = await User.findById(transaction.user_id).session(session);
      const merchandise = await Merchandise.findById(transaction.merch_id).session(session);
      const totalCost = merchandise.price * transaction.quantity;
      user.credit += totalCost;
      await user.save({ session });

      await Transaction.create(
        [{
          user_id: user._id,
          amount: totalCost,
          trans_category: 'refund'
        }],
        { session }
      );
    }

    const updatedTransaction = await MerchandiseTransaction.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true, session }
    );
    if (!updatedTransaction) throw new Error('Transaction not found');

    await session.commitTransaction();
    res.json({ success: true, transaction: updatedTransaction });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

//@desc         deleteMerchTrans
//@route        DELETE /api/merchandise/transactions/:id
//@access       Private only Admin
exports.deleteMerchTrans = async (req, res) => {
  try {
    const transaction = await MerchandiseTransaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};