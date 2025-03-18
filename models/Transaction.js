const mongoose = require('mongoose');
const User = require('./User');
const { getThaiTime } = require('../utils/timeUtils');

const transactionSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    trans_category: { 
        type: String, 
        enum: ['deposit', 'withdraw', 'reward-withdraw', 'reward-bon', 'buyItems', 'refund', 'bon', 'delete-bon'], 
        required: true 
    },
    created_at: { 
        type: Date, 
        default: () => getThaiTime()
    }
});

transactionSchema.pre("validate", async function (next) {
    try {
      const userExists = await User.exists({ _id: this.user_id });
      
      if (!userExists) {
        const error = new Error(`No User with ID ${this.user_id}`);
        error.statusCode = 400; 
        return next(error);
      }

      //amount ต้องมากกว่า 0 สำหรับ trans_category ที่ไม่ใช่ withdraw หรือ buyItems
    if (['deposit', 'reward', 'refund'].includes(this.trans_category) && this.amount <= 0) {
      const error = new Error(`Amount must be greater than 0 for ${this.trans_category}`);
      error.statusCode = 400;
      return next(error);
    }

    //withdraw และ buyItems ต้องเป็นจำนวนติดลบ
    if (['withdraw', 'buyItems'].includes(this.trans_category) && this.amount >= 0) {
      const error = new Error(`Amount must be negative for ${this.trans_category}`);
      error.statusCode = 400;
      return next(error);
    }
  
      next();
    } catch (error) {
      next(error);
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);