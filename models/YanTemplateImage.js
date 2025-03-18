const mongoose = require('mongoose');
const Category = require('./Category');

const YanTemplateImageSchema = new mongoose.Schema({
  yan_template_image_set_id: { 
    type: Number, 
    required: true,   
  },
  yan_category: [{ 
    type : mongoose.Schema.Types.ObjectId,
    ref : 'Category',
    required: true
  }],
  yan_level: { 
    type: Number, 
    enum: [0,1,2,3], 
    required: true 
  },
  yan_image_base64: { 
    type: String ,
    required: true
  },
});

YanTemplateImageSchema.pre("validate", async function (next) {
  try {
      
    const existingCategoryCount = await Category.countDocuments({ _id: { $in: this.yan_category} });
    if (existingCategoryCount !== this.yan_category.length) {
      const error = new Error("One or more Category IDs do not exist.");
      error.statusCode = 400;
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('YanTemplateImage', YanTemplateImageSchema);