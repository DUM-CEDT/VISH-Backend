const mongoose = require('mongoose');

const merchandiseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
      },
    price: { 
        type: Number, 
        required: true 
    },
    image: { 
        type: String,
        required: true 
    },
    type: {
      type: String,
      enum: ['ยันต์', 'กำไล', 'แหวน', 'สร้อย', 'เบอร์มงคล', 'อื่นๆ'],
      required: true,
      default: 'อื่นๆ'
    },
    merch_props: {
        type: [
          {
            type: {
              type: String,
              required: true
            },
            options: {
              type: [String],
              required: true
            }
          }
        ],
        required: true,
        default: []
      },
    description: { 
        type: String, 
        required: true 
    }
});

module.exports = mongoose.model('Merchandise', merchandiseSchema);