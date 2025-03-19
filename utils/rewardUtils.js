const mongoose = require('mongoose');
const Vish = require('../models/Vish');
const VishTimeStamp = require('../models/VishTimeStamp');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const rewardUtil = async (vishId, userId) => {
  const mongooseSession = await mongoose.startSession();
  mongooseSession.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(vishId)) {
      throw new Error('Invalid Vish ID');
    }

    const vish = await Vish.findById(vishId).session(mongooseSession);
    if (!vish) {
      throw new Error('Vish not found');
    }
    if (!vish.is_bon) {
      throw new Error('This Vish is not a Bon');
    }

    if (vish.is_success) {
      throw new Error('This Vish has already been rewarded');
    }

    if (vish.bon_condition === false) {
      if (vish.user_id.toString() !== userId.toString()) {
        throw new Error('Only the poster can trigger reward for success condition');
      }
    } else if (vish.bon_condition === true) {
      if (vish.vish_count < vish.bon_vish_target) {
        throw new Error(`Vish count (${vish.vish_count}) must reach ${vish.bon_vish_target} to distribute rewards`);
      }
    }
    
    // Visit this agiain later naja
    const vishTimestamps = await VishTimeStamp.find({ vish_id: vishId, status: true });
    if (vishTimestamps.length === 0) {
      throw new Error('No users have Vished this post');
    }
    
    const vishers = vishTimestamps.map(ts => ts.user_id.toString());
    var uniqueVishers = [...new Set(vishers)];
    console.log("Owner of vhis vish" + vish.user_id.toString())
    console.log(uniqueVishers)
    uniqueVishers = uniqueVishers.filter((visher) => visher != vish.user_id.toString())
    console.log(uniqueVishers)

    if (uniqueVishers.length < vish.bon_vish_target && vish.bon_condition == 1) {
      throw new Error('Total vish count must be greater than or equal to bon_vish_target');
    }

    if (uniqueVishers.length < vish.distribution) {
      throw new Error('Not enough users to distribute rewards');
    }

    
    const creditsPerUser = vish.bon_credit;
    if (creditsPerUser <= 0) {
      throw new Error('Invalid bon_credit');
    }
    
    const shuffledVishers = [...uniqueVishers];
    for (let i = shuffledVishers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledVishers[i], shuffledVishers[j]] = [shuffledVishers[j], shuffledVishers[i]];
    }
    const selectedVishers = shuffledVishers.slice(0, vish.distribution);
    
    const updateOperations = selectedVishers.map(userId => ({
      updateOne: {
        filter: { _id: userId },
        update: { $inc: { credit: creditsPerUser } }
      }
    }));
    
    const transactionData = selectedVishers.map(userId => ({
      user_id: userId,
      amount: creditsPerUser,
      trans_category: 'reward-bon',
      created_at: new Date()
    }));
    
    await User.bulkWrite(updateOperations, { session: mongooseSession });
    await Transaction.insertMany(transactionData, { session: mongooseSession });
    
    vish.is_success = true;
    await vish.save({ session: mongooseSession });
    
    await mongooseSession.commitTransaction();
    
    return {
      success: true,
      distributed_credits: creditsPerUser,
      distributed_users: selectedVishers.map(userId => ({ user_id: userId, credits_added: creditsPerUser }))
    };
  } catch (err) {
    console.log(err)
    await mongooseSession.abortTransaction();
    return {
      success : false,
      msg : err.message
    }
    // throw err;
  } finally {
    mongooseSession.endSession();
  }
};

module.exports = rewardUtil;