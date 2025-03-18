const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const VishTimeStamp = require('../models/VishTimeStamp');
const Vish = require('../models/Vish');

exports.deposit = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    user.credit += amount;
    await user.save({ session });

    await Transaction.create(
      [{ user_id: user._id, amount, trans_category: 'deposit' }],
      { session }
    );

    await session.commitTransaction();
    res.json({ success: true, total_credits: user.credit });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

exports.withdraw = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = req.body;
    if (!amount || amount < 0) {
      throw new Error('Invalid amount');
    }
    if (amount < 100) {
      throw new Error('Minimum withdrawal is 100 credits');
    }

    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    const totalDeduction = amount;
    const distributed = Math.floor(amount * 0.25);

    if (user.credit < totalDeduction) {
      throw new Error('Insufficient credits');
    }

    await User.updateOne(
      { _id: req.user._id },
      { $inc: { credit: -totalDeduction } },
      { session }
    );

    await Transaction.create(
      [{ user_id: user._id, amount: -totalDeduction, trans_category: 'withdraw' }],
      { session }
    );

    // ตรวจสอบจำนวนผู้ใช้ทั้งหมดในระบบ (นอกเหนือจากตัวเอง)
    const otherUsersCount = await User.countDocuments({ _id: { $ne: req.user._id } }).session(session);
    
    // ตรวจสอบว่ามีคนที่เคยกด Like หรือไม่
    let userPointsAgg = await VishTimeStamp.aggregate([
      { $group: { _id: '$user_id', userPoints: { $sum: '$point' } } },
      { $sort: { _id: 1 } }
    ]).session(session);

    userPointsAgg = userPointsAgg.filter(
      item => item._id.toString() !== req.user._id.toString()
    );

    // เงื่อนไข: ถ้าไม่มีผู้ใช้คนอื่นในระบบเลย หรือไม่มีคนที่เคยกด Like
    if (otherUsersCount === 0 || userPointsAgg.length === 0) {
      const receivedBaht = amount * 0.5;
      await session.commitTransaction();
      return res.json({
        success: true,
        remaining_credits: user.credit - totalDeduction,
        received_baht: receivedBaht,
        distributed_baht: 0,
        distributed_users: []
      });
    }

    const globalPointsAgg = await VishTimeStamp.aggregate([
      { $group: { _id: null, totalPoints: { $sum: '$point' } } }
    ]).session(session);
    const globalPoints = globalPointsAgg.length > 0 ? globalPointsAgg[0].totalPoints : 0;

    let cummuArray = userPointsAgg.map(item => item.userPoints);
    let userIdArray = userPointsAgg.map(item => item._id);

    for (let i = 1; i < cummuArray.length; i++) {
      cummuArray[i] = cummuArray[i - 1] + cummuArray[i];
    }

    let sum = cummuArray[cummuArray.length - 1];
    let total_credit = distributed;

    const rewardMapping = {};

    for (let i = 0; i < distributed; i++) {
      random01 = Math.random();
      randomRange = random01 * sum;
      ceilRandomRange = Math.ceil(randomRange);

      let left = 0, right = cummuArray.length - 1;

      while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (cummuArray[mid] < ceilRandomRange) {
          left = mid + 1;
        } else {
          right = mid;
        }
      }

      if (!rewardMapping[left]) {
        rewardMapping[left] = 1;
      } else {
        rewardMapping[left] += 1;
      }
    }

    let updateArray = [];
    let transactionArray = [];

    for (const key of Object.keys(rewardMapping)) {
      const userId = userIdArray[parseInt(key)];
      const creditsAdded = rewardMapping[key];

      updateArray.push({
        updateOne: {
          filter: { _id: userId },
          update: { $inc: { credit: creditsAdded } }
        }
      });

      transactionArray.push({
        insertOne: {
          document: {
            user_id: userId,
            amount: creditsAdded,
            trans_category: 'reward-withdraw'
          }
        }
      });
    }

    if (updateArray.length > 0) {
      await User.bulkWrite(updateArray, { session });
      await Transaction.bulkWrite(transactionArray, { session });
    }

    const receivedBaht = amount * 0.5;
    const distributedBaht = distributed * 0.5;

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      remaining_credits: user.credit - totalDeduction,
      received_baht: receivedBaht,
      distributed_baht: distributedBaht,
      distributed_users: Object.keys(rewardMapping).map(key => ({
        user_id: userIdArray[parseInt(key)],
        credits_added: rewardMapping[key]
      }))
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};