const mongoose = require('mongoose')

const Categorychema = new mongoose.Schema({
    category_name : {
        type : String,
        required : true
    }
})

module.exports = mongoose.model('Category', Categorychema)