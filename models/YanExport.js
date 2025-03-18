const mongoose = require('mongoose');
const YanTemplate = require('./YanTemplate');
const User = require('./User');

const YanExportSchema = new mongoose.Schema({
  yan_template_id:{
    type : mongoose.Schema.ObjectId,
    ref : 'YanTemplate',
    required : true
  },
  user_id: [{
    type : mongoose.Schema.ObjectId,
    ref : 'User'
  }]
});

YanExportSchema.pre('validate', async function(next) {
    try {
      if (this.yan_template_id) {
        const template = await YanTemplate.findById(this.yan_template_id);
        if (!template) {
          return next(new Error('YanTemplate with this ID does not exist'));
        }
      }
  
      if (this.user_id && this.user_id.length > 0) {
        const userChecks = this.user_id.map(async (userId) => {
          const user = await User.findById(userId);
          if (!user) {
            throw new Error(`User with ID ${userId} does not exist`);
          }
        });
        
        await Promise.all(userChecks);
      }
  
      next();
    } catch (error) {
      next(error);
    }
  });

module.exports = mongoose.model('YanExport', YanExportSchema);