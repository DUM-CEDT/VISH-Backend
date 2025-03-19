const mongoose = require('mongoose');

const YanSetNameSchema = new mongoose.Schema({
  yan_template_image_set_id: { 
    type: Number, 
    required: true,   
  },
  yan_set_name : {
    type : String,
    required : true
  }
});

module.exports = mongoose.model('YanSetName', YanSetNameSchema);