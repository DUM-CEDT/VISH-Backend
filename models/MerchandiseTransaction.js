const mongoose = require('mongoose');
const Merchandise = require('./Merchandise');
const User = require('./User');
const { getThaiTime } = require('../utils/timeUtils');

const merchandiseTransactionSchema = new mongoose.Schema({
    merch_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Merchandise', 
        required: true 
    },
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    quantity: { 
        type: Number, 
        required: true 
    }, 
    selected_merch_prop: { 
    type: [
      {
        type: {
        type: String, 
        required: true 
    },
        selected_option: {
          type: String,
          required: true
        }
      }
    ],
    required: true,
    default: []
  },
    tel: { 
        type: String, 
        required: true 
    },
    address: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['รอจัดส่ง', 'กำลังจัดส่ง', 'จัดส่งแล้ว', 'ยกเลิก'], 
        default: 'รอจัดส่ง' 
    },
    created_at: { 
      type: Date, 
      default: () => getThaiTime()
  }
});

merchandiseTransactionSchema.pre("validate", async function (next) {
    try {
      const userExists = await User.exists({ _id: this.user_id });
      
      if (!userExists) {
        const error = new Error(`No User with ID ${this.user_id}`);
        error.statusCode = 400; 
        return next(error);
      }
      
    const merchandiseExists = await Merchandise.exists({ _id: this.merch_id });
    
    if (!merchandiseExists) {
      const error = new Error(`No Merchandise with ID ${this.merch_id}`);
      error.statusCode = 400;
      return next(error);
    }

    const telRegex = /^\d{10}$/;
    if (!telRegex.test(this.tel)) {
      const error = new Error('Telephone number must be 10 digits');
      error.statusCode = 400;
      return next(error);
    }

    if (this.quantity <= 0) {
      const error = new Error('Quantity must be greater than 0');
      error.statusCode = 400;
      return next(error);
    }

    if (!this.address.trim()) {
      const error = new Error('Address cannot be empty');
      error.statusCode = 400;
      return next(error);
    }

      next();
    } catch (error) {
      next(error);
    }
});

module.exports = mongoose.model('MerchandiseTransaction', merchandiseTransactionSchema);