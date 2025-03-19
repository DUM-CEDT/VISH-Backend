const mongoose = require('mongoose')

const CategorySchema = new mongoose.Schema({
    category_name: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true,
      },
})

module.exports = mongoose.model('Category', CategorySchema)
